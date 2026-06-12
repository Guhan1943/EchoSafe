from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.verification import VerificationResult
from app.repositories.base import BaseRepository


class VerificationRepository(BaseRepository[VerificationResult]):
    def __init__(self, db: Session) -> None:
        super().__init__(VerificationResult, db)

    def get_by_article(self, article_id: int) -> Optional[VerificationResult]:
        stmt = select(VerificationResult).where(
            VerificationResult.article_id == article_id
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_recent(self, limit: int = 10) -> list[VerificationResult]:
        stmt = (
            select(VerificationResult)
            .order_by(VerificationResult.verified_at.desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())
