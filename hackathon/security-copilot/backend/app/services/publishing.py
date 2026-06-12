import logging
import re
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.audit import AuditLog
from app.models.article import Article
from app.models.content import GeneratedContent, PublishedContent
from app.repositories.client_recipient import ClientRecipientRepository
from app.repositories.publishing_channel import PublishingChannelRepository
from app.services.channel_mapping import channel_label, platform_for_content_type
from app.services.article_image import resolve_article_image
from app.services.email_publisher import EmailPublisherService
from app.services.linkedin_publisher import LinkedInPublisherService

logger = logging.getLogger(__name__)

CONTENT_TYPE_LABELS = {
    "blog": "Blog Article",
    "executive_brief": "Executive Brief",
    "technical_analysis": "Technical Analysis",
}


def _blog_excerpt(text: str, limit: int = 200) -> str:
    plain = re.sub(r"<[^>]+>", " ", text)
    plain = re.sub(r"[#*_>`\[\]()]", " ", plain)
    plain = re.sub(r"\s+", " ", plain).strip()
    if len(plain) <= limit:
        return plain
    return plain[: limit - 1].rstrip() + "…"


def _blog_summary_from_published(published: PublishedContent) -> dict:
    generated = published.generated_content
    article = published.article
    title = (generated.title if generated else None) or (article.title if article else "Untitled")
    content = generated.content if generated else ""
    content_type = generated.content_type if generated else "blog"
    image_url = None
    if generated and generated.image_url:
        image_url = generated.image_url
    elif article and article.image_url:
        image_url = article.image_url

    return {
        "id": published.id,
        "generated_content_id": published.generated_content_id,
        "article_id": published.article_id,
        "title": title,
        "excerpt": _blog_excerpt(content),
        "content_type": content_type,
        "content_type_label": CONTENT_TYPE_LABELS.get(content_type, content_type.replace("_", " ").title()),
        "severity": article.severity if article else None,
        "image_url": image_url,
        "published_at": published.published_at,
    }


class PublishingService:
    def __init__(self, db: Session):
        self.db = db
        self.channel_repo = PublishingChannelRepository(db)
        self.recipient_repo = ClientRecipientRepository(db)
        self.email_publisher = EmailPublisherService()
        self.linkedin_publisher = LinkedInPublisherService()

    def publish(
        self,
        content_id: int,
        publisher_id: int,
        recipients: Optional[list[str]] = None,
        recipient_ids: Optional[list[int]] = None,
    ) -> PublishedContent:
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

        if article.status not in ("approved", "published"):
            raise ValueError(
                f"Article must be approved before publishing. Current status: {article.status}"
            )

        if not generated.is_approved:
            raise ValueError(
                "Content is not approved for publishing. "
                "Approve the article first to unlock its generated content."
            )

        platform = platform_for_content_type(generated.content_type)

        existing = (
            self.db.query(PublishedContent)
            .filter(
                PublishedContent.generated_content_id == content_id,
                PublishedContent.platform == platform,
                PublishedContent.status == "published",
            )
            .first()
        )
        if existing is not None:
            raise ValueError(
                f"Content already published to {channel_label(platform)}. "
                f"Published at {existing.published_at.isoformat()}"
            )

        resolved_recipients = self._resolve_recipients(recipients, recipient_ids)
        response_message = self._dispatch(platform, generated, article, resolved_recipients)

        published = PublishedContent(
            generated_content_id=content_id,
            article_id=article.id,
            published_by=publisher_id,
            platform=platform,
            status="published",
            published_at=datetime.utcnow(),
            response_message=response_message,
        )
        self.db.add(published)

        if article.status != "published":
            article.status = "published"

        self.db.flush()

        audit = AuditLog(
            user_id=publisher_id,
            action=f"content_published_{platform}",
            resource_type="published_content",
            resource_id=published.id,
            details={
                "generated_content_id": content_id,
                "article_id": article.id,
                "content_type": generated.content_type,
                "platform": platform,
                "response": response_message,
                "recipients": resolved_recipients or [],
            },
        )
        self.db.add(audit)
        self.db.commit()
        self.db.refresh(published)
        return published

    def _resolve_recipients(
        self,
        recipients: Optional[list[str]],
        recipient_ids: Optional[list[int]],
    ) -> Optional[list[str]]:
        if recipients:
            return recipients

        if recipient_ids:
            clients = self.recipient_repo.get_by_ids(recipient_ids, active_only=True)
            if not clients:
                raise ValueError("No active client recipients found for the selected IDs.")
            return [client.email for client in clients]

        active_clients = self.recipient_repo.get_all(active_only=True)
        if active_clients:
            return [client.email for client in active_clients]

        return None

    def _dispatch(
        self,
        platform: str,
        generated: GeneratedContent,
        article: Article,
        recipients: Optional[list[str]],
    ) -> str:
        title = generated.title or "Security Intelligence Update"
        body = generated.content

        if platform == "linkedin":
            creds = self.channel_repo.get_credentials("linkedin")
            if creds is None:
                raise ValueError(
                    "LinkedIn is not connected. Configure it in Admin → Publishing Channels."
                )
            from app.services.linkedin_oauth import ensure_fresh_credentials

            fresh_creds = ensure_fresh_credentials(creds)
            if fresh_creds.get("access_token") != creds.get("access_token"):
                public = self.linkedin_publisher.public_config(fresh_creds)
                self.channel_repo.upsert(
                    "linkedin",
                    status="connected",
                    metadata=public,
                    credentials=fresh_creds,
                )

            image_url = generated.image_url or article.image_url
            if not image_url and article.url:
                image_url = resolve_article_image(article.url, article.image_url)
                if image_url:
                    image_url = image_url[:2048]
                    generated.image_url = image_url
                    if not article.image_url:
                        article.image_url = image_url
                    self.db.flush()
                    logger.info("Resolved cover image for LinkedIn publish: %s", image_url[:120])

            return self.linkedin_publisher.publish(
                fresh_creds,
                text=body,
                title=title,
                image_url=image_url,
            )

        if platform == "email":
            creds = self.channel_repo.get_credentials("email")
            if creds is None:
                raise ValueError(
                    "Email (SMTP) is not connected. Configure it in Admin → Publishing Channels."
                )
            if not recipients:
                raise ValueError(
                    "At least one client recipient is required. "
                    "Add clients in Client Mails or select recipients when publishing."
                )
            return self.email_publisher.send(
                creds,
                subject=title,
                body=body,
                recipients=recipients,
            )

        if platform == "blog":
            return "Published to internal blog archive"

        return "Published internally"

    def get_history(
        self, skip: int = 0, limit: int = 20
    ) -> tuple[list[PublishedContent], int]:
        query = self.db.query(PublishedContent).order_by(
            PublishedContent.published_at.desc()
        )
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total

    def get_blog_posts(
        self, skip: int = 0, limit: int = 20
    ) -> tuple[list[dict], int]:
        query = (
            self.db.query(PublishedContent)
            .options(
                joinedload(PublishedContent.generated_content),
                joinedload(PublishedContent.article),
            )
            .filter(
                PublishedContent.platform == "blog",
                PublishedContent.status == "published",
            )
            .order_by(PublishedContent.published_at.desc())
        )
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return [_blog_summary_from_published(item) for item in items], total

    def get_blog_post(self, published_id: int) -> Optional[dict]:
        published = (
            self.db.query(PublishedContent)
            .options(
                joinedload(PublishedContent.generated_content),
                joinedload(PublishedContent.article),
            )
            .filter(
                PublishedContent.id == published_id,
                PublishedContent.platform == "blog",
                PublishedContent.status == "published",
            )
            .first()
        )
        if published is None:
            return None

        summary = _blog_summary_from_published(published)
        generated = published.generated_content
        article = published.article
        return {
            **summary,
            "content": generated.content if generated else "",
            "article_title": article.title if article else None,
            "article_summary": article.summary if article else None,
            "trust_score": article.trust_score if article else None,
        }

    def export_content(self, content_id: int) -> str:
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
