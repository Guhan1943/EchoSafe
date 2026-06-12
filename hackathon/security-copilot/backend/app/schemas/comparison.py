from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class RelatedSourceItem(BaseModel):
    title: str
    url: str
    summary: str
    published_at: Optional[datetime] = None
    relevance_score: int
    matched_terms: list[str]
    is_topical_match: bool


class VendorCompareSource(BaseModel):
    source_id: str
    name: str
    site: str
    tagline: str
    description: str
    feed_url: str
    related: Optional[RelatedSourceItem] = None


class SourceCompareResponse(BaseModel):
    article_id: int
    article_title: str
    sources: list[VendorCompareSource]
