import logging
from datetime import datetime, timedelta
from typing import Any
from urllib.parse import urlencode

import httpx

from app.config import settings
from app.core.security import create_access_token, verify_token

logger = logging.getLogger(__name__)

LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo"
LINKEDIN_SCOPES = "openid profile w_member_social"


def create_oauth_state(user_id: int) -> str:
    return create_access_token(
        {"sub": str(user_id), "purpose": "linkedin_oauth"},
        expires_delta=timedelta(minutes=15),
    )


def verify_oauth_state(state: str) -> int | None:
    payload = verify_token(state)
    if payload is None or payload.get("purpose") != "linkedin_oauth":
        return None
    try:
        return int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        return None


def build_authorization_url(state: str) -> str:
    params = {
        "response_type": "code",
        "client_id": settings.LINKEDIN_CLIENT_ID,
        "redirect_uri": settings.LINKEDIN_REDIRECT_URI,
        "scope": LINKEDIN_SCOPES,
        "state": state,
    }
    return f"{LINKEDIN_AUTH_URL}?{urlencode(params)}"


def exchange_code_for_tokens(code: str) -> dict[str, Any]:
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.LINKEDIN_REDIRECT_URI,
        "client_id": settings.LINKEDIN_CLIENT_ID,
        "client_secret": settings.LINKEDIN_CLIENT_SECRET,
    }
    with httpx.Client(timeout=30) as client:
        resp = client.post(
            LINKEDIN_TOKEN_URL,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if resp.status_code >= 400:
            logger.error("LinkedIn token exchange failed: %s", resp.text)
            raise ValueError(f"LinkedIn token exchange failed: {resp.text[:300]}")
        return resp.json()


def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": settings.LINKEDIN_CLIENT_ID,
        "client_secret": settings.LINKEDIN_CLIENT_SECRET,
    }
    with httpx.Client(timeout=30) as client:
        resp = client.post(
            LINKEDIN_TOKEN_URL,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if resp.status_code >= 400:
            logger.error("LinkedIn token refresh failed: %s", resp.text)
            raise ValueError(f"LinkedIn token refresh failed: {resp.text[:300]}")
        return resp.json()


def fetch_member_profile(access_token: str) -> dict[str, Any]:
    headers = {"Authorization": f"Bearer {access_token}"}
    with httpx.Client(timeout=15) as client:
        resp = client.get(LINKEDIN_USERINFO_URL, headers=headers)
        if resp.status_code >= 400:
            logger.error("LinkedIn userinfo failed: %s", resp.text)
            raise ValueError(f"LinkedIn profile fetch failed: {resp.text[:300]}")
        return resp.json()


def credentials_from_token_response(
    token_data: dict[str, Any], profile: dict[str, Any]
) -> dict[str, Any]:
    member_id = profile.get("sub")
    if not member_id:
        raise ValueError("LinkedIn profile did not include member id (sub).")

    expires_in = int(token_data.get("expires_in", 5184000))
    expires_at = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat()

    return {
        "access_token": token_data["access_token"],
        "refresh_token": token_data.get("refresh_token"),
        "expires_at": expires_at,
        "author_urn": f"urn:li:person:{member_id}",
        "profile_name": profile.get("name"),
    }


def apply_token_refresh(config: dict[str, Any], token_data: dict[str, Any]) -> dict[str, Any]:
    expires_in = int(token_data.get("expires_in", 5184000))
    expires_at = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat()
    updated = {
        **config,
        "access_token": token_data["access_token"],
        "expires_at": expires_at,
    }
    if token_data.get("refresh_token"):
        updated["refresh_token"] = token_data["refresh_token"]
    return updated


def ensure_fresh_credentials(config: dict[str, Any]) -> dict[str, Any]:
    """Return config with a valid access_token, refreshing if needed."""
    expires_at_raw = config.get("expires_at")
    refresh_token = config.get("refresh_token")

    if expires_at_raw and refresh_token:
        try:
            expires_at = datetime.fromisoformat(expires_at_raw)
            if expires_at <= datetime.utcnow() + timedelta(minutes=5):
                token_data = refresh_access_token(refresh_token)
                return apply_token_refresh(config, token_data)
        except ValueError:
            logger.warning("Could not refresh LinkedIn token; using existing access token")

    return config


def _profile_from_config(config: dict[str, Any]) -> dict[str, Any]:
    urn = config.get("author_urn", "")
    member_id = urn.split(":")[-1] if urn else ""
    return {"sub": member_id, "name": config.get("profile_name")}
