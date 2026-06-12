"""
Phase 2 — Threat Processing Pipeline.

Orchestrates:
  Collection → Normalization → Entity Extraction → CVE Detection →
  Cross-Source Validation → Duplicate Detection → Confidence Scoring →
  Risk Scoring → Database Persistence
"""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.adapters.base import NormalizedEvent
from app.models.threat import (
    EventEmbedding,
    ThreatEntity,
    ThreatEvent,
    ThreatRiskAssessment,
)
from app.services.confidence_scoring import ConfidenceScoringService
from app.services.duplicate_detection import DuplicateDetectionService
from app.services.entity_extraction import EntityExtractionService
from app.services.risk_assessment import RiskAssessmentService

logger = logging.getLogger(__name__)


class ThreatPipelineService:
    """Stateless pipeline — instantiate per request or per batch run."""

    def __init__(
        self,
        db: Session,
        openai_api_key: str = "",
        openai_model: str = "gpt-4o-mini",
        dedup_threshold: float = 0.92,
    ):
        self.db = db
        self.extractor = EntityExtractionService(openai_api_key, openai_model)
        self.deduplicator = DuplicateDetectionService(db, threshold=dedup_threshold)
        self.confidence_scorer = ConfidenceScoringService()
        self.risk_assessor = RiskAssessmentService(db)

    # ── Public ────────────────────────────────────────────────────────────────

    def process_batch(self, events: list[NormalizedEvent]) -> dict:
        """Process a list of normalised events. Returns summary statistics."""
        stats = {
            "total": len(events),
            "inserted": 0,
            "duplicates": 0,
            "errors": 0,
        }

        for event in events:
            try:
                result = self.process_one(event)
                if result == "duplicate":
                    stats["duplicates"] += 1
                elif result == "inserted":
                    stats["inserted"] += 1
            except Exception as exc:
                stats["errors"] += 1
                logger.error("Pipeline error for %s: %s", event.get("id"), exc, exc_info=True)

        return stats

    def process_one(self, event: NormalizedEvent) -> str:
        """
        Process a single NormalizedEvent through the full pipeline.
        Returns 'inserted', 'duplicate', or 'error'.
        """
        external_id = event.get("id", "")
        title = event.get("title", "")
        description = event.get("description", "")
        source_adapter = event.get("source", "")

        # ── Step 1: Duplicate detection (fast-path) ───────────────────────────
        dedup = self.deduplicator.check(external_id, title, description)
        if dedup.duplicate:
            logger.debug("Duplicate detected: %s (score=%.2f)", external_id, dedup.similarity_score)
            # Still record that this source also reported the event
            if dedup.matched_event_id:
                self._increment_velocity(dedup.matched_event_id)
            return "duplicate"

        # ── Step 2: Entity extraction ─────────────────────────────────────────
        raw_cves = event.get("cves", [])
        entities = self.extractor.extract(title, description, raw_cves)

        # ── Step 3: Confidence scoring ────────────────────────────────────────
        confidence = self.confidence_scorer.score(
            source_adapter=source_adapter,
            cves=entities.cves,
            title=title,
            description=description,
            raw_payload=event.get("raw_payload", {}),
        )

        # ── Step 4: Parse published_at ────────────────────────────────────────
        published_at: Optional[datetime] = None
        pub_str = event.get("published_at") or ""
        if pub_str:
            for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
                try:
                    published_at = datetime.strptime(pub_str[:19], fmt[:len(pub_str[:19])])
                    break
                except ValueError:
                    continue

        # ── Step 5: Persist ThreatEvent ───────────────────────────────────────
        threat = ThreatEvent(
            external_id=external_id,
            source_adapter=source_adapter,
            source_type=event.get("source_type", ""),
            title=title,
            description=description,
            url=event.get("url", ""),
            author=event.get("author") or None,
            published_at=published_at,
            status="verified",
            confidence_score=confidence.confidence_score,
            confidence_level=confidence.confidence_level,
            confidence_reasoning=confidence.reasoning,
            severity=event.get("severity"),
            raw_payload=event.get("raw_payload", {}),
        )
        self.db.add(threat)
        self.db.flush()  # get threat.id without full commit

        # ── Step 6: Persist entities ──────────────────────────────────────────
        entity_seen: set[tuple] = set()
        for cve in entities.cves:
            key = ("cve", cve.upper())
            if key not in entity_seen:
                self.db.add(ThreatEntity(event_id=threat.id, entity_type="cve", value=cve.upper()))
                entity_seen.add(key)

        for vendor in entities.vendors:
            key = ("vendor", vendor.lower())
            if key not in entity_seen:
                self.db.add(ThreatEntity(event_id=threat.id, entity_type="vendor", value=vendor))
                entity_seen.add(key)

        for product in entities.products:
            key = ("product", product.lower())
            if key not in entity_seen:
                self.db.add(ThreatEntity(event_id=threat.id, entity_type="product", value=product))
                entity_seen.add(key)

        for vt in entities.vulnerability_types:
            key = ("vulnerability_type", vt)
            if key not in entity_seen:
                self.db.add(ThreatEntity(event_id=threat.id, entity_type="vulnerability_type", value=vt))
                entity_seen.add(key)

        for indicator in entities.threat_indicators[:10]:
            key = ("threat_indicator", indicator.lower())
            if key not in entity_seen:
                self.db.add(ThreatEntity(event_id=threat.id, entity_type="threat_indicator", value=indicator))
                entity_seen.add(key)

        # ── Step 7: Risk assessment ───────────────────────────────────────────
        self.db.flush()
        risk = self.risk_assessor.assess(threat, entities.cves)

        risk_record = ThreatRiskAssessment(
            event_id=threat.id,
            risk_score=risk.risk_score,
            severity=risk.severity,
            cvss_score=risk.cvss_score,
            exploit_available=risk.exploit_available,
            public_poc=risk.public_poc,
            vendor_confirmed=risk.vendor_confirmed,
            mention_velocity=risk.mention_velocity,
            reasons=risk.reasons,
        )
        self.db.add(risk_record)

        # Update threat with final risk fields
        threat.risk_score = risk.risk_score
        threat.severity = risk.severity

        self.db.commit()
        self.db.refresh(threat)

        # ── Step 8: Store embedding (async-safe: runs after commit) ───────────
        try:
            self.deduplicator.store_embedding(threat.id, title, description)
        except Exception as exc:
            logger.debug("Embedding storage failed (non-fatal): %s", exc)

        logger.info(
            "Pipeline: inserted threat %d [%s] score=%d level=%s risk=%d",
            threat.id, external_id, confidence.confidence_score,
            confidence.confidence_level, risk.risk_score,
        )
        return "inserted"

    # ── Private ───────────────────────────────────────────────────────────────

    def _increment_velocity(self, event_id: int) -> None:
        """Bump mention_velocity on the canonical event."""
        ra = (
            self.db.query(ThreatRiskAssessment)
            .filter(ThreatRiskAssessment.event_id == event_id)
            .first()
        )
        if ra:
            ra.mention_velocity = (ra.mention_velocity or 0) + 1
            self.db.commit()
