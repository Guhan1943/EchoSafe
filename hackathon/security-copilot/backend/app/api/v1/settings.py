import logging
from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.core.exceptions import NotFoundException
from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.repositories.settings import SettingsRepository
from app.schemas.settings import SettingResponse, SettingUpdate

logger = logging.getLogger(__name__)

router = APIRouter()


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
        resource_type="setting",
        resource_id=resource_id,
        details=details or {},
        ip_address=ip_address,
    )
    db.add(audit)
    db.commit()


@router.get("/", response_model=list[SettingResponse])
def list_settings(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[SettingResponse]:
    """List all application settings (admin only)."""
    repo = SettingsRepository(db)
    settings = repo.get_all_settings()
    return [SettingResponse.model_validate(s) for s in settings]


@router.put("/{key}", response_model=SettingResponse)
def update_setting(
    key: str,
    body: SettingUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> SettingResponse:
    """Update a setting by key (admin only). Creates if not exists."""
    repo = SettingsRepository(db)
    existing = repo.get_by_key(key)

    setting = repo.upsert(key=key, value=body.value)
    action = "setting_created" if existing is None else "setting_updated"

    ip_address = request.client.host if request.client else None
    _log_audit(
        db, admin.id, action, setting.id,
        {"key": key, "updated_by": admin.id},
        ip_address,
    )

    return SettingResponse.model_validate(setting)
