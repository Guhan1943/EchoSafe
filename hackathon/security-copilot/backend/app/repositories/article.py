from datetime import datetime
from typing import Optional

from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from app.models.article import Article
from app.repositories.base import BaseRepository


class ArticleRepository(BaseRepository[Article]):
    def __init__(self, db: Session) -> None:
        super().__init__(Article, db)

    def get_by_url(self, url: str) -> Optional[Article]:
        stmt = select(Article).where(Article.url == url)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_hash(self, content_hash: str) -> Optional[Article]:
        stmt = select(Article).where(Article.content_hash == content_hash)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_filtered(
        self,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        source_id: Optional[int] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Article], int]:
        stmt = select(Article)
        count_stmt = select(func.count()).select_from(Article)

        filters = []
        if status is not None:
            if "," in status:
                statuses = [value.strip() for value in status.split(",") if value.strip()]
                filters.append(Article.status.in_(statuses))
            else:
                filters.append(Article.status == status)
        if severity is not None:
            filters.append(Article.severity == severity)
        if source_id is not None:
            filters.append(Article.source_id == source_id)
        if search is not None:
            pattern = f"%{search}%"
            filters.append(
                or_(
                    Article.title.ilike(pattern),
                    Article.summary.ilike(pattern),
                )
            )

        if filters:
            for f in filters:
                stmt = stmt.where(f)
                count_stmt = count_stmt.where(f)

        total = self.db.execute(count_stmt).scalar_one()
        items = list(
            self.db.execute(
                stmt.order_by(Article.collected_at.desc()).offset(skip).limit(limit)
            )
            .scalars()
            .all()
        )
        return items, total

    def get_by_status(self, status: str) -> list[Article]:
        stmt = select(Article).where(Article.status == status)
        return list(self.db.execute(stmt).scalars().all())

    def update_status(
        self,
        article_id: int,
        status: str,
        trust_score: Optional[int] = None,
    ) -> Optional[Article]:
        article = self.get(article_id)
        if article is None:
            return None
        article.status = status
        if trust_score is not None:
            article.trust_score = trust_score
        self.db.add(article)
        self.db.commit()
        self.db.refresh(article)
        return article

    def get_stats(self) -> dict:
        # Counts by status
        status_rows = self.db.execute(
            select(Article.status, func.count(Article.id))
            .group_by(Article.status)
        ).all()
        by_status = {row[0]: row[1] for row in status_rows}

        # Counts by severity
        severity_rows = self.db.execute(
            select(Article.severity, func.count(Article.id))
            .where(Article.severity != None)  # noqa: E711
            .group_by(Article.severity)
        ).all()
        by_severity = {row[0]: row[1] for row in severity_rows}

        # Average trust score
        avg_trust = self.db.execute(
            select(func.avg(Article.trust_score))
        ).scalar_one_or_none()

        total = self.db.execute(
            select(func.count()).select_from(Article)
        ).scalar_one()

        return {
            "total": total,
            "by_status": by_status,
            "by_severity": by_severity,
            "avg_trust_score": float(avg_trust) if avg_trust is not None else 0.0,
        }
