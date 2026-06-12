import logging
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.database import get_db
from app.models.user import User
from app.repositories.audit import AuditRepository
from app.schemas.audit import AuditLogListResponse, AuditLogResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=AuditLogListResponse)
def list_audit_logs(
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AuditLogListResponse:
    """List audit logs with optional filters (admin only)."""
    repo = AuditRepository(db)
    items, total = repo.get_filtered(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        skip=skip,
        limit=limit,
    )
    return AuditLogListResponse(
        items=[AuditLogResponse.model_validate(log) for log in items],
        total=total,
    )
