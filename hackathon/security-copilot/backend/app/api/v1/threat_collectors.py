import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_analyst
from app.database import get_db
from app.models.user import User
from app.schemas.threat import CollectorRunRequest, CollectorRunResponse
from app.services.threat_collection import ThreatCollectionService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/run", response_model=CollectorRunResponse)
def run_collectors(
    body: CollectorRunRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    analyst: User = Depends(require_analyst),
) -> CollectorRunResponse:
    """
    Trigger a CTI collection run (analyst/admin only).
    Runs synchronously for now; background option available via BackgroundTasks.
    """
    service = ThreatCollectionService(db)
    result = service.collect_all(adapter_names=body.adapters)
    return CollectorRunResponse(**result)


@router.get("/health")
def collector_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[dict]:
    """Return health status for all source adapters."""
    import asyncio
    service = ThreatCollectionService(db)
    return asyncio.run(service.health_check_all())


@router.get("/adapters")
def list_adapters(
    current_user: User = Depends(get_current_active_user),
) -> list[dict]:
    """List all registered CTI source adapters."""
    from app.services.threat_collection import ACTIVE_ADAPTERS
    return [
        {
            "name": cls.adapter_name,
            "source_type": cls.source_type,
            "page_size": cls.page_size,
        }
        for cls in ACTIVE_ADAPTERS
    ]
