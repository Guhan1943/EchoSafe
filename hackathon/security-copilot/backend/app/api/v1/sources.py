import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_admin, require_analyst
from app.core.exceptions import NotFoundException
from app.database import get_db
from app.models.audit import AuditLog
from app.models.source import Source
from app.models.user import User
from app.repositories.source import SourceRepository
from app.schemas.source import SourceCreate, SourceResponse, SourceUpdate
from app.services.collection import CollectionService

logger = logging.getLogger(__name__)

router = APIRouter()


def _source_to_response(source: Source) -> SourceResponse:
    return SourceResponse.model_validate(source)


def _log_audit(
    db: Session,
    user_id: Optional[int],
    action: str,
    resource_id: Optional[int],
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> None:
    audit = AuditLog(
        user_id=user_id,
        action=action,
        resource_type="source",
        resource_id=resource_id,
        details=details or {},
        ip_address=ip_address,
    )
    db.add(audit)
    db.commit()


@router.get("/", response_model=list[SourceResponse])
def list_sources(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[SourceResponse]:
    """List all sources, optionally filtered by active status."""
    repo = SourceRepository(db)
    if is_active is True:
        sources = repo.get_active_sources()
    elif is_active is False:
        from sqlalchemy import select
        stmt = select(Source).where(Source.is_active == False)  # noqa: E712
        sources = list(db.execute(stmt).scalars().all())
    else:
        sources = repo.get_all()
    return [_source_to_response(s) for s in sources]


@router.post("/", response_model=SourceResponse, status_code=201)
def create_source(
    body: SourceCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SourceResponse:
    """Create a new source (admin only)."""
    repo = SourceRepository(db)
    data = body.model_dump()
    # Pydantic v2 HttpUrl serializes as AnyUrl object; convert to string
    data["url"] = str(data["url"])
    source = repo.create(data)

    ip_address = request.client.host if request.client else None
    _log_audit(
        db, admin.id, "source_created", source.id,
        {"name": source.name, "url": source.url}, ip_address,
    )

    return _source_to_response(source)


@router.get("/{source_id}", response_model=SourceResponse)
def get_source(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> SourceResponse:
    """Get source by ID."""
    repo = SourceRepository(db)
    source = repo.get(source_id)
    if source is None:
        raise NotFoundException(detail=f"Source {source_id} not found")
    return _source_to_response(source)


@router.put("/{source_id}", response_model=SourceResponse)
def update_source(
    source_id: int,
    body: SourceUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SourceResponse:
    """Update source by ID (admin only)."""
    repo = SourceRepository(db)
    source = repo.get(source_id)
    if source is None:
        raise NotFoundException(detail=f"Source {source_id} not found")

    data = body.model_dump(exclude_unset=True)
    if "url" in data and data["url"] is not None:
        data["url"] = str(data["url"])

    updated = repo.update(source, data)

    ip_address = request.client.host if request.client else None
    _log_audit(
        db, admin.id, "source_updated", source_id,
        {"fields": data, "updated_by": admin.id}, ip_address,
    )

    return _source_to_response(updated)


@router.delete("/{source_id}")
def delete_source(
    source_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    """Delete source by ID (admin only)."""
    repo = SourceRepository(db)
    source = repo.get(source_id)
    if source is None:
        raise NotFoundException(detail=f"Source {source_id} not found")

    repo.delete(source_id)

    ip_address = request.client.host if request.client else None
    _log_audit(
        db, admin.id, "source_deleted", source_id,
        {"deleted_by": admin.id}, ip_address,
    )

    return {"message": f"Source {source_id} deleted successfully"}


def _run_collection(source_id: int, user_id: int) -> None:
    """Background task: collect articles from a source."""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        service = CollectionService(db)
        result = service.collect_from_source(source_id)
        audit = AuditLog(
            user_id=user_id,
            action="source_collect",
            resource_type="source",
            resource_id=source_id,
            details={
                "collected": result.get("collected", 0),
                "errors": result.get("errors", 0),
            },
        )
        db.add(audit)
        db.commit()
        logger.info(
            "Collection from source %s complete: %s collected, %s errors",
            source_id, result.get("collected", 0), result.get("errors", 0),
        )
    except Exception as exc:
        logger.error("Collection background task failed for source %s: %s", source_id, exc)
        db.rollback()
    finally:
        db.close()


@router.post("/{source_id}/collect", status_code=202)
def collect_source(
    source_id: int,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
    analyst: User = Depends(require_analyst),
) -> dict:
    """Trigger article collection from a source (analyst/admin). Runs asynchronously."""
    repo = SourceRepository(db)
    source = repo.get(source_id)
    if source is None:
        raise NotFoundException(detail=f"Source {source_id} not found")

    if not source.is_active:
        from app.core.exceptions import BadRequestException
        raise BadRequestException(detail="Source is not active")

    background_tasks.add_task(_run_collection, source_id, analyst.id)

    return {
        "message": f"Collection started for source '{source.name}'",
        "collected": 0,
        "errors": 0,
    }
