from typing import Optional

from sqlalchemy.orm import Session

from app.core import security
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def authenticate(self, email: str, password: str) -> Optional[User]:
        user = self.db.query(User).filter(User.email == email).first()
        if user is None:
            return None
        if not security.verify_password(password, user.hashed_password):
            return None
        return user

    def create_access_token(self, user: User) -> str:
        return security.create_access_token(
            data={"sub": str(user.id), "role": user.role, "email": user.email}
        )

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_user_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def get_all_users(self) -> list[User]:
        return self.db.query(User).all()

    def create_user(self, user_data: UserCreate) -> User:
        hashed_password = security.get_password_hash(user_data.password)
        user = User(
            email=user_data.email,
            hashed_password=hashed_password,
            full_name=user_data.full_name,
            role=user_data.role,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        # Log audit event
        audit = AuditLog(
            user_id=user.id,
            action="user_created",
            resource_type="user",
            resource_id=user.id,
            details={"email": user.email, "role": user.role},
        )
        self.db.add(audit)
        self.db.commit()

        return user

    def update_user(self, user_id: int, data: UserUpdate) -> Optional[User]:
        user = self.get_user_by_id(user_id)
        if user is None:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

        self.db.commit()
        self.db.refresh(user)
        return user

    def delete_user(self, user_id: int) -> bool:
        user = self.get_user_by_id(user_id)
        if user is None:
            return False
        self.db.delete(user)
        self.db.commit()
        return True

    def change_password(
        self, user_id: int, current_password: str, new_password: str
    ) -> bool:
        user = self.get_user_by_id(user_id)
        if user is None:
            return False
        if not security.verify_password(current_password, user.hashed_password):
            return False

        user.hashed_password = security.get_password_hash(new_password)
        self.db.commit()

        # Log audit event
        audit = AuditLog(
            user_id=user_id,
            action="password_changed",
            resource_type="user",
            resource_id=user_id,
            details={"user_id": user_id},
        )
        self.db.add(audit)
        self.db.commit()

        return True
