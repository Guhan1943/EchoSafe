"""
CERT/CC Vulnerability Notes adapter.

Uses the CERT/CC Atom feed:
  https://kb.cert.org/vuls/atomfeed/

Parsed with the standard `feedparser` library (already in requirements).
"""

import logging
import re
from datetime import datetime, timezone
from typing import Optional

import feedparser  # already a dependency

from app.adapters.base import BaseSourceAdapter, NormalizedEvent, register_adapter

logger = logging.getLogger(__name__)

CVE_PATTERN = re.compile(r"CVE-\d{4}-\d+", re.IGNORECASE)
_ATOM_URL = "https://kb.cert.org/vuls/atomfeed/"


@register_adapter("cert_feed")
class CERTFeedAdapter(BaseSourceAdapter):
    adapter_name = "cert_feed"
    source_type = "vulnerability_note"
    timeout = 30.0

    async def fetch(self) -> list[dict]:
        """
        feedparser is synchronous. We call it directly; for async purity we
        could run it in a thread-pool, but for the MVP the overhead is acceptable
        given the small number of CERT/CC entries (~20/day).
        """
        try:
            feed = feedparser.parse(_ATOM_URL)
            if feed.bozo and not feed.entries:
                logger.warning("CERT: feedparser reported error: %s", feed.bozo_exception)
                return []
            return list(feed.entries)
        except Exception as exc:
            logger.warning("CERT: feed parse failed — %s", exc)
            return []

    def _normalize_item(self, raw) -> Optional[NormalizedEvent]:  # type: ignore[override]
        # feedparser returns FeedParserDict entries
        entry_id = getattr(raw, "id", None) or getattr(raw, "link", None) or ""
        if not entry_id:
            return None

        title = getattr(raw, "title", "") or ""
        summary = getattr(raw, "summary", "") or ""
        link = getattr(raw, "link", "") or ""

        # Extract CVEs from title + summary
        combined = f"{title} {summary}"
        cves = list(dict.fromkeys(m.upper() for m in CVE_PATTERN.findall(combined)))

        # Parse published date
        published_at = ""
        published_parsed = getattr(raw, "published_parsed", None)
        if published_parsed:
            try:
                dt = datetime(*published_parsed[:6], tzinfo=timezone.utc)
                published_at = dt.isoformat()
            except Exception:
                pass

        # Derive a stable ID from the entry link / VU# number
        vu_match = re.search(r"VU#?(\d+)", combined, re.IGNORECASE)
        stable_id = f"cert:VU#{vu_match.group(1)}" if vu_match else f"cert:{abs(hash(entry_id)) % 10**9}"

        return NormalizedEvent.build(
            id=stable_id,
            source="cert_feed",
            source_type=self.source_type,
            title=title or "CERT/CC Vulnerability Note",
            description=summary or title,
            url=link,
            published_at=published_at,
            severity=None,  # CERT feed doesn't include severity
            cves=cves,
            raw_payload={"id": entry_id, "title": title, "summary": summary, "link": link},
        )

    async def validate(self) -> bool:
        try:
            feed = feedparser.parse(_ATOM_URL)
            return not feed.bozo or bool(feed.entries)
        except Exception:
            return False
