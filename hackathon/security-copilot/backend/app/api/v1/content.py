import logging
from typing import Optional
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_analyst
from app.core.exceptions import BadRequestException, NotFoundException
from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.repositories.article import ArticleRepository
from app.repositories.content import ContentRepository
from app.schemas.content import (
    GeneratedContentListResponse,
    GeneratedContentResponse,
    GeneratedContentUpdate,
)
from app.services.content_generation import ContentGenerationService
from app.services.publishing import PublishingService
from app.services.article_image import BROWSER_HEADERS

logger = logging.getLogger(__name__)

router = APIRouter()


def _log_audit(
    db: Session,
    user_id: Optional[int],
    action: str,
    resource_type: str,
    resource_id: Optional[int],
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> None:
    audit = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {},
        ip_address=ip_address,
    )
    db.add(audit)
    db.commit()


@router.get("/", response_model=GeneratedContentListResponse)
def list_generated_content(
    skip: int = 0,
    limit: int = 20,
    approved_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> GeneratedContentListResponse:
    """List generated content with pagination."""
    repo = ContentRepository(db)
    items, total = repo.get_all_with_pagination(
        skip=skip, limit=limit, approved_only=approved_only
    )
    return GeneratedContentListResponse(
        items=[GeneratedContentResponse.model_validate(item) for item in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/by-article/{article_id}", response_model=list[GeneratedContentResponse])
def get_content_for_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[GeneratedContentResponse]:
    """Get all generated content for an article."""
    article_repo = ArticleRepository(db)
    article = article_repo.get(article_id)
    if article is None:
        raise NotFoundException(detail=f"Article {article_id} not found")

    repo = ContentRepository(db)
    items = repo.get_by_article(article_id)
    return [GeneratedContentResponse.model_validate(item) for item in items]


@router.post(
    "/by-article/{article_id}/generate",
    response_model=list[GeneratedContentResponse],
    status_code=201,
)
def generate_content(
    article_id: int,
    request: Request,
    db: Session = Depends(get_db),
    analyst: User = Depends(require_analyst),
) -> list[GeneratedContentResponse]:
    """Generate all content types for an article (analyst/admin only)."""
    article_repo = ArticleRepository(db)
    article = article_repo.get(article_id)
    if article is None:
        raise NotFoundException(detail=f"Article {article_id} not found")

    service = ContentGenerationService(db)
    try:
        results = service.generate_all(article_id)
    except ValueError as exc:
        raise NotFoundException(detail=str(exc))
    except Exception as exc:
        logger.error("Content generation failed for article %s: %s", article_id, exc)
        raise BadRequestException(detail=f"Content generation failed: {exc}")

    ip_address = request.client.host if request.client else None
    _log_audit(
        db,
        analyst.id,
        "content_generated",
        "article",
        article_id,
        {"content_count": len(results), "article_id": article_id},
        ip_address,
    )

    return [GeneratedContentResponse.model_validate(r) for r in results]


@router.put("/{content_id}", response_model=GeneratedContentResponse)
def update_content(
    content_id: int,
    body: GeneratedContentUpdate,
    request: Request,
    db: Session = Depends(get_db),
    analyst: User = Depends(require_analyst),
) -> GeneratedContentResponse:
    """Update generated content (analyst/admin only)."""
    repo = ContentRepository(db)
    content = repo.get(content_id)
    if content is None:
        raise NotFoundException(detail=f"GeneratedContent {content_id} not found")

    data = body.model_dump(exclude_unset=True)
    updated = repo.update(content, data)

    ip_address = request.client.host if request.client else None
    _log_audit(
        db,
        analyst.id,
        "content_updated",
        "generated_content",
        content_id,
        {"fields": list(data.keys()), "updated_by": analyst.id},
        ip_address,
    )

    return GeneratedContentResponse.model_validate(updated)


@router.get("/{content_id}/export")
def export_content(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Response:
    """Export generated content as a downloadable text file."""
    repo = ContentRepository(db)
    content = repo.get(content_id)
    if content is None:
        raise NotFoundException(detail=f"GeneratedContent {content_id} not found")

    service = PublishingService(db)
    try:
        text = service.export_content(content_id)
    except ValueError as exc:
        raise NotFoundException(detail=str(exc))

    filename = f"content_{content_id}.txt"
    return Response(
        content=text,
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.get("/image-proxy")
def proxy_image(
    url: str = Query(..., description="Remote image URL to proxy"),
    current_user: User = Depends(get_current_active_user),
) -> Response:
    """Proxy article cover images for authenticated clients (avoids hotlink/CORS issues)."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise BadRequestException(detail="Invalid image URL")

    try:
        with httpx.Client(follow_redirects=True, timeout=20.0, headers=BROWSER_HEADERS) as client:
            resp = client.get(url)
            if resp.status_code >= 400:
                raise BadRequestException(detail=f"Could not fetch image (HTTP {resp.status_code})")
            content_type = resp.headers.get("content-type", "image/jpeg")
            if not content_type.startswith("image/"):
                raise BadRequestException(detail="URL did not return an image")
            return Response(
                content=resp.content,
                media_type=content_type,
                headers={"Cache-Control": "public, max-age=3600"},
            )
    except BadRequestException:
        raise
    except Exception as exc:
        logger.warning("Image proxy failed for %s: %s", url, exc)
        raise BadRequestException(detail="Failed to fetch image") from exc
