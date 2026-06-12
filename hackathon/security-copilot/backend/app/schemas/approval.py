from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ApprovalBase(BaseModel):
    action: str
    notes: Optional[str] = None


class ApprovalCreate(BaseModel):
    notes: Optional[str] = None


class ApprovalResponse(BaseModel):
    id: int
    article_id: int
    analyst_id: Optional[int] = None
    action: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApprovalListResponse(BaseModel):
    items: list[ApprovalResponse]
    total: int
