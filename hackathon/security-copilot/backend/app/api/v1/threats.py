import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user
from app.core.exceptions import NotFoundException
from app.database import get_db
from app.models.user import User
from app.repositories.threat import ThreatEventRepository
from app.schemas.threat import (
    ThreatEventDetailResponse,
    ThreatEventListResponse,
    ThreatEventResponse,
)
from app.services.duplicate_detection import DuplicateDetectionService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=ThreatEventListResponse)
def list_threats(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    source_adapter: Optional[str] = Query(None),
    confidence_level: Optional[str] = Query(None),
    is_duplicate: bool = Query(False),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ThreatEventListResponse:
    """List threat events with optional filters."""
    repo = ThreatEventRepository(db)
    items, total = repo.get_filtered(
        status=status,
        severity=severity,
        source_adapter=source_adapter,
        confidence_level=confidence_level,
        is_duplicate=is_duplicate,
        search=search,
        skip=skip,
        limit=limit,
    )
    return ThreatEventListResponse(
        items=[ThreatEventResponse.model_validate(e) for e in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/high-risk", response_model=list[ThreatEventResponse])
def get_high_risk(
    min_risk: int = Query(50, ge=0, le=100),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[ThreatEventResponse]:
    """Return highest-risk threat events."""
    repo = ThreatEventRepository(db)
    items = repo.get_high_risk(min_risk=min_risk, limit=limit)
    return [ThreatEventResponse.model_validate(e) for e in items]


@router.get("/trending", response_model=list[ThreatEventResponse])
def get_trending(
    hours: int = Query(24, ge=1, le=168),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[ThreatEventResponse]:
    """Return trending threats (highest mention velocity in the last N hours)."""
    repo = ThreatEventRepository(db)
    items = repo.get_trending(hours=hours, limit=limit)
    return [ThreatEventResponse.model_validate(e) for e in items]


@router.get("/search", response_model=ThreatEventListResponse)
def search_threats(
    q: str = Query(..., min_length=2),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ThreatEventListResponse:
    """Full-text search across threat titles and descriptions."""
    repo = ThreatEventRepository(db)
    items, total = repo.get_filtered(search=q, skip=skip, limit=limit)
    return ThreatEventListResponse(
        items=[ThreatEventResponse.model_validate(e) for e in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/stats")
def get_threat_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Return aggregate statistics for the threat intelligence store."""
    return ThreatEventRepository(db).get_stats()


@router.get("/{threat_id}", response_model=ThreatEventDetailResponse)
def get_threat(
    threat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ThreatEventDetailResponse:
    """Get full threat event detail including entities and risk assessment."""
    repo = ThreatEventRepository(db)
    event = repo.get(threat_id)
    if event is None:
        raise NotFoundException(detail=f"Threat event {threat_id} not found")

    from app.schemas.threat import ThreatEntityResponse  # local import to avoid circular

    detail = ThreatEventDetailResponse.model_validate(event)
    detail.entities = [ThreatEntityResponse.model_validate(e) for e in event.entities]

    # Fetch related events via embedding similarity
    try:
        dedup = DuplicateDetectionService(db)
        detail.related_events = dedup.get_related(threat_id, top_k=5)
    except Exception:
        detail.related_events = []

    return detail
