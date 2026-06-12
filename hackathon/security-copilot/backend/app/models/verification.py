from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class VerificationResult(Base):
    __tablename__ = "verification_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    article_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("articles.id"), unique=True, nullable=False, index=True
    )
    authenticity_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    credibility_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    severity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    confidence: Mapped[str | None] = mapped_column(String(50), nullable=True)
    business_impact: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_analysis: Mapped[str | None] = mapped_column(Text, nullable=True)
    trust_score_breakdown: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    trust_level: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cve_references: Mapped[list | None] = mapped_column(JSON, nullable=True)
    sources_checked: Mapped[list | None] = mapped_column(JSON, nullable=True)
    affected_products: Mapped[list | None] = mapped_column(JSON, nullable=True)
    recommended_actions: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationships
    article: Mapped["Article"] = relationship(  # noqa: F821
        "Article", back_populates="verification_result"
    )
