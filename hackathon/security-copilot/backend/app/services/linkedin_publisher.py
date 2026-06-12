import logging
import re
from typing import Any

import httpx

from app.services.article_image import download_image
from app.services.linkedin_oauth import ensure_fresh_credentials

logger = logging.getLogger(__name__)

LINKEDIN_POSTS_URL = "https://api.linkedin.com/rest/posts"
LINKEDIN_IMAGES_URL = "https://api.linkedin.com/rest/images?action=initializeUpload"
LINKEDIN_VERSION = "202410"
REST_HEADERS_BASE = {
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": LINKEDIN_VERSION,
}


class LinkedInPublisherService:
    def test_connection(self, config: dict[str, Any]) -> None:
        config = ensure_fresh_credentials(config)
        token = config["access_token"]
        headers = {**REST_HEADERS_BASE, "Authorization": f"Bearer {token}"}
        with httpx.Client(timeout=15) as client:
            resp = client.get("https://api.linkedin.com/v2/userinfo", headers=headers)
            if resp.status_code >= 400:
                raise ValueError(f"LinkedIn token validation failed: {resp.text[:200]}")

    def publish(
        self,
        config: dict[str, Any],
        *,
        text: str,
        title: str | None = None,
        image_url: str | None = None,
    ) -> str:
        config = ensure_fresh_credentials(config)
        token = config["access_token"]
        author_urn = config["author_urn"]
        share_text = self._format_post_text(text, title)
        headers = {**REST_HEADERS_BASE, "Authorization": f"Bearer {token}"}

        payload: dict[str, Any] = {
            "author": author_urn,
            "commentary": share_text,
            "visibility": "PUBLIC",
            "distribution": {
                "feedDistribution": "MAIN_FEED",
                "targetEntities": [],
                "thirdPartyDistributionChannels": [],
            },
            "lifecycleState": "PUBLISHED",
            "isReshareDisabledByAuthor": False,
        }

        if image_url:
            image_urn = self._upload_image(token, author_urn, image_url)
            payload["content"] = {
                "media": {
                    "title": (title or "Security Intelligence")[:200],
                    "id": image_urn,
                }
            }
            logger.info("LinkedIn post will include image: %s", image_url[:120])

        with httpx.Client(timeout=90) as client:
            resp = client.post(LINKEDIN_POSTS_URL, json=payload, headers=headers)
            if resp.status_code >= 400:
                logger.error("LinkedIn publish failed: %s", resp.text)
                raise ValueError(f"LinkedIn publish failed: {resp.text[:300]}")
            post_id = resp.headers.get("x-restli-id") or "posted"
            if image_url:
                return f"LinkedIn post with image created: {post_id}"
            return f"LinkedIn post created: {post_id}"

    def _upload_image(self, token: str, author_urn: str, image_url: str) -> str:
        headers = {**REST_HEADERS_BASE, "Authorization": f"Bearer {token}"}
        init_payload = {
            "initializeUploadRequest": {
                "owner": author_urn,
            }
        }

        image_bytes, content_type = download_image(image_url)

        with httpx.Client(timeout=90, follow_redirects=True) as client:
            init = client.post(LINKEDIN_IMAGES_URL, json=init_payload, headers=headers)
            if init.status_code >= 400:
                logger.error("LinkedIn image init failed: %s", init.text)
                raise ValueError(f"LinkedIn image init failed: {init.text[:300]}")

            init_data = init.json()["value"]
            upload_url = init_data["uploadUrl"]
            image_urn = init_data["image"]

            upload_headers = {"Content-Type": content_type}
            up = client.put(upload_url, content=image_bytes, headers=upload_headers)
            if up.status_code >= 400:
                logger.error("LinkedIn image upload failed: %s", up.text)
                raise ValueError(f"LinkedIn image upload failed: {up.text[:300]}")

            logger.info("LinkedIn image uploaded: %s (%d bytes)", image_urn, len(image_bytes))
            return image_urn

    @staticmethod
    def _format_post_text(text: str, title: str | None) -> str:
        cleaned = text.strip()
        cleaned = re.sub(r"^LinkedIn Post:\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"^#+\s*", "", cleaned)
        if title and cleaned.lower().startswith(title.lower()):
            cleaned = cleaned[len(title) :].lstrip(":-\n ")
        return cleaned[:2800]

    @staticmethod
    def config_from_request(data: dict[str, Any]) -> dict[str, Any]:
        return {
            "access_token": data["access_token"],
            "author_urn": data["author_urn"],
            "refresh_token": data.get("refresh_token"),
            "expires_at": data.get("expires_at"),
            "profile_name": data.get("profile_name"),
        }

    @staticmethod
    def public_config(config: dict[str, Any]) -> dict[str, Any]:
        return {
            "author_urn": config.get("author_urn"),
            "profile_name": config.get("profile_name"),
        }
