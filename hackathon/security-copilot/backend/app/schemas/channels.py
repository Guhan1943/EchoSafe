from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class EmailConnectRequest(BaseModel):
    smtp_host: str
    smtp_port: int = Field(ge=1, le=65535)
    username: str
    password: str
    sender_email: EmailStr
    sender_name: str = "Security Intelligence"
    encryption: Literal["TLS", "SSL", "STARTTLS", "NONE"] = "STARTTLS"


class EmailTestRequest(EmailConnectRequest):
    pass


class EmailStatusResponse(BaseModel):
    connected: bool
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    username: Optional[str] = None
    sender_email: Optional[str] = None
    sender_name: Optional[str] = None
    encryption: Optional[str] = None
    connected_at: Optional[datetime] = None


class LinkedInConnectRequest(BaseModel):
    access_token: str
    author_urn: str = Field(description="LinkedIn person or organization URN")


class LinkedInStatusResponse(BaseModel):
    connected: bool
    author_urn: Optional[str] = None
    profile_name: Optional[str] = None
    connected_at: Optional[datetime] = None


class LinkedInOAuthUrlResponse(BaseModel):
    authorization_url: str


class ChannelSummaryResponse(BaseModel):
    channel_type: str
    connected: bool
    connected_at: Optional[datetime] = None
