from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    source_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("sources.id"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(1024), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), unique=True, nullable=False, index=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    author: Mapped[str | None] = mapped_column(String(255), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    collected_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    status: Mapped[str] = mapped_column(String(50), default="new", nullable=False, index=True)
    severity: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    trust_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    image_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)

    # Relationships
    source: Mapped["Source"] = relationship(  # noqa: F821
        "Source", back_populates="articles"
    )
    verification_result: Mapped["VerificationResult | None"] = relationship(  # noqa: F821
        "VerificationResult", back_populates="article", uselist=False
    )
    approvals: Mapped[list["Approval"]] = relationship(  # noqa: F821
        "Approval", back_populates="article"
    )
    generated_content: Mapped[list["GeneratedContent"]] = relationship(  # noqa: F821
        "GeneratedContent", back_populates="article"
    )
    published_content: Mapped[list["PublishedContent"]] = relationship(  # noqa: F821
        "PublishedContent", back_populates="article"
    )
