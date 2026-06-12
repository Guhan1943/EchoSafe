"""
GitHub Security Advisory adapter.

Fetches from https://api.github.com/advisories (GHSA database).
Supports optional GitHub token for higher rate limits (5000/h vs 60/h).
"""

import logging
import re
from typing import Optional

from app.adapters.base import BaseSourceAdapter, NormalizedEvent, register_adapter

logger = logging.getLogger(__name__)

CVE_PATTERN = re.compile(r"CVE-\d{4}-\d+", re.IGNORECASE)

SEVERITY_MAP = {
    "critical": "critical",
    "high": "high",
    "moderate": "medium",
    "medium": "medium",
    "low": "low",
    "unknown": None,
}


@register_adapter("github_advisory")
class GitHubAdvisoryAdapter(BaseSourceAdapter):
    adapter_name = "github_advisory"
    source_type = "advisory"
    page_size = 100

    # GitHub REST API for global advisories
    _BASE_URL = "https://api.github.com/advisories"

    async def fetch(self) -> list[dict]:
        """Fetch recent security advisories from GitHub (paginated, max 3 pages)."""
        results: list[dict] = []
        page = 1
        max_pages = self.config.get("max_pages", 3)

        while page <= max_pages:
            params = {
                "per_page": self.page_size,
                "page": page,
                "sort": "updated",
                "direction": "desc",
                "type": "reviewed",  # only curated advisories
            }
            try:
                data = await self._get(self._BASE_URL, params=params)
                if not data:
                    break
                results.extend(data)
                if len(data) < self.page_size:
                    break
                page += 1
            except Exception as exc:
                logger.warning("GitHubAdvisory: page %d fetch failed — %s", page, exc)
                break

        return results

    def _normalize_item(self, raw: dict) -> Optional[NormalizedEvent]:
        ghsa_id = raw.get("ghsa_id") or raw.get("id") or ""
        if not ghsa_id:
            return None

        summary = raw.get("summary") or ""
        description = raw.get("description") or summary

        # Extract CVEs from identifiers list
        cves: list[str] = []
        for ident in raw.get("identifiers", []):
            if ident.get("type") == "CVE":
                cves.append(ident["value"].upper())
        # Also scan text
        for match in CVE_PATTERN.findall(f"{summary} {description}"):
            upper = match.upper()
            if upper not in cves:
                cves.append(upper)

        severity_raw = (raw.get("severity") or "").lower()
        severity = SEVERITY_MAP.get(severity_raw)

        published = raw.get("published_at") or ""
        url = raw.get("html_url") or f"https://github.com/advisories/{ghsa_id}"

        return NormalizedEvent.build(
            id=f"github:{ghsa_id}",
            source="github_advisory",
            source_type=self.source_type,
            title=summary or f"GitHub Advisory {ghsa_id}",
            description=description,
            url=url,
            published_at=published,
            severity=severity,
            cves=cves,
            raw_payload=raw,
        )

    async def validate(self) -> bool:
        try:
            await self._get("https://api.github.com/rate_limit")
            return True
        except Exception:
            return False
