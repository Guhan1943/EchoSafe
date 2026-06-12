"""Find related coverage from major vendor security blogs."""

from __future__ import annotations

import html
import logging
import re
from dataclasses import dataclass
from datetime import datetime
from difflib import SequenceMatcher
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.article import Article
from app.services.collection import CollectionService

logger = logging.getLogger(__name__)

CVE_PATTERN = re.compile(r"CVE-\d{4}-\d+", re.IGNORECASE)
TAG_PATTERN = re.compile(r"<[^>]+>")

STOP_WORDS = {
    "about", "after", "also", "been", "from", "have", "into", "more", "news",
    "that", "the", "their", "this", "through", "using", "what", "when", "which",
    "with", "your", "will", "would", "could", "should", "than", "then", "they",
    "them", "these", "those", "such", "over", "under", "into", "across", "against",
    "between", "during", "before", "after", "above", "below", "while", "where",
    "were", "was", "are", "has", "had", "not", "but", "for", "and", "new", "how",
    "why", "can", "may", "its", "our", "all", "any", "each", "other", "some",
}

VENDOR_COMPARE_SOURCES: list[dict[str, str]] = [
    {
        "id": "crowdstrike",
        "name": "CrowdStrike",
        "site": "crowdstrike.com/blog",
        "feed_url": "https://www.crowdstrike.com/blog/feed/",
        "tagline": "Cybersecurity Blog | CrowdStrike",
        "description": (
            "The #1 blog in cybersecurity. Industry news, insights from cybersecurity "
            "experts, and new product, feature, and company announcements."
        ),
    },
    {
        "id": "sentinelone",
        "name": "SentinelOne",
        "site": "sentinelone.com/blog",
        "feed_url": "https://www.sentinelone.com/feed/",
        "tagline": "Security Blog",
        "description": "Threat research, malware analysis, and security operations insights.",
    },
    {
        "id": "microsoft",
        "name": "Microsoft",
        "site": "microsoft.com/security/blog",
        "feed_url": "https://www.microsoft.com/en-us/security/blog/feed/",
        "tagline": "Microsoft Security Blog",
        "description": "Microsoft security research, threat intelligence, and product guidance.",
    },
]


@dataclass
class RelatedEntry:
    title: str
    url: str
    summary: str
    published_at: Optional[datetime]
    relevance_score: int
    matched_terms: list[str]


class SourceComparisonService:
    def __init__(self, db: Session):
        self.db = db
        self.collector = CollectionService(db)
        self._feed_cache: dict[str, tuple[float, list[dict]]] = {}

    def compare_article(self, article_id: int) -> dict[str, Any]:
        article = self.db.query(Article).filter(Article.id == article_id).first()
        if article is None:
            raise ValueError(f"Article {article_id} not found")

        article_text = self._article_text(article)
        article_cves = self._extract_cves(article_text)
        article_keywords = self._keywords(article_text)

        results = []
        for source in VENDOR_COMPARE_SOURCES:
            entries = self.collector.fetch_rss(source["feed_url"])
            best = self._best_related_entry(
                article=article,
                entries=entries,
                article_cves=article_cves,
                article_keywords=article_keywords,
            )
            results.append(
                {
                    "source_id": source["id"],
                    "name": source["name"],
                    "site": source["site"],
                    "tagline": source["tagline"],
                    "description": source["description"],
                    "feed_url": source["feed_url"],
                    "related": self._entry_to_dict(best) if best else None,
                }
            )

        return {
            "article_id": article.id,
            "article_title": article.title,
            "sources": results,
        }

    def _best_related_entry(
        self,
        *,
        article: Article,
        entries: list[dict],
        article_cves: set[str],
        article_keywords: set[str],
    ) -> Optional[RelatedEntry]:
        scored: list[RelatedEntry] = []

        for entry in entries:
            title = entry.get("title") or ""
            url = entry.get("url") or ""
            if not title or not url:
                continue

            if url.rstrip("/") == article.url.rstrip("/"):
                continue

            entry_text = " ".join(
                filter(
                    None,
                    [title, entry.get("summary"), entry.get("content")],
                )
            )
            entry_cves = self._extract_cves(entry_text)
            entry_keywords = self._keywords(entry_text)

            title_sim = SequenceMatcher(
                None,
                self._normalize(title),
                self._normalize(article.title),
            ).ratio()

            if title_sim >= 0.88:
                continue

            cve_overlap = article_cves & entry_cves
            keyword_overlap = sorted(article_keywords & entry_keywords)

            score = 0
            score += len(cve_overlap) * 40
            score += len(keyword_overlap) * 12

            for term in keyword_overlap:
                if len(term) >= 8:
                    score += 8

            if title_sim >= 0.65:
                score -= 30
            elif title_sim >= 0.45:
                score -= 10

            if score <= 0:
                continue

            scored.append(
                RelatedEntry(
                    title=title,
                    url=url,
                    summary=self._clean_summary(entry.get("summary") or entry.get("content") or ""),
                    published_at=entry.get("published_at"),
                    relevance_score=score,
                    matched_terms=list(cve_overlap) + keyword_overlap[:8],
                )
            )

        if not scored:
            return self._fallback_entry(entries, article)

        scored.sort(key=lambda item: item.relevance_score, reverse=True)
        return scored[0]

    def _fallback_entry(
        self, entries: list[dict], article: Article
    ) -> Optional[RelatedEntry]:
        """Return latest feed item when no topical match (still not the same URL)."""
        for entry in entries:
            url = entry.get("url") or ""
            title = entry.get("title") or ""
            if not url or not title:
                continue
            if url.rstrip("/") == article.url.rstrip("/"):
                continue
            return RelatedEntry(
                title=title,
                url=url,
                summary=self._clean_summary(entry.get("summary") or entry.get("content") or ""),
                published_at=entry.get("published_at"),
                relevance_score=0,
                matched_terms=[],
            )
        return None

    @staticmethod
    def _entry_to_dict(entry: RelatedEntry) -> dict[str, Any]:
        return {
            "title": entry.title,
            "url": entry.url,
            "summary": entry.summary,
            "published_at": entry.published_at.isoformat() if entry.published_at else None,
            "relevance_score": entry.relevance_score,
            "matched_terms": entry.matched_terms,
            "is_topical_match": entry.relevance_score > 0,
        }

    @staticmethod
    def _article_text(article: Article) -> str:
        parts = [article.title or "", article.summary or "", article.content or ""]
        if article.verification_result:
            vr = article.verification_result
            parts.extend(
                [
                    vr.ai_analysis or "",
                    vr.business_impact or "",
                    " ".join(vr.cve_references or []),
                ]
            )
        return " ".join(parts)

    @staticmethod
    def _extract_cves(text: str) -> set[str]:
        return {match.upper() for match in CVE_PATTERN.findall(text or "")}

    @staticmethod
    def _keywords(text: str) -> set[str]:
        plain = TAG_PATTERN.sub(" ", html.unescape(text or ""))
        plain = re.sub(r"[^a-zA-Z0-9\-#]+", " ", plain.lower())
        tokens = {
            token.strip("-#")
            for token in plain.split()
            if len(token) >= 4 and token not in STOP_WORDS and not token.isdigit()
        }
        return {token for token in tokens if len(token) >= 4}

    @staticmethod
    def _normalize(text: str) -> str:
        return re.sub(r"\s+", " ", (text or "").lower()).strip()

    @staticmethod
    def _clean_summary(text: str, limit: int = 320) -> str:
        plain = TAG_PATTERN.sub(" ", html.unescape(text or ""))
        plain = re.sub(r"\s+", " ", plain).strip()
        if len(plain) <= limit:
            return plain
        return plain[: limit - 3].rstrip() + "..."
