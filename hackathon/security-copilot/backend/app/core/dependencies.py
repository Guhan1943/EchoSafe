from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import verify_token
from app.database import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    payload = verify_token(token)
    if payload is None:
        raise UnauthorizedException(detail="Could not validate credentials")

    user_id: int | None = payload.get("sub")
    if user_id is None:
        raise UnauthorizedException(detail="Could not validate credentials")

    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        raise UnauthorizedException(detail="Could not validate credentials")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise UnauthorizedException(detail="User not found")

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise ForbiddenException(detail="Inactive user")
    return current_user


def require_admin(
    current_user: User = Depends(get_current_active_user),
) -> User:
    if current_user.role != "admin":
        raise ForbiddenException(detail="Admin access required")
    return current_user


def require_analyst(
    current_user: User = Depends(get_current_active_user),
) -> User:
    if current_user.role not in ("admin", "analyst"):
        raise ForbiddenException(detail="Analyst or admin access required")
    return current_user
