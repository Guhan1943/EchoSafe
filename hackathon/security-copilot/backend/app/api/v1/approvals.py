import logging
from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.dependencies import require_analyst
from app.core.exceptions import NotFoundException
from app.database import get_db
from app.models.audit import AuditLog, Approval
from app.models.user import User
from app.repositories.approval import ApprovalRepository
from app.repositories.article import ArticleRepository
from app.schemas.approval import ApprovalCreate, ApprovalListResponse, ApprovalResponse
from app.services.content_approval import sync_content_approval_for_article

logger = logging.getLogger(__name__)

router = APIRouter()


def _create_approval_record(
    db: Session,
    article_id: int,
    analyst_id: int,
    action: str,
    notes: Optional[str],
) -> Approval:
    """Create an approval record and update the article status."""
    approval = Approval(
        article_id=article_id,
        analyst_id=analyst_id,
        action=action,
        notes=notes,
    )
    db.add(approval)

    # Update article status
    article_repo = ArticleRepository(db)
    article = article_repo.get(article_id)
    if article is not None:
        article.status = action  # action matches the status value
        db.add(article)
        if action == "approved":
            sync_content_approval_for_article(db, article_id, True)
        elif action == "rejected":
            sync_content_approval_for_article(db, article_id, False)

    db.flush()

    # Audit log
    audit = AuditLog(
        user_id=analyst_id,
        action=f"article_{action}",
        resource_type="approval",
        resource_id=approval.id,
        details={"article_id": article_id, "action": action, "notes": notes},
    )
    db.add(audit)
    db.commit()
    db.refresh(approval)
    return approval


@router.post("/{article_id}/approve", response_model=ApprovalResponse, status_code=201)
def approve_article(
    article_id: int,
    body: ApprovalCreate,
    request: Request,
    db: Session = Depends(get_db),
    analyst: User = Depends(require_analyst),
) -> ApprovalResponse:
    """Approve an article for publication (analyst/admin only)."""
    article_repo = ArticleRepository(db)
    article = article_repo.get(article_id)
    if article is None:
        raise NotFoundException(detail=f"Article {article_id} not found")

    approval = _create_approval_record(
        db, article_id, analyst.id, "approved", body.notes
    )
    return ApprovalResponse.model_validate(approval)


@router.post("/{article_id}/reject", response_model=ApprovalResponse, status_code=201)
def reject_article(
    article_id: int,
    body: ApprovalCreate,
    request: Request,
    db: Session = Depends(get_db),
    analyst: User = Depends(require_analyst),
) -> ApprovalResponse:
    """Reject an article (analyst/admin only)."""
    article_repo = ArticleRepository(db)
    article = article_repo.get(article_id)
    if article is None:
        raise NotFoundException(detail=f"Article {article_id} not found")

    approval = _create_approval_record(
        db, article_id, analyst.id, "rejected", body.notes
    )
    return ApprovalResponse.model_validate(approval)


@router.post("/{article_id}/under-review", response_model=ApprovalResponse, status_code=201)
def mark_under_review(
    article_id: int,
    body: ApprovalCreate,
    request: Request,
    db: Session = Depends(get_db),
    analyst: User = Depends(require_analyst),
) -> ApprovalResponse:
    """Mark an article as under review (analyst/admin only)."""
    article_repo = ArticleRepository(db)
    article = article_repo.get(article_id)
    if article is None:
        raise NotFoundException(detail=f"Article {article_id} not found")

    approval = _create_approval_record(
        db, article_id, analyst.id, "under_review", body.notes
    )
    return ApprovalResponse.model_validate(approval)


@router.get("/", response_model=ApprovalListResponse)
def list_approvals(
    article_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    analyst: User = Depends(require_analyst),
) -> ApprovalListResponse:
    """List approvals with optional article_id filter (analyst/admin only)."""
    repo = ApprovalRepository(db)
    items, total = repo.get_filtered(article_id=article_id, skip=skip, limit=limit)
    return ApprovalListResponse(
        items=[ApprovalResponse.model_validate(a) for a in items],
        total=total,
    )
