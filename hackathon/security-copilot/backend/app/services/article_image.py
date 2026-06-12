"""Fetch cover/thumbnail images from article URLs and RSS entries."""

from __future__ import annotations

import logging
import re
from html import unescape
from typing import Any, Optional
from urllib.parse import urljoin, urlparse

import httpx

logger = logging.getLogger(__name__)

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

OG_IMAGE_PATTERNS = [
    re.compile(
        r'<meta[^>]+property=["\']og:image(?::secure_url)?["\'][^>]+content=["\']([^"\']+)["\']',
        re.IGNORECASE,
    ),
    re.compile(
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image(?::secure_url)?["\']',
        re.IGNORECASE,
    ),
    re.compile(
        r'<meta[^>]+name=["\']twitter:image(?::src)?["\'][^>]+content=["\']([^"\']+)["\']',
        re.IGNORECASE,
    ),
    re.compile(
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']twitter:image(?::src)?["\']',
        re.IGNORECASE,
    ),
]


def extract_image_from_html(html: str, page_url: str = "") -> Optional[str]:
    for pattern in OG_IMAGE_PATTERNS:
        match = pattern.search(html)
        if match:
            return _normalize_url(unescape(match.group(1).strip()), page_url)
    return None


def extract_image_from_rss_entry(entry: Any) -> Optional[str]:
    if hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
        url = entry.media_thumbnail[0].get("url")
        if url:
            return url

    if hasattr(entry, "media_content") and entry.media_content:
        for item in entry.media_content:
            item_type = (item.get("type") or "").lower()
            if "image" in item_type or item.get("medium") == "image":
                url = item.get("url")
                if url:
                    return url

    if hasattr(entry, "links"):
        for link in entry.links:
            link_type = (link.get("type") or link.get("rel") or "").lower()
            if "image" in link_type:
                href = link.get("href")
                if href:
                    return href

    if hasattr(entry, "summary") and entry.summary:
        img = _first_img_src(entry.summary, getattr(entry, "link", "") or "")
        if img:
            return img

    return None


def fetch_image_from_url(article_url: str, timeout: float = 15.0) -> Optional[str]:
    if not article_url:
        return None
    try:
        with httpx.Client(follow_redirects=True, timeout=timeout, headers=BROWSER_HEADERS) as client:
            response = client.get(article_url)
            if response.status_code >= 400:
                logger.warning("Image fetch HTTP %s for %s", response.status_code, article_url)
                return None
            return extract_image_from_html(response.text, article_url)
    except Exception as exc:
        logger.warning("Failed to fetch image from %s: %s", article_url, exc)
        return None


def download_image(url: str, timeout: float = 30.0) -> tuple[bytes, str]:
    """Download image bytes from a URL (uses browser-like headers for CDNs)."""
    if not url:
        raise ValueError("Image URL is empty")
    with httpx.Client(follow_redirects=True, timeout=timeout, headers=BROWSER_HEADERS) as client:
        response = client.get(url)
        if response.status_code >= 400:
            raise ValueError(f"Could not download image ({response.status_code}): {url}")
        content_type = (response.headers.get("content-type") or "image/jpeg").split(";")[0].strip()
        if not content_type.startswith("image/"):
            content_type = "image/jpeg"
        if len(response.content) < 100:
            raise ValueError(f"Downloaded image too small or empty: {url}")
        return response.content, content_type


def resolve_article_image(
    article_url: str,
    existing_image_url: Optional[str] = None,
    rss_entry: Any = None,
) -> Optional[str]:
    if existing_image_url:
        return existing_image_url

    if rss_entry is not None:
        rss_image = extract_image_from_rss_entry(rss_entry)
        if rss_image:
            return rss_image

    return fetch_image_from_url(article_url)


def _first_img_src(html: str, base_url: str) -> Optional[str]:
    match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', html, re.IGNORECASE)
    if not match:
        return None
    return _normalize_url(unescape(match.group(1).strip()), base_url)


def _normalize_url(url: str, base_url: str = "") -> str:
    url = url.strip()
    if url.startswith("//"):
        return f"https:{url}"
    if url.startswith("/") and base_url:
        parsed = urlparse(base_url)
        return f"{parsed.scheme}://{parsed.netloc}{url}"
    if not urlparse(url).scheme and base_url:
        return urljoin(base_url, url)
    return url
