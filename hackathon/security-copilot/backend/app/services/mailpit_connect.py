import logging
import time
from typing import Optional

from sqlalchemy.orm import Session

from app.repositories.publishing_channel import PublishingChannelRepository
from app.services.email_publisher import EmailPublisherService
from app.services.mailpit_config import DEV_MAILPIT_CONFIG, dev_mailpit_unavailable_message

logger = logging.getLogger(__name__)


def connect_mailpit_channel(
    db: Session,
    created_by: Optional[int] = None,
    *,
    retries: int = 3,
    retry_delay_seconds: float = 2.0,
) -> dict:
    """Connect the email channel to local Mailpit. Returns public config dict."""
    service = EmailPublisherService()
    config = dict(DEV_MAILPIT_CONFIG)
    last_error: Exception | None = None

    for attempt in range(1, retries + 1):
        try:
            service.test_connection(config)
            last_error = None
            break
        except Exception as exc:
            last_error = exc
            if attempt < retries:
                logger.warning(
                    "Mailpit not ready (attempt %s/%s): %s",
                    attempt,
                    retries,
                    exc,
                )
                time.sleep(retry_delay_seconds)

    if last_error is not None:
        raise ValueError(f"{dev_mailpit_unavailable_message()} ({last_error})")

    repo = PublishingChannelRepository(db)
    public = service.public_config(config)
    repo.upsert(
        "email",
        status="connected",
        metadata=public,
        credentials=config,
        created_by=created_by,
    )
    logger.info("Connected Mailpit SMTP (view mail at http://localhost:8025)")
    return public
