from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ThreatEvent(Base):
    __tablename__ = "threat_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    external_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    source_adapter: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(1024), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    author: Mapped[str | None] = mapped_column(String(255), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    collected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Processing status
    status: Mapped[str] = mapped_column(
        String(50), default="new", nullable=False, index=True
    )  # new | processing | verified | rejected

    # Confidence scoring
    confidence_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    confidence_level: Mapped[str] = mapped_column(
        String(20), default="low", nullable=False, index=True
    )  # low | medium | high | verified
    confidence_reasoning: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Risk
    risk_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    severity: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)

    # Deduplication
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    duplicate_of_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("threat_events.id"), nullable=True
    )

    # Raw source payload
    raw_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Relationships
    entities: Mapped[list["ThreatEntity"]] = relationship(
        "ThreatEntity", back_populates="event", cascade="all, delete-orphan"
    )
    embedding: Mapped["EventEmbedding | None"] = relationship(
        "EventEmbedding", back_populates="event", uselist=False, cascade="all, delete-orphan"
    )
    risk_assessment: Mapped["ThreatRiskAssessment | None"] = relationship(
        "ThreatRiskAssessment", back_populates="event", uselist=False, cascade="all, delete-orphan"
    )
    duplicates: Mapped[list["ThreatEvent"]] = relationship(
        "ThreatEvent", foreign_keys=[duplicate_of_id]
    )


class ThreatEntity(Base):
    __tablename__ = "threat_entities"
    __table_args__ = (
        UniqueConstraint("event_id", "entity_type", "value", name="uq_threat_entity"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("threat_events.id"), nullable=False, index=True
    )
    entity_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # cve | vendor | product | vulnerability_type | threat_indicator
    value: Mapped[str] = mapped_column(String(512), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    event: Mapped["ThreatEvent"] = relationship("ThreatEvent", back_populates="entities")


class EventEmbedding(Base):
    __tablename__ = "event_embeddings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("threat_events.id"), unique=True, nullable=False, index=True
    )
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    embedding: Mapped[list | None] = mapped_column(JSON, nullable=True)  # list[float]
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    event: Mapped["ThreatEvent"] = relationship("ThreatEvent", back_populates="embedding")


class ThreatRiskAssessment(Base):
    __tablename__ = "threat_risk_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("threat_events.id"), unique=True, nullable=False, index=True
    )
    risk_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="low", nullable=False)
    cvss_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    exploit_available: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    public_poc: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    vendor_confirmed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mention_velocity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reasons: Mapped[list | None] = mapped_column(JSON, nullable=True)
    assessed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    event: Mapped["ThreatEvent"] = relationship("ThreatEvent", back_populates="risk_assessment")
