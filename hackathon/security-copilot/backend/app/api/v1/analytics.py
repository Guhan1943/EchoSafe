import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user
from app.database import get_db
from app.models.user import User
from app.schemas.analytics import (
    ArticlesBySeverity,
    ArticlesByStatus,
    OverviewResponse,
    SourceStatsResponse,
    TrustScoreDistributionResponse,
    TrustScoreRange,
)
from app.services.analytics import AnalyticsService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/overview", response_model=OverviewResponse)
def get_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> OverviewResponse:
    """Get analytics overview statistics."""
    service = AnalyticsService(db)
    data = service.get_overview()

    # Build nested severity/status objects from raw dicts
    by_severity_raw = data.get("articles_by_severity", {})
    articles_by_severity = ArticlesBySeverity(
        critical=by_severity_raw.get("critical", 0),
        high=by_severity_raw.get("high", 0),
        medium=by_severity_raw.get("medium", 0),
        low=by_severity_raw.get("low", 0),
        info=by_severity_raw.get("info", 0),
    )

    by_status_raw = data.get("articles_by_status", {})
    articles_by_status = ArticlesByStatus(
        new=by_status_raw.get("new", 0),
        ai_verified=by_status_raw.get("ai_verified", 0),
        pending_manual_review=by_status_raw.get("pending_manual_review", 0),
        approved=by_status_raw.get("approved", 0),
        published=by_status_raw.get("published", 0),
        rejected=by_status_raw.get("rejected", 0),
        under_review=by_status_raw.get("under_review", 0),
    )

    return OverviewResponse(
        total_articles=data["total_articles"],
        verified_count=data["verified_count"],
        approved_count=data["approved_count"],
        published_count=data["published_count"],
        avg_trust_score=data["avg_trust_score"],
        verification_success_rate=data["verification_success_rate"],
        articles_by_severity=articles_by_severity,
        articles_by_status=articles_by_status,
    )


@router.get("/sources", response_model=list[SourceStatsResponse])
def get_source_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[SourceStatsResponse]:
    """Get per-source analytics statistics."""
    service = AnalyticsService(db)
    rows = service.get_source_stats()
    return [SourceStatsResponse(**row) for row in rows]


@router.get("/trust-scores", response_model=TrustScoreDistributionResponse)
def get_trust_score_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> TrustScoreDistributionResponse:
    """Get trust score distribution across all articles."""
    service = AnalyticsService(db)
    data = service.get_trust_score_distribution()

    distribution = [
        TrustScoreRange(range=item["range"], count=item["count"])
        for item in data["distribution"]
    ]

    return TrustScoreDistributionResponse(
        distribution=distribution,
        avg=data["avg"],
        min=data["min"],
        max=data["max"],
    )
