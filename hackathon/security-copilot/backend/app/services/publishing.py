import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.article import Article
from app.models.content import GeneratedContent, PublishedContent

logger = logging.getLogger(__name__)


class PublishingService:
    def __init__(self, db: Session):
        self.db = db

    def publish(self, content_id: int, publisher_id: int) -> PublishedContent:
        """
        Publish generated content.
        Ensures the content exists and the parent article is approved.
        """
        generated = (
            self.db.query(GeneratedContent)
            .filter(GeneratedContent.id == content_id)
            .first()
        )
        if generated is None:
            raise ValueError(f"GeneratedContent {content_id} not found")

        article = (
            self.db.query(Article)
            .filter(Article.id == generated.article_id)
            .first()
        )
        if article is None:
            raise ValueError(f"Article {generated.article_id} not found")

        if article.status != "approved":
            raise ValueError(
                f"Article must be in 'approved' status to publish. "
                f"Current status: {article.status}"
            )

        published = PublishedContent(
            generated_content_id=content_id,
            article_id=article.id,
            published_by=publisher_id,
            platform="internal",
            status="published",
            published_at=datetime.utcnow(),
        )
        self.db.add(published)

        # Move article to published status
        if article.status != "published":
            article.status = "published"

        self.db.flush()

        # Audit log
        audit = AuditLog(
            user_id=publisher_id,
            action="content_published",
            resource_type="published_content",
            resource_id=published.id,
            details={
                "generated_content_id": content_id,
                "article_id": article.id,
                "content_type": generated.content_type,
            },
        )
        self.db.add(audit)
        self.db.commit()
        self.db.refresh(published)
        return published

    def get_history(
        self, skip: int = 0, limit: int = 20
    ) -> tuple[list[PublishedContent], int]:
        query = self.db.query(PublishedContent).order_by(
            PublishedContent.published_at.desc()
        )
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total

    def export_content(self, content_id: int) -> str:
        """Return formatted text of the generated content for download."""
        generated = (
            self.db.query(GeneratedContent)
            .filter(GeneratedContent.id == content_id)
            .first()
        )
        if generated is None:
            raise ValueError(f"GeneratedContent {content_id} not found")

        header = (
            f"Title: {generated.title or 'Untitled'}\n"
            f"Type: {generated.content_type}\n"
            f"Generated: {generated.created_at.strftime('%Y-%m-%d %H:%M UTC')}\n"
            f"{'=' * 60}\n\n"
        )
        return header + generated.content
