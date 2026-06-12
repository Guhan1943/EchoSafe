from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class GeneratedContent(Base):
    __tablename__ = "generated_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    article_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("articles.id"), nullable=False, index=True
    )
    content_type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    article: Mapped["Article"] = relationship(  # noqa: F821
        "Article", back_populates="generated_content"
    )
    published: Mapped[list["PublishedContent"]] = relationship(
        "PublishedContent", back_populates="generated_content"
    )


class PublishedContent(Base):
    __tablename__ = "published_content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    generated_content_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("generated_content.id"), nullable=False, index=True
    )
    article_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("articles.id"), nullable=False, index=True
    )
    published_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    platform: Mapped[str] = mapped_column(String(100), default="internal", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="published", nullable=False)
    response_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationships
    generated_content: Mapped["GeneratedContent"] = relationship(
        "GeneratedContent", back_populates="published"
    )
    article: Mapped["Article"] = relationship(  # noqa: F821
        "Article", back_populates="published_content"
    )
    publisher: Mapped["User | None"] = relationship(  # noqa: F821
        "User", back_populates="published_content"
    )
