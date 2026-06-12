from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ── Entity ────────────────────────────────────────────────────────────────────

class ThreatEntityResponse(BaseModel):
    id: int
    entity_type: str
    value: str
    confidence: float

    model_config = ConfigDict(from_attributes=True)


# ── Risk assessment ───────────────────────────────────────────────────────────

class RiskAssessmentResponse(BaseModel):
    risk_score: int
    severity: str
    cvss_score: Optional[float] = None
    exploit_available: bool
    public_poc: bool
    vendor_confirmed: bool
    mention_velocity: int
    reasons: Optional[list[str]] = None
    assessed_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Threat event list ─────────────────────────────────────────────────────────

class ThreatEventResponse(BaseModel):
    id: int
    external_id: str
    source_adapter: str
    source_type: str
    title: str
    description: Optional[str] = None
    url: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[datetime] = None
    collected_at: datetime
    status: str
    confidence_score: int
    confidence_level: str
    risk_score: int
    severity: Optional[str] = None
    is_duplicate: bool

    model_config = ConfigDict(from_attributes=True)


# ── Threat event detail ───────────────────────────────────────────────────────

class ThreatEventDetailResponse(ThreatEventResponse):
    confidence_reasoning: Optional[list[str]] = None
    entities: list[ThreatEntityResponse] = []
    risk_assessment: Optional[RiskAssessmentResponse] = None
    duplicate_of_id: Optional[int] = None
    related_events: list[dict] = []

    model_config = ConfigDict(from_attributes=True)


# ── List response ─────────────────────────────────────────────────────────────

class ThreatEventListResponse(BaseModel):
    items: list[ThreatEventResponse]
    total: int
    skip: int
    limit: int


# ── Collector ─────────────────────────────────────────────────────────────────

class CollectorRunRequest(BaseModel):
    adapters: Optional[list[str]] = None  # None = run all


class CollectorRunResponse(BaseModel):
    started_at: str
    finished_at: Optional[str] = None
    total_collected: int
    total_inserted: int
    total_duplicates: int
    total_errors: int
    adapters: list[dict]
