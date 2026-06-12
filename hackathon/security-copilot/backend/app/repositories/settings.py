from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.settings import Setting
from app.repositories.base import BaseRepository


class SettingsRepository(BaseRepository[Setting]):
    def __init__(self, db: Session) -> None:
        super().__init__(Setting, db)

    def get_by_key(self, key: str) -> Optional[Setting]:
        stmt = select(Setting).where(Setting.key == key)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_all_settings(self) -> list[Setting]:
        stmt = select(Setting).order_by(Setting.key)
        return list(self.db.execute(stmt).scalars().all())

    def upsert(
        self,
        key: str,
        value: str,
        description: Optional[str] = None,
    ) -> Setting:
        existing = self.get_by_key(key)
        if existing is not None:
            update_data: dict = {"value": value, "updated_at": datetime.utcnow()}
            if description is not None:
                update_data["description"] = description
            return self.update(existing, update_data)
        create_data: dict = {"key": key, "value": value}
        if description is not None:
            create_data["description"] = description
        return self.create(create_data)
