import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_admin
from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.repositories.source import SourceRepository
from app.services.collection import CollectionService

logger = logging.getLogger(__name__)

router = APIRouter()


def _run_collect_all(user_id: Optional[int]) -> None:
    """Background task: collect from all active sources."""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        service = CollectionService(db)
        result = service.collect_all_active()

        audit = AuditLog(
            user_id=user_id,
            action="collect_all",
            resource_type="collector",
            details={
                "sources_processed": result.get("sources_processed", 0),
                "total_collected": result.get("total_collected", 0),
            },
        )
        db.add(audit)
        db.commit()

        logger.info(
            "collect-all complete: %s sources processed, %s articles collected",
            result.get("sources_processed", 0),
            result.get("total_collected", 0),
        )
    except Exception as exc:
        logger.error("collect-all background task failed: %s", exc)
        db.rollback()
    finally:
        db.close()


@router.post("/collect-all")
def collect_all(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    """Trigger collection from all active sources (admin only). Runs asynchronously."""
    repo = SourceRepository(db)
    active_sources = repo.get_active_sources()
    sources_count = len(active_sources)

    background_tasks.add_task(_run_collect_all, admin.id)

    return {
        "message": f"Collection started for {sources_count} active source(s)",
        "sources_processed": sources_count,
    }


@router.get("/status")
def get_collector_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Get polling status for all active sources."""
    repo = SourceRepository(db)
    sources = repo.get_active_sources()

    result = []
    for source in sources:
        next_poll = None
        if source.last_polled_at is not None:
            next_poll = source.last_polled_at + timedelta(
                minutes=source.polling_interval_minutes
            )
        elif source.polling_interval_minutes:
            # Never polled yet — next poll is now
            next_poll = datetime.utcnow()

        result.append(
            {
                "id": source.id,
                "name": source.name,
                "last_polled": source.last_polled_at,
                "next_poll": next_poll,
            }
        )

    return {"sources": result}
