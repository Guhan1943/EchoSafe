from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class GeneratedContentResponse(BaseModel):
    id: int
    article_id: int
    content_type: str
    title: Optional[str] = None
    content: str
    image_url: Optional[str] = None
    is_approved: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GeneratedContentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_approved: Optional[bool] = None


class PublishedContentResponse(BaseModel):
    id: int
    generated_content_id: int
    article_id: int
    published_by: Optional[int] = None
    platform: str
    status: str
    response_message: Optional[str] = None
    published_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PublishedContentListResponse(BaseModel):
    items: list[PublishedContentResponse]
    total: int


class GeneratedContentListResponse(BaseModel):
    items: list[GeneratedContentResponse]
    total: int
    skip: int
    limit: int
