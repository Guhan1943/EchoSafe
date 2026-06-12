from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class ArticleResponse(BaseModel):
    id: int
    source_id: Optional[int] = None
    title: str
    url: str
    summary: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[datetime] = None
    collected_at: datetime
    status: str
    severity: Optional[str] = None
    trust_score: int
    image_url: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ArticleListResponse(BaseModel):
    items: list[ArticleResponse]
    total: int
    skip: int
    limit: int


class VerificationResultResponse(BaseModel):
    id: int
    article_id: int
    authenticity_score: int
    credibility_score: int
    severity: Optional[str] = None
    confidence: Optional[str] = None
    business_impact: Optional[str] = None
    ai_analysis: Optional[str] = None
    trust_score_breakdown: Optional[Any] = None
    trust_level: Optional[str] = None
    cve_references: Optional[Any] = None
    sources_checked: Optional[Any] = None
    affected_products: Optional[Any] = None
    recommended_actions: Optional[str] = None
    verified_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ArticleDetailResponse(ArticleResponse):
    content: Optional[str] = None
    verification_result: Optional[VerificationResultResponse] = None
    approvals: list[Any] = []
    generated_content: list[Any] = []


# Resolve forward references with concrete types at module level
# Must run after approval.py and content.py are importable
def _rebuild():
    from app.schemas.approval import ApprovalResponse
    from app.schemas.content import GeneratedContentResponse

    ArticleDetailResponse.__annotations__["approvals"] = list[ApprovalResponse]
    ArticleDetailResponse.__annotations__["generated_content"] = list[GeneratedContentResponse]
    ArticleDetailResponse.model_rebuild(force=True)


_rebuild()
