from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session) -> None:
        super().__init__(User, db)

    def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_active_users(self) -> list[User]:
        stmt = select(User).where(User.is_active == True)  # noqa: E712
        return list(self.db.execute(stmt).scalars().all())

    def get_by_role(self, role: str) -> list[User]:
        stmt = select(User).where(User.role == role)
        return list(self.db.execute(stmt).scalars().all())
