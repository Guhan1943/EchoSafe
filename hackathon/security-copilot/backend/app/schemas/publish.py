from typing import Optional

from pydantic import BaseModel, EmailStr


class PublishRequest(BaseModel):
    recipients: list[EmailStr] = []
    recipient_ids: list[int] = []


class EmailPublishRequest(BaseModel):
    subject: str
    content: str
    recipients: list[EmailStr]
    content_id: Optional[int] = None
