from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SettingResponse(BaseModel):
    id: int
    key: str
    value: Optional[str] = None
    description: Optional[str] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SettingUpdate(BaseModel):
    value: str
