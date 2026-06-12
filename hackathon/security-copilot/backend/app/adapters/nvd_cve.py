"""
NVD CVE adapter.

Fetches recent CVEs from https://services.nvd.nist.gov/rest/json/cves/2.0
Supports optional NVD_API_KEY for higher rate limits (50 req/30s vs 5 req/30s).
"""

import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.adapters.base import BaseSourceAdapter, NormalizedEvent, register_adapter

logger = logging.getLogger(__name__)

SEVERITY_MAP = {
    "CRITICAL": "critical",
    "HIGH": "high",
    "MEDIUM": "medium",
    "LOW": "low",
    "NONE": "low",
}


@register_adapter("nvd_cve")
class NVDCVEAdapter(BaseSourceAdapter):
    adapter_name = "nvd_cve"
    source_type = "cve"
    page_size = 2000        # NVD max results per page
    timeout = 60.0          # NVD can be slow
    base_delay = 6.0        # NVD rate limit: 5 req/30s unauthenticated → 6s gap is safe

    _BASE_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"

    async def fetch(self) -> list[dict]:
        """Fetch CVEs published in the last N days (default 7)."""
        days_back = self.config.get("days_back", 7)
        end_dt = datetime.now(timezone.utc)
        start_dt = end_dt - timedelta(days=days_back)

        # NVD requires format: 2024-01-01T00:00:00.000 (no timezone suffix)
        fmt = "%Y-%m-%dT%H:%M:%S.000"
        params: dict = {
            "pubStartDate": start_dt.strftime(fmt),
            "pubEndDate": end_dt.strftime(fmt),
            "resultsPerPage": self.page_size,
            "startIndex": 0,
        }

        api_key = self.config.get("nvd_api_key") or ""
        headers_extra: dict = {}
        if api_key:
            headers_extra["apiKey"] = api_key

        results: list[dict] = []
        while True:
            try:
                data = await self._get(self._BASE_URL, params=params)
            except Exception as exc:
                logger.warning("NVD: fetch failed at index %d — %s", params["startIndex"], exc)
                break

            vulnerabilities = data.get("vulnerabilities", [])
            results.extend(vulnerabilities)

            total = data.get("totalResults", 0)
            next_index = params["startIndex"] + len(vulnerabilities)
            if next_index >= total or not vulnerabilities:
                break
            params["startIndex"] = next_index

        return results

    def _normalize_item(self, raw: dict) -> Optional[NormalizedEvent]:
        cve_data = raw.get("cve", {})
        cve_id = cve_data.get("id") or ""
        if not cve_id:
            return None

        # Extract English description
        descriptions = cve_data.get("descriptions", [])
        description = next(
            (d["value"] for d in descriptions if d.get("lang") == "en"),
            "",
        )

        # Extract CVSS severity (prefer v3.1 > v3.0 > v2)
        severity = None
        metrics = cve_data.get("metrics", {})
        for key in ("cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
            metric_list = metrics.get(key, [])
            if metric_list:
                base = metric_list[0].get("cvssData", {})
                sev_raw = base.get("baseSeverity") or base.get("severity") or ""
                severity = SEVERITY_MAP.get(sev_raw.upper())
                if severity:
                    break

        published = cve_data.get("published") or ""
        url = f"https://nvd.nist.gov/vuln/detail/{cve_id}"

        # References
        refs = [r.get("url", "") for r in cve_data.get("references", [])]

        return NormalizedEvent.build(
            id=f"nvd:{cve_id}",
            source="nvd_cve",
            source_type=self.source_type,
            title=cve_id,
            description=description or f"CVE record {cve_id}",
            url=url,
            published_at=published,
            severity=severity,
            cves=[cve_id],
            raw_payload={
                "cve_id": cve_id,
                "description": description,
                "references": refs[:10],  # cap stored refs
                "metrics": metrics,
            },
        )

    async def validate(self) -> bool:
        try:
            await self._get(self._BASE_URL, params={"resultsPerPage": 1, "startIndex": 0})
            return True
        except Exception:
            return False
