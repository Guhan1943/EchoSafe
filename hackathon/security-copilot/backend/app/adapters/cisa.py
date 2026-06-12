"""
CISA Known Exploited Vulnerabilities (KEV) adapter.

Full catalog endpoint:
  https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
"""

import logging
from typing import Optional

from app.adapters.base import BaseSourceAdapter, NormalizedEvent, register_adapter

logger = logging.getLogger(__name__)

_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"


@register_adapter("cisa")
class CISAAdapter(BaseSourceAdapter):
    adapter_name = "cisa"
    source_type = "kev_alert"
    timeout = 30.0

    async def fetch(self) -> list[dict]:
        """Download the full KEV catalog (returns all ~1000 entries)."""
        try:
            data = await self._get(_KEV_URL)
            return data.get("vulnerabilities", [])
        except Exception as exc:
            logger.warning("CISA: fetch failed — %s", exc)
            return []

    def _normalize_item(self, raw: dict) -> Optional[NormalizedEvent]:
        cve_id = raw.get("cveID") or ""
        if not cve_id:
            return None

        vendor = raw.get("vendorProject") or ""
        product = raw.get("product") or ""
        name = raw.get("vulnerabilityName") or cve_id
        description = raw.get("shortDescription") or name
        required_action = raw.get("requiredAction") or ""
        date_added = raw.get("dateAdded") or ""

        title = f"[CISA KEV] {name}"
        if vendor and product:
            title = f"[CISA KEV] {vendor} {product} — {name}"

        full_description = description
        if required_action:
            full_description += f"\n\nRequired Action: {required_action}"

        url = f"https://www.cisa.gov/known-exploited-vulnerabilities-catalog"

        return NormalizedEvent.build(
            id=f"cisa:{cve_id}:{date_added}",
            source="cisa",
            source_type=self.source_type,
            title=title,
            description=full_description,
            url=url,
            published_at=date_added,
            severity="high",  # all KEV entries are actively exploited → at least high
            cves=[cve_id],
            raw_payload=raw,
        )

    async def validate(self) -> bool:
        try:
            await self._get(_KEV_URL)
            return True
        except Exception:
            return False
