from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.client_recipient import ClientRecipient


class ClientRecipientRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, active_only: bool = False) -> list[ClientRecipient]:
        stmt = select(ClientRecipient).order_by(ClientRecipient.name.asc())
        if active_only:
            stmt = stmt.where(ClientRecipient.is_active.is_(True))
        return list(self.db.execute(stmt).scalars().all())

    def get_by_id(self, recipient_id: int) -> Optional[ClientRecipient]:
        return self.db.get(ClientRecipient, recipient_id)

    def get_by_email(self, email: str) -> Optional[ClientRecipient]:
        stmt = select(ClientRecipient).where(ClientRecipient.email == email.lower())
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_ids(self, recipient_ids: list[int], active_only: bool = True) -> list[ClientRecipient]:
        if not recipient_ids:
            return []
        stmt = select(ClientRecipient).where(ClientRecipient.id.in_(recipient_ids))
        if active_only:
            stmt = stmt.where(ClientRecipient.is_active.is_(True))
        return list(self.db.execute(stmt).scalars().all())

    def create(self, data: dict) -> ClientRecipient:
        if "email" in data and data["email"]:
            data["email"] = str(data["email"]).lower()
        recipient = ClientRecipient(**data)
        self.db.add(recipient)
        self.db.flush()
        return recipient

    def update(self, recipient: ClientRecipient, data: dict) -> ClientRecipient:
        if "email" in data and data["email"] is not None:
            data["email"] = str(data["email"]).lower()
        for key, value in data.items():
            if value is not None:
                setattr(recipient, key, value)
        self.db.flush()
        return recipient

    def delete(self, recipient: ClientRecipient) -> None:
        self.db.delete(recipient)
        self.db.flush()
