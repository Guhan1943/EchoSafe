import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user
from app.core.exceptions import BadRequestException, UnauthorizedException
from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, LoginRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.auth import AuthService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Authenticate user and return JWT access token."""
    service = AuthService(db)
    user = service.authenticate(form_data.username, form_data.password)
    if user is None:
        raise UnauthorizedException(detail="Incorrect email or password")

    if not user.is_active:
        raise UnauthorizedException(detail="Account is inactive")

    token = service.create_access_token(user)

    # Audit login event
    ip_address = request.client.host if request.client else None
    audit = AuditLog(
        user_id=user.id,
        action="login",
        resource_type="user",
        resource_id=user.id,
        details={"email": user.email},
        ip_address=ip_address,
    )
    db.add(audit)
    db.commit()

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/login/json", response_model=TokenResponse)
def login_json(
    body: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Authenticate with JSON body (alternative to OAuth2 form login)."""
    service = AuthService(db)
    user = service.authenticate(body.email, body.password)
    if user is None:
        raise UnauthorizedException(detail="Incorrect email or password")

    if not user.is_active:
        raise UnauthorizedException(detail="Account is inactive")

    token = service.create_access_token(user)

    ip_address = request.client.host if request.client else None
    audit = AuditLog(
        user_id=user.id,
        action="login",
        resource_type="user",
        resource_id=user.id,
        details={"email": user.email},
        ip_address=ip_address,
    )
    db.add(audit)
    db.commit()

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_active_user),
) -> UserResponse:
    """Return current authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """Change current user's password."""
    service = AuthService(db)
    success = service.change_password(
        current_user.id, body.current_password, body.new_password
    )
    if not success:
        raise BadRequestException(detail="Current password is incorrect")
    return {"message": "Password changed successfully"}
