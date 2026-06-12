from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.content import GeneratedContent, PublishedContent
from app.repositories.base import BaseRepository


class ContentRepository(BaseRepository[GeneratedContent]):
    def __init__(self, db: Session) -> None:
        super().__init__(GeneratedContent, db)

    def get_by_article(self, article_id: int) -> list[GeneratedContent]:
        stmt = (
            select(GeneratedContent)
            .where(GeneratedContent.article_id == article_id)
            .order_by(GeneratedContent.created_at.desc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def get_by_type(
        self, article_id: int, content_type: str
    ) -> Optional[GeneratedContent]:
        stmt = select(GeneratedContent).where(
            GeneratedContent.article_id == article_id,
            GeneratedContent.content_type == content_type,
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_all_with_pagination(
        self, skip: int = 0, limit: int = 20
    ) -> tuple[list[GeneratedContent], int]:
        count_stmt = select(func.count()).select_from(GeneratedContent)
        total = self.db.execute(count_stmt).scalar_one()
        stmt = (
            select(GeneratedContent)
            .order_by(GeneratedContent.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        items = list(self.db.execute(stmt).scalars().all())
        return items, total


class PublishedContentRepository(BaseRepository[PublishedContent]):
    def __init__(self, db: Session) -> None:
        super().__init__(PublishedContent, db)

    def get_history(
        self, skip: int = 0, limit: int = 20
    ) -> tuple[list[PublishedContent], int]:
        count_stmt = select(func.count()).select_from(PublishedContent)
        total = self.db.execute(count_stmt).scalar_one()
        stmt = (
            select(PublishedContent)
            .order_by(PublishedContent.published_at.desc())
            .offset(skip)
            .limit(limit)
        )
        items = list(self.db.execute(stmt).scalars().all())
        return items, total

    def get_by_content_id(
        self, generated_content_id: int
    ) -> Optional[PublishedContent]:
        stmt = select(PublishedContent).where(
            PublishedContent.generated_content_id == generated_content_id
        )
        return self.db.execute(stmt).scalar_one_or_none()
