from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, HttpUrl


class SourceBase(BaseModel):
    name: str
    url: HttpUrl
    source_type: str
    polling_interval_minutes: int = 60


class SourceCreate(SourceBase):
    pass


class SourceUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[HttpUrl] = None
    source_type: Optional[str] = None
    is_active: Optional[bool] = None
    polling_interval_minutes: Optional[int] = None


class SourceResponse(SourceBase):
    id: int
    is_active: bool
    last_polled_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
