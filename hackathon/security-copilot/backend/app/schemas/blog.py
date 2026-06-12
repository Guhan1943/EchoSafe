from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class BlogPostSummaryResponse(BaseModel):
    id: int
    generated_content_id: int
    article_id: int
    title: str
    excerpt: str
    content_type: str
    content_type_label: str
    severity: Optional[str] = None
    image_url: Optional[str] = None
    published_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BlogPostDetailResponse(BlogPostSummaryResponse):
    content: str
    article_title: Optional[str] = None
    article_summary: Optional[str] = None
    trust_score: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class BlogPostListResponse(BaseModel):
    items: list[BlogPostSummaryResponse]
    total: int
