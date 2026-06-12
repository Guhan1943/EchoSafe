import logging
from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_analyst
from app.core.exceptions import BadRequestException, NotFoundException
from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.repositories.article import ArticleRepository
from app.schemas.article import (
    ArticleDetailResponse,
    ArticleListResponse,
    ArticleResponse,
    VerificationResultResponse,
)
from app.schemas.approval import ApprovalResponse
from app.schemas.content import GeneratedContentResponse
from app.services.verification import VerificationService

logger = logging.getLogger(__name__)

router = APIRouter()

VALID_STATUSES = {
    "new",
    "ai_verified",
    "pending_manual_review",
    "approved",
    "published",
    "rejected",
    "under_review",
}


class StatusUpdateBody(BaseModel):
    status: str


def _log_audit(
    db: Session,
    user_id: Optional[int],
    action: str,
    resource_id: Optional[int],
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> None:
    audit = AuditLog(
        user_id=user_id,
        action=action,
        resource_type="article",
        resource_id=resource_id,
        details=details or {},
        ip_address=ip_address,
    )
    db.add(audit)
    db.commit()


@router.get("/", response_model=ArticleListResponse)
def list_articles(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    source_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ArticleListResponse:
    """List articles with optional filters."""
    if current_user.role == "viewer":
        if status and status not in {"approved", "published"}:
            raise BadRequestException(
                detail="Viewers can only access approved or published intelligence"
            )
        if status is None:
            status = "approved,published"

    repo = ArticleRepository(db)
    items, total = repo.get_filtered(
        status=status,
        severity=severity,
        source_id=source_id,
        search=search,
        skip=skip,
        limit=limit,
    )
    return ArticleListResponse(
        items=[ArticleResponse.model_validate(a) for a in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{article_id}", response_model=ArticleDetailResponse)
def get_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ArticleDetailResponse:
    """Get article by ID including verification result, approvals, and generated content."""
    repo = ArticleRepository(db)
    article = repo.get(article_id)
    if article is None:
        raise NotFoundException(detail=f"Article {article_id} not found")

    if current_user.role == "viewer" and article.status not in {"approved", "published"}:
        raise NotFoundException(detail=f"Article {article_id} not found")

    # Build detail response with related data
    detail = ArticleDetailResponse.model_validate(article)

    # Attach verification result
    if article.verification_result:
        detail.verification_result = VerificationResultResponse.model_validate(
            article.verification_result
        )

    # Attach approvals
    if article.approvals:
        detail.approvals = [
            ApprovalResponse.model_validate(a) for a in article.approvals
        ]

    # Attach generated content
    if article.generated_content:
        detail.generated_content = [
            GeneratedContentResponse.model_validate(c) for c in article.generated_content
        ]

    return detail


@router.post("/{article_id}/verify", response_model=VerificationResultResponse)
def verify_article(
    article_id: int,
    request: Request,
    db: Session = Depends(get_db),
    analyst: User = Depends(require_analyst),
) -> VerificationResultResponse:
    """Run AI verification on an article (analyst/admin only)."""
    repo = ArticleRepository(db)
    article = repo.get(article_id)
    if article is None:
        raise NotFoundException(detail=f"Article {article_id} not found")

    service = VerificationService(db)
    try:
        result = service.verify_article(article_id)
    except ValueError as exc:
        raise NotFoundException(detail=str(exc))
    except Exception as exc:
        logger.error("Verification failed for article %s: %s", article_id, exc)
        raise BadRequestException(detail=f"Verification failed: {exc}")

    ip_address = request.client.host if request.client else None
    _log_audit(
        db, analyst.id, "article_verified", article_id,
        {
            "authenticity_score": result.authenticity_score,
            "credibility_score": result.credibility_score,
            "severity": result.severity,
        },
        ip_address,
    )

    return VerificationResultResponse.model_validate(result)


@router.put("/{article_id}/status", response_model=ArticleResponse)
def update_article_status(
    article_id: int,
    body: StatusUpdateBody,
    request: Request,
    db: Session = Depends(get_db),
    analyst: User = Depends(require_analyst),
) -> ArticleResponse:
    """Update article status (analyst/admin only)."""
    if body.status not in VALID_STATUSES:
        raise BadRequestException(
            detail=f"Invalid status '{body.status}'. Valid values: {sorted(VALID_STATUSES)}"
        )

    repo = ArticleRepository(db)
    article = repo.update_status(article_id, body.status)
    if article is None:
        raise NotFoundException(detail=f"Article {article_id} not found")

    ip_address = request.client.host if request.client else None
    _log_audit(
        db, analyst.id, "article_status_updated", article_id,
        {"new_status": body.status, "updated_by": analyst.id},
        ip_address,
    )

    return ArticleResponse.model_validate(article)
