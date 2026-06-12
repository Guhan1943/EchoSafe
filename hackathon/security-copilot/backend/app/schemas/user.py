from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    role: str = "viewer"


class UserCreate(UserBase):
    email: EmailStr  # strict validation only on input
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None  # strict validation only on input
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
