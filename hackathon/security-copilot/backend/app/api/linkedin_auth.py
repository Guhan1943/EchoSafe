import logging

from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import BadRequestException
from app.database import get_db
from app.models.audit import AuditLog
from app.repositories.publishing_channel import PublishingChannelRepository
from app.services.linkedin_oauth import (
    credentials_from_token_response,
    exchange_code_for_tokens,
    fetch_member_profile,
    verify_oauth_state,
)
from app.services.linkedin_publisher import LinkedInPublisherService

logger = logging.getLogger(__name__)

router = APIRouter()
linkedin_service = LinkedInPublisherService()


@router.get("/linkedin/callback")
def linkedin_oauth_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    """LinkedIn OAuth redirect handler (must match app redirect URI on port 5000)."""
    frontend = settings.FRONTEND_URL.rstrip("/")
    failure_url = f"{frontend}/publishing-channels?linkedin=error"

    if error:
        logger.warning("LinkedIn OAuth error: %s — %s", error, error_description)
        return RedirectResponse(
            url=f"{failure_url}&message={error_description or error}",
            status_code=302,
        )

    if not code or not state:
        return RedirectResponse(url=f"{failure_url}&message=missing_code_or_state", status_code=302)

    user_id = verify_oauth_state(state)
    if user_id is None:
        return RedirectResponse(url=f"{failure_url}&message=invalid_state", status_code=302)

    try:
        token_data = exchange_code_for_tokens(code)
        profile = fetch_member_profile(token_data["access_token"])
        credentials = credentials_from_token_response(token_data, profile)
        linkedin_service.test_connection(credentials)

        repo = PublishingChannelRepository(db)
        public = linkedin_service.public_config(credentials)
        repo.upsert(
            "linkedin",
            status="connected",
            metadata=public,
            credentials=credentials,
            created_by=user_id,
        )
        db.add(
            AuditLog(
                user_id=user_id,
                action="channel_connected",
                resource_type="publishing_channel",
                resource_id=None,
                details={"channel": "linkedin", "method": "oauth", "author_urn": public.get("author_urn")},
            )
        )
        db.commit()
    except Exception as exc:
        logger.exception("LinkedIn OAuth callback failed")
        return RedirectResponse(
            url=f"{failure_url}&message={str(exc)[:200]}",
            status_code=302,
        )

    return RedirectResponse(url=f"{frontend}/publishing-channels?linkedin=success", status_code=302)
