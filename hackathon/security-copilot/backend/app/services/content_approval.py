from sqlalchemy.orm import Session

from app.models.content import GeneratedContent


def sync_content_approval_for_article(db: Session, article_id: int, approved: bool) -> None:
    """Keep generated content approval flags in sync with article workflow."""
    records = (
        db.query(GeneratedContent)
        .filter(GeneratedContent.article_id == article_id)
        .all()
    )
    for record in records:
        record.is_approved = approved
    if records:
        db.flush()
