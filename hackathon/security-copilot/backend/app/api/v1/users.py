import logging
from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.core.exceptions import ConflictException, NotFoundException
from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.auth import AuthService

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
        resource_type="user",
        resource_id=resource_id,
        details=details or {},
        ip_address=ip_address,
    )
    db.add(audit)
    db.commit()


@router.get("/", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[UserResponse]:
    """List all users (admin only)."""
    service = AuthService(db)
    users = service.get_all_users()
    return [UserResponse.model_validate(u) for u in users]


@router.post("/", response_model=UserResponse, status_code=201)
def create_user(
    body: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> UserResponse:
    """Create a new user (admin only)."""
    service = AuthService(db)
    existing = service.get_user_by_email(str(body.email))
    if existing is not None:
        raise ConflictException(detail="A user with this email already exists")

    user = service.create_user(body)

    ip_address = request.client.host if request.client else None
    _log_audit(
        db,
        admin.id,
        "admin_create_user",
        user.id,
        {"email": user.email, "role": user.role, "created_by": admin.id},
        ip_address,
    )

    return UserResponse.model_validate(user)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> UserResponse:
    """Get user by ID (admin only)."""
    service = AuthService(db)
    user = service.get_user_by_id(user_id)
    if user is None:
        raise NotFoundException(detail=f"User {user_id} not found")
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    body: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> UserResponse:
    """Update user by ID (admin only)."""
    service = AuthService(db)

    # Check email conflict if email is being updated
    if body.email is not None:
        existing = service.get_user_by_email(str(body.email))
        if existing is not None and existing.id != user_id:
            raise ConflictException(detail="Email already in use by another user")

    user = service.update_user(user_id, body)
    if user is None:
        raise NotFoundException(detail=f"User {user_id} not found")

    ip_address = request.client.host if request.client else None
    _log_audit(
        db,
        admin.id,
        "admin_update_user",
        user_id,
        {"updated_by": admin.id, "fields": body.model_dump(exclude_unset=True)},
        ip_address,
    )

    return UserResponse.model_validate(user)


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    """Delete user by ID (admin only)."""
    if user_id == admin.id:
        from app.core.exceptions import BadRequestException
        raise BadRequestException(detail="Cannot delete your own account")

    service = AuthService(db)
    deleted = service.delete_user(user_id)
    if not deleted:
        raise NotFoundException(detail=f"User {user_id} not found")

    ip_address = request.client.host if request.client else None
    _log_audit(
        db,
        admin.id,
        "admin_delete_user",
        user_id,
        {"deleted_by": admin.id},
        ip_address,
    )

    return {"message": f"User {user_id} deleted successfully"}
