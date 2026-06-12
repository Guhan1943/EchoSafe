from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ArticlesBySeverity(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0


class ArticlesByStatus(BaseModel):
    new: int = 0
    ai_verified: int = 0
    pending_manual_review: int = 0
    approved: int = 0
    published: int = 0
    rejected: int = 0
    under_review: int = 0


class OverviewResponse(BaseModel):
    total_articles: int
    verified_count: int
    approved_count: int
    published_count: int
    avg_trust_score: float
    verification_success_rate: float
    articles_by_severity: ArticlesBySeverity
    articles_by_status: ArticlesByStatus


class SourceStatsResponse(BaseModel):
    source_id: int
    name: str
    article_count: int
    avg_trust_score: float
    last_collected: Optional[datetime] = None


class TrustScoreRange(BaseModel):
    range: str
    count: int


class TrustScoreDistributionResponse(BaseModel):
    distribution: list[TrustScoreRange]
    avg: float
    min: int
    max: int
