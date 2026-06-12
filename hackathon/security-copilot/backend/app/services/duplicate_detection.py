"""
Phase 4 — Semantic Duplicate Detection.

Strategy (graceful degradation):
  1. sentence-transformers (bge-small-en-v1.5) — best quality
  2. sklearn TF-IDF cosine similarity — good quality, no model download
  3. exact external_id match — always runs as a pre-check

Embeddings are stored as JSON float arrays in EventEmbedding table.
Similarity threshold: 0.92 (configurable).
"""

import logging
import math
from typing import Optional

from sqlalchemy.orm import Session

from app.models.threat import EventEmbedding, ThreatEvent

logger = logging.getLogger(__name__)

DEFAULT_THRESHOLD = 0.92
MODEL_NAME = "bge-small-en-v1.5"


# ── Vector math ───────────────────────────────────────────────────────────────

def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(y * y for y in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


# ── Embedding backends ────────────────────────────────────────────────────────

_sentence_model = None
_sentence_model_tried = False


def _get_sentence_model():
    global _sentence_model, _sentence_model_tried
    if _sentence_model_tried:
        return _sentence_model
    _sentence_model_tried = True
    try:
        from sentence_transformers import SentenceTransformer  # type: ignore
        _sentence_model = SentenceTransformer(MODEL_NAME)
        logger.info("DuplicateDetection: loaded sentence-transformers model %s", MODEL_NAME)
    except Exception as exc:
        logger.info("DuplicateDetection: sentence-transformers unavailable (%s), using TF-IDF", exc)
        _sentence_model = None
    return _sentence_model


def _embed_sentence_transformers(text: str) -> Optional[list[float]]:
    model = _get_sentence_model()
    if model is None:
        return None
    vec = model.encode(text, normalize_embeddings=True)
    return vec.tolist()


def _embed_tfidf(text: str, corpus: list[str]) -> tuple[list[float], list[list[float]]]:
    """
    Compute TF-IDF embedding for `text` and `corpus` together.
    Returns (text_vector, corpus_vectors).
    """
    from sklearn.feature_extraction.text import TfidfVectorizer  # type: ignore

    all_texts = [text] + corpus
    try:
        vec = TfidfVectorizer(max_features=512, sublinear_tf=True)
        matrix = vec.fit_transform(all_texts)
        dense = matrix.toarray()
        return dense[0].tolist(), [row.tolist() for row in dense[1:]]
    except Exception:
        return [], []


def _embed_text(text: str) -> Optional[list[float]]:
    """Get embedding for a single text (sentence-transformers preferred)."""
    emb = _embed_sentence_transformers(text)
    return emb  # may be None if ST unavailable


# ── Dedup result ──────────────────────────────────────────────────────────────

class DuplicateResult:
    def __init__(
        self,
        duplicate: bool,
        similarity_score: float,
        related_events: list[int],
        matched_event_id: Optional[int] = None,
    ):
        self.duplicate = duplicate
        self.similarity_score = similarity_score
        self.related_events = related_events
        self.matched_event_id = matched_event_id

    def to_dict(self) -> dict:
        return {
            "duplicate": self.duplicate,
            "similarity_score": round(self.similarity_score, 4),
            "related_events": self.related_events,
            "matched_event_id": self.matched_event_id,
        }


# ── Service ───────────────────────────────────────────────────────────────────

class DuplicateDetectionService:
    def __init__(self, db: Session, threshold: float = DEFAULT_THRESHOLD):
        self.db = db
        self.threshold = threshold

    def check(self, external_id: str, title: str, description: str) -> DuplicateResult:
        """
        Check if a threat event is a duplicate of existing stored events.
        Returns a DuplicateResult with similarity info.
        """
        # Fast path: exact external_id match
        existing = (
            self.db.query(ThreatEvent)
            .filter(ThreatEvent.external_id == external_id)
            .first()
        )
        if existing:
            return DuplicateResult(
                duplicate=True,
                similarity_score=1.0,
                related_events=[existing.id],
                matched_event_id=existing.id,
            )

        text = f"{title} {description}"

        # Try semantic embedding comparison
        new_emb = _embed_text(text)
        if new_emb is not None:
            return self._semantic_check(new_emb, text)

        # Fallback: TF-IDF against recent 200 events
        return self._tfidf_check(text)

    def store_embedding(self, event_id: int, title: str, description: str) -> None:
        """Compute and persist embedding for a newly stored ThreatEvent."""
        text = f"{title} {description}"
        emb = _embed_text(text)
        if emb is None:
            return

        existing = self.db.query(EventEmbedding).filter(EventEmbedding.event_id == event_id).first()
        if existing:
            existing.embedding = emb
        else:
            record = EventEmbedding(
                event_id=event_id,
                model_name=MODEL_NAME if _get_sentence_model() else "tfidf",
                embedding=emb,
            )
            self.db.add(record)
        self.db.commit()

    def get_related(self, event_id: int, top_k: int = 5) -> list[dict]:
        """Return up to top_k semantically related events."""
        target_emb_record = (
            self.db.query(EventEmbedding)
            .filter(EventEmbedding.event_id == event_id)
            .first()
        )
        if not target_emb_record or not target_emb_record.embedding:
            return []

        target_vec = target_emb_record.embedding
        all_embs = (
            self.db.query(EventEmbedding)
            .filter(EventEmbedding.event_id != event_id)
            .all()
        )

        scored = []
        for emb_record in all_embs:
            if emb_record.embedding:
                score = _cosine_similarity(target_vec, emb_record.embedding)
                if score >= 0.6:  # lower threshold for "related"
                    scored.append((emb_record.event_id, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return [{"event_id": eid, "similarity": round(s, 4)} for eid, s in scored[:top_k]]

    # ── Private ───────────────────────────────────────────────────────────────

    def _semantic_check(self, new_emb: list[float], text: str) -> DuplicateResult:
        all_embs = self.db.query(EventEmbedding).all()
        best_score = 0.0
        best_id: Optional[int] = None
        related: list[int] = []

        for record in all_embs:
            if not record.embedding:
                continue
            score = _cosine_similarity(new_emb, record.embedding)
            if score >= 0.6:
                related.append(record.event_id)
            if score > best_score:
                best_score = score
                best_id = record.event_id

        is_dup = best_score >= self.threshold
        return DuplicateResult(
            duplicate=is_dup,
            similarity_score=best_score,
            related_events=related[:10],
            matched_event_id=best_id if is_dup else None,
        )

    def _tfidf_check(self, text: str) -> DuplicateResult:
        recent_events = (
            self.db.query(ThreatEvent)
            .filter(ThreatEvent.is_duplicate == False)  # noqa: E712
            .order_by(ThreatEvent.collected_at.desc())
            .limit(200)
            .all()
        )
        if not recent_events:
            return DuplicateResult(False, 0.0, [])

        corpus_texts = [f"{e.title} {e.description or ''}" for e in recent_events]
        new_vec, corpus_vecs = _embed_tfidf(text, corpus_texts)

        if not new_vec:
            return DuplicateResult(False, 0.0, [])

        best_score = 0.0
        best_id: Optional[int] = None
        related: list[int] = []

        for event, corp_vec in zip(recent_events, corpus_vecs):
            score = _cosine_similarity(new_vec, corp_vec)
            if score >= 0.6:
                related.append(event.id)
            if score > best_score:
                best_score = score
                best_id = event.id

        is_dup = best_score >= self.threshold
        return DuplicateResult(
            duplicate=is_dup,
            similarity_score=best_score,
            related_events=related[:10],
            matched_event_id=best_id if is_dup else None,
        )
