from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ClientRecipientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    company: Optional[str] = Field(None, max_length=255)
    is_active: bool = True


class ClientRecipientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    company: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None


class ClientRecipientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    company: Optional[str]
    is_active: bool
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime


class ClientRecipientListResponse(BaseModel):
    items: list[ClientRecipientResponse]
    total: int
