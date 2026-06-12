from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.repositories.base import BaseRepository


class AuditRepository(BaseRepository[AuditLog]):
    def __init__(self, db: Session) -> None:
        super().__init__(AuditLog, db)

    def log(
        self,
        user_id: Optional[int],
        action: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[int] = None,
        details: Optional[dict] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        return self.create(
            {
                "user_id": user_id,
                "action": action,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "details": details,
                "ip_address": ip_address,
            }
        )

    def get_filtered(
        self,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[AuditLog], int]:
        stmt = select(AuditLog)
        count_stmt = select(func.count()).select_from(AuditLog)

        filters = []
        if user_id is not None:
            filters.append(AuditLog.user_id == user_id)
        if action is not None:
            filters.append(AuditLog.action == action)
        if resource_type is not None:
            filters.append(AuditLog.resource_type == resource_type)

        if filters:
            for f in filters:
                stmt = stmt.where(f)
                count_stmt = count_stmt.where(f)

        total = self.db.execute(count_stmt).scalar_one()
        items = list(
            self.db.execute(
                stmt.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
            )
            .scalars()
            .all()
        )
        return items, total
