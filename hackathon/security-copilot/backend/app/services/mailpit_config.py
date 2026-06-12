"""Local Mailpit SMTP config for development."""

from typing import Any

DEV_MAILPIT_CONFIG: dict[str, Any] = {
    "smtp_host": "mailpit",
    "smtp_port": 1025,
    "username": "",
    "password": "",
    "sender_email": "security@localhost",
    "sender_name": "Security Intelligence",
    "encryption": "NONE",
}

EXTERNAL_SMTP_HOSTS = (
    "gmail.com",
    "googlemail.com",
    "office365.com",
    "outlook.com",
    "live.com",
    "yahoo.com",
)


def is_external_smtp_host(host: str) -> bool:
    host_lower = host.strip().lower()
    return any(domain in host_lower for domain in EXTERNAL_SMTP_HOSTS)


def dev_mailpit_unavailable_message() -> str:
    return (
        "Mailpit is not running. Restart with: docker compose up --build "
        "(Mailpit must be running for local email)."
    )
