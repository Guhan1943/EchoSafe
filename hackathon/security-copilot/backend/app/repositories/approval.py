from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.audit import Approval
from app.repositories.base import BaseRepository


class ApprovalRepository(BaseRepository[Approval]):
    def __init__(self, db: Session) -> None:
        super().__init__(Approval, db)

    def get_by_article(self, article_id: int) -> list[Approval]:
        stmt = (
            select(Approval)
            .where(Approval.article_id == article_id)
            .order_by(Approval.created_at.desc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def get_latest_by_article(self, article_id: int) -> Optional[Approval]:
        stmt = (
            select(Approval)
            .where(Approval.article_id == article_id)
            .order_by(Approval.created_at.desc())
            .limit(1)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_filtered(
        self,
        article_id: Optional[int] = None,
        analyst_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Approval], int]:
        stmt = select(Approval)
        count_stmt = select(func.count()).select_from(Approval)

        filters = []
        if article_id is not None:
            filters.append(Approval.article_id == article_id)
        if analyst_id is not None:
            filters.append(Approval.analyst_id == analyst_id)

        if filters:
            for f in filters:
                stmt = stmt.where(f)
                count_stmt = count_stmt.where(f)

        total = self.db.execute(count_stmt).scalar_one()
        items = list(
            self.db.execute(
                stmt.order_by(Approval.created_at.desc()).offset(skip).limit(limit)
            )
            .scalars()
            .all()
        )
        return items, total
