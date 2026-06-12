from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.threat import ThreatEntity, ThreatEvent, ThreatRiskAssessment
from app.repositories.base import BaseRepository


class ThreatEventRepository(BaseRepository[ThreatEvent]):
    def __init__(self, db: Session) -> None:
        super().__init__(ThreatEvent, db)

    def get_filtered(
        self,
        *,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        source_adapter: Optional[str] = None,
        confidence_level: Optional[str] = None,
        is_duplicate: Optional[bool] = False,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[ThreatEvent], int]:
        stmt = select(ThreatEvent)
        count_stmt = select(func.count()).select_from(ThreatEvent)
        filters = []

        if status:
            filters.append(ThreatEvent.status == status)
        if severity:
            filters.append(ThreatEvent.severity == severity)
        if source_adapter:
            filters.append(ThreatEvent.source_adapter == source_adapter)
        if confidence_level:
            filters.append(ThreatEvent.confidence_level == confidence_level)
        if is_duplicate is not None:
            filters.append(ThreatEvent.is_duplicate == is_duplicate)
        if search:
            pat = f"%{search}%"
            filters.append(
                or_(ThreatEvent.title.ilike(pat), ThreatEvent.description.ilike(pat))
            )

        for f in filters:
            stmt = stmt.where(f)
            count_stmt = count_stmt.where(f)

        total = self.db.execute(count_stmt).scalar_one()
        items = list(
            self.db.execute(
                stmt.order_by(ThreatEvent.collected_at.desc()).offset(skip).limit(limit)
            )
            .scalars()
            .all()
        )
        return items, total

    def get_high_risk(self, min_risk: int = 50, limit: int = 20) -> list[ThreatEvent]:
        stmt = (
            select(ThreatEvent)
            .where(ThreatEvent.risk_score >= min_risk, ThreatEvent.is_duplicate == False)  # noqa: E712
            .order_by(ThreatEvent.risk_score.desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())

    def get_trending(self, hours: int = 24, limit: int = 20) -> list[ThreatEvent]:
        """Events with highest mention_velocity in the last N hours."""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        stmt = (
            select(ThreatEvent)
            .join(ThreatRiskAssessment, ThreatEvent.id == ThreatRiskAssessment.event_id)
            .where(
                ThreatEvent.collected_at >= cutoff,
                ThreatEvent.is_duplicate == False,  # noqa: E712
            )
            .order_by(ThreatRiskAssessment.mention_velocity.desc(), ThreatEvent.risk_score.desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())

    def search_by_cve(self, cve_id: str) -> list[ThreatEvent]:
        stmt = (
            select(ThreatEvent)
            .join(ThreatEntity, ThreatEvent.id == ThreatEntity.event_id)
            .where(
                ThreatEntity.entity_type == "cve",
                ThreatEntity.value == cve_id.upper(),
            )
            .order_by(ThreatEvent.collected_at.desc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def get_stats(self) -> dict:
        total = self.db.execute(select(func.count()).select_from(ThreatEvent)).scalar_one()
        by_severity = dict(
            self.db.execute(
                select(ThreatEvent.severity, func.count(ThreatEvent.id))
                .where(ThreatEvent.severity.isnot(None))
                .group_by(ThreatEvent.severity)
            ).all()
        )
        by_source = dict(
            self.db.execute(
                select(ThreatEvent.source_adapter, func.count(ThreatEvent.id))
                .group_by(ThreatEvent.source_adapter)
            ).all()
        )
        by_confidence = dict(
            self.db.execute(
                select(ThreatEvent.confidence_level, func.count(ThreatEvent.id))
                .group_by(ThreatEvent.confidence_level)
            ).all()
        )
        duplicates = self.db.execute(
            select(func.count()).select_from(ThreatEvent).where(ThreatEvent.is_duplicate == True)  # noqa: E712
        ).scalar_one()
        return {
            "total": total,
            "duplicates": duplicates,
            "by_severity": by_severity,
            "by_source": by_source,
            "by_confidence": by_confidence,
        }
