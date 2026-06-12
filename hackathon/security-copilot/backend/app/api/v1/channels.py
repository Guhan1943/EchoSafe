import logging
from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.core.dependencies import require_admin, require_analyst
from app.core.exceptions import BadRequestException
from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.repositories.publishing_channel import PublishingChannelRepository
from app.schemas.channels import (
    ChannelSummaryResponse,
    EmailConnectRequest,
    EmailStatusResponse,
    EmailTestRequest,
    LinkedInConnectRequest,
    LinkedInOAuthUrlResponse,
    LinkedInStatusResponse,
)
from app.services.email_publisher import EmailPublisherService
from app.services.linkedin_oauth import build_authorization_url, create_oauth_state
from app.services.linkedin_publisher import LinkedInPublisherService
from app.services.mailpit_config import is_external_smtp_host
from app.services.mailpit_connect import connect_mailpit_channel

logger = logging.getLogger(__name__)

router = APIRouter()
email_service = EmailPublisherService()
linkedin_service = LinkedInPublisherService()


def _audit(db: Session, user_id: int, action: str, details: dict) -> None:
    db.add(
        AuditLog(
            user_id=user_id,
            action=action,
            resource_type="publishing_channel",
            resource_id=None,
            details=details,
        )
    )
    db.commit()


@router.get("/", response_model=list[ChannelSummaryResponse])
def list_channels(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
) -> list[ChannelSummaryResponse]:
    repo = PublishingChannelRepository(db)
    known = ["linkedin", "email", "telegram", "x", "medium", "slack"]
    by_type = {c.channel_type: c for c in repo.list_all()}
    result = []
    for channel_type in known:
        ch = by_type.get(channel_type)
        result.append(
            ChannelSummaryResponse(
                channel_type=channel_type,
                connected=bool(ch and ch.status == "connected"),
                connected_at=ch.connected_at if ch else None,
            )
        )
    return result


def _reject_external_smtp_in_dev(host: str) -> None:
    if settings.ENVIRONMENT == "development" and is_external_smtp_host(host):
        raise BadRequestException(
            detail=(
                "Gmail/Outlook cannot be reached from Docker on this network "
                "(outbound SMTP ports 587/465 are blocked). "
                "Use the 'Connect Local Email (Mailpit)' button instead — "
                "emails appear at http://localhost:8025."
            )
        )


@router.post("/email/connect-mailpit", response_model=EmailStatusResponse)
def connect_mailpit(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> EmailStatusResponse:
    """One-click local email via Mailpit (development only)."""
    if settings.ENVIRONMENT != "development":
        raise BadRequestException(detail="Mailpit connect is only available in development.")

    try:
        public = connect_mailpit_channel(db, admin.id)
    except ValueError as exc:
        raise BadRequestException(detail=str(exc))

    _audit(db, admin.id, "channel_connected", {"channel": "email", "provider": "mailpit"})
    channel = PublishingChannelRepository(db).get_by_type("email")
    return EmailStatusResponse(
        connected=True,
        connected_at=channel.connected_at if channel else None,
        **public,
    )


@router.post("/email/test")
def test_email(
    body: EmailTestRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    incoming = email_service.config_from_request(body.model_dump())
    repo = PublishingChannelRepository(db)
    stored = repo.get_credentials("email")
    if stored:
        config = email_service.config_from_request(
            email_service.merge_with_stored(stored, incoming)
        )
    else:
        config = incoming
    _reject_external_smtp_in_dev(config["smtp_host"])
    try:
        email_service.test_connection(config)
    except ValueError as exc:
        raise BadRequestException(detail=str(exc))
    except Exception as exc:
        logger.exception("SMTP test failed")
        raise BadRequestException(detail=f"SMTP connection failed: {exc}")
    return {"message": "SMTP connection successful"}


@router.post("/email/connect", response_model=EmailStatusResponse)
def connect_email(
    body: EmailConnectRequest,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> EmailStatusResponse:
    incoming = email_service.config_from_request(body.model_dump())
    repo = PublishingChannelRepository(db)
    stored = repo.get_credentials("email")
    if stored:
        config = email_service.config_from_request(
            email_service.merge_with_stored(stored, incoming)
        )
    else:
        config = incoming
    _reject_external_smtp_in_dev(config["smtp_host"])
    try:
        email_service.test_connection(config)
    except ValueError as exc:
        raise BadRequestException(detail=str(exc))
    except Exception as exc:
        logger.exception("SMTP connect failed")
        raise BadRequestException(detail=f"SMTP connection failed: {exc}")

    public = email_service.public_config(config)
    channel = repo.upsert(
        "email",
        status="connected",
        metadata=public,
        credentials=config,
        created_by=admin.id,
    )
    _audit(db, admin.id, "channel_connected", {"channel": "email"})
    return EmailStatusResponse(connected=True, connected_at=channel.connected_at, **public)


@router.get("/email/status", response_model=EmailStatusResponse)
def email_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
) -> EmailStatusResponse:
    repo = PublishingChannelRepository(db)
    channel = repo.get_by_type("email")
    if channel is None or channel.status != "connected":
        return EmailStatusResponse(connected=False)
    meta = repo.public_metadata(channel)
    return EmailStatusResponse(connected=True, connected_at=channel.connected_at, **meta)


@router.post("/email/disconnect")
def disconnect_email(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    repo = PublishingChannelRepository(db)
    repo.disconnect("email")
    _audit(db, admin.id, "channel_disconnected", {"channel": "email"})
    return {"message": "Email channel disconnected"}


@router.get("/linkedin/oauth/url", response_model=LinkedInOAuthUrlResponse)
def linkedin_oauth_url(
    admin: User = Depends(require_admin),
) -> LinkedInOAuthUrlResponse:
    """Return LinkedIn OAuth authorization URL for the admin to sign in."""
    if not settings.LINKEDIN_CLIENT_ID or not settings.LINKEDIN_CLIENT_SECRET:
        raise BadRequestException(
            detail="LinkedIn OAuth is not configured. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET."
        )
    state = create_oauth_state(admin.id)
    return LinkedInOAuthUrlResponse(authorization_url=build_authorization_url(state))


@router.post("/linkedin/connect", response_model=LinkedInStatusResponse)
def connect_linkedin(
    body: LinkedInConnectRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> LinkedInStatusResponse:
    config = linkedin_service.config_from_request(body.model_dump())
    try:
        linkedin_service.test_connection(config)
    except Exception as exc:
        raise BadRequestException(detail=f"LinkedIn connection failed: {exc}")

    repo = PublishingChannelRepository(db)
    public = linkedin_service.public_config(config)
    channel = repo.upsert(
        "linkedin",
        status="connected",
        metadata=public,
        credentials=config,
        created_by=admin.id,
    )
    _audit(db, admin.id, "channel_connected", {"channel": "linkedin"})
    return LinkedInStatusResponse(
        connected=True,
        connected_at=channel.connected_at,
        author_urn=public.get("author_urn"),
        profile_name=public.get("profile_name"),
    )


@router.get("/linkedin/status", response_model=LinkedInStatusResponse)
def linkedin_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst),
) -> LinkedInStatusResponse:
    repo = PublishingChannelRepository(db)
    channel = repo.get_by_type("linkedin")
    if channel is None or channel.status != "connected":
        return LinkedInStatusResponse(connected=False)
    meta = repo.public_metadata(channel)
    return LinkedInStatusResponse(
        connected=True,
        connected_at=channel.connected_at,
        author_urn=meta.get("author_urn"),
        profile_name=meta.get("profile_name"),
    )


@router.post("/linkedin/disconnect")
def disconnect_linkedin(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    repo = PublishingChannelRepository(db)
    repo.disconnect("linkedin")
    _audit(db, admin.id, "channel_disconnected", {"channel": "linkedin"})
    return {"message": "LinkedIn channel disconnected"}
