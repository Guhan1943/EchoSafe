import logging
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_analyst
from app.core.exceptions import BadRequestException, NotFoundException
from app.database import get_db
from app.models.user import User
from app.repositories.content import ContentRepository
from app.schemas.content import PublishedContentListResponse, PublishedContentResponse
from app.schemas.blog import BlogPostDetailResponse, BlogPostListResponse, BlogPostSummaryResponse
from app.schemas.publish import PublishRequest
from app.services.publishing import PublishingService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/{content_id}/publish", response_model=PublishedContentResponse, status_code=201)
def publish_content(
    content_id: int,
    body: PublishRequest = PublishRequest(),
    db: Session = Depends(get_db),
    analyst: User = Depends(require_analyst),
) -> PublishedContentResponse:
    """Publish generated content to its mapped channel (analyst/admin only)."""
    content_repo = ContentRepository(db)
    content = content_repo.get(content_id)
    if content is None:
        raise NotFoundException(detail=f"GeneratedContent {content_id} not found")

    recipients = [str(r) for r in body.recipients]
    recipient_ids = body.recipient_ids or None

    service = PublishingService(db)
    try:
        published = service.publish(
            content_id,
            analyst.id,
            recipients=recipients or None,
            recipient_ids=recipient_ids,
        )
    except ValueError as exc:
        error_msg = str(exc)
        if "not found" in error_msg.lower():
            raise NotFoundException(detail=error_msg)
        raise BadRequestException(detail=error_msg)
    except Exception as exc:
        logger.error("Publishing failed for content %s: %s", content_id, exc)
        raise BadRequestException(detail=f"Publishing failed: {exc}")

    return PublishedContentResponse.model_validate(published)


@router.get("/history", response_model=PublishedContentListResponse)
def get_publishing_history(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> PublishedContentListResponse:
    """Get publishing history with pagination."""
    service = PublishingService(db)
    items, total = service.get_history(skip=skip, limit=limit)
    return PublishedContentListResponse(
        items=[PublishedContentResponse.model_validate(item) for item in items],
        total=total,
    )


@router.get("/blog", response_model=BlogPostListResponse)
def list_blog_posts(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> BlogPostListResponse:
    """List published internal blog posts."""
    service = PublishingService(db)
    items, total = service.get_blog_posts(skip=skip, limit=limit)
    return BlogPostListResponse(
        items=[BlogPostSummaryResponse.model_validate(item) for item in items],
        total=total,
    )


@router.get("/blog/{published_id}", response_model=BlogPostDetailResponse)
def get_blog_post(
    published_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> BlogPostDetailResponse:
    """Get a single published internal blog post."""
    service = PublishingService(db)
    post = service.get_blog_post(published_id)
    if post is None:
        raise NotFoundException(detail=f"Blog post {published_id} not found")
    return BlogPostDetailResponse.model_validate(post)
