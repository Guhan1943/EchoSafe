"""
Phase 2 — Threat Collection Service.

Orchestrates all source adapters, runs the pipeline, returns metrics.
"""

import asyncio
import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.adapters.base import ADAPTER_REGISTRY, BaseSourceAdapter
from app.adapters.cisa import CISAAdapter
from app.adapters.cert_feed import CERTFeedAdapter
from app.adapters.github_advisory import GitHubAdvisoryAdapter
from app.adapters.nvd_cve import NVDCVEAdapter
from app.config import settings as app_settings
from app.services.threat_pipeline import ThreatPipelineService

logger = logging.getLogger(__name__)

# ── Registry of adapters to run ───────────────────────────────────────────────

ACTIVE_ADAPTERS: list[type[BaseSourceAdapter]] = [
    GitHubAdvisoryAdapter,
    NVDCVEAdapter,
    CISAAdapter,
    CERTFeedAdapter,
]


class ThreatCollectionService:
    def __init__(self, db: Session):
        self.db = db
        self._pipeline = ThreatPipelineService(
            db=db,
            openai_api_key=app_settings.OPENAI_API_KEY,
            openai_model=app_settings.OPENAI_MODEL,
        )

    def collect_all(self, adapter_names: list[str] | None = None) -> dict:
        """
        Run all (or selected) adapters synchronously.
        Returns aggregate statistics.
        """
        return asyncio.run(self._collect_all_async(adapter_names))

    async def _collect_all_async(self, adapter_names: list[str] | None = None) -> dict:
        adapters_to_run = ACTIVE_ADAPTERS
        if adapter_names:
            adapters_to_run = [a for a in ACTIVE_ADAPTERS if a.adapter_name in adapter_names]

        results = await asyncio.gather(
            *[self._run_adapter(cls) for cls in adapters_to_run],
            return_exceptions=True,
        )

        summary: dict = {
            "started_at": datetime.utcnow().isoformat(),
            "adapters": [],
            "total_collected": 0,
            "total_inserted": 0,
            "total_duplicates": 0,
            "total_errors": 0,
        }

        for cls, result in zip(adapters_to_run, results):
            if isinstance(result, Exception):
                summary["adapters"].append({
                    "adapter": cls.adapter_name,
                    "error": str(result),
                    "collected": 0,
                    "inserted": 0,
                })
                summary["total_errors"] += 1
            else:
                summary["adapters"].append(result)
                summary["total_collected"] += result.get("collected", 0)
                summary["total_inserted"] += result.get("inserted", 0)
                summary["total_duplicates"] += result.get("duplicates", 0)
                summary["total_errors"] += result.get("errors", 0)

        summary["finished_at"] = datetime.utcnow().isoformat()
        return summary

    async def _run_adapter(self, adapter_cls: type[BaseSourceAdapter]) -> dict:
        adapter = adapter_cls()
        try:
            events = await adapter.collect()
            if not events:
                return {
                    "adapter": adapter_cls.adapter_name,
                    "collected": 0,
                    "inserted": 0,
                    "duplicates": 0,
                    "errors": 0,
                    "health": adapter.health.to_dict(),
                }
            stats = self._pipeline.process_batch(events)
            return {
                "adapter": adapter_cls.adapter_name,
                "collected": len(events),
                "inserted": stats["inserted"],
                "duplicates": stats["duplicates"],
                "errors": stats["errors"],
                "health": adapter.health.to_dict(),
            }
        except Exception as exc:
            logger.error("Adapter %s failed: %s", adapter_cls.adapter_name, exc, exc_info=True)
            adapter.health.record_failure(str(exc))
            raise

    async def health_check_all(self) -> list[dict]:
        """Return health status for all adapters."""
        checks = await asyncio.gather(
            *[cls().health_check() for cls in ACTIVE_ADAPTERS],
            return_exceptions=True,
        )
        results = []
        for cls, result in zip(ACTIVE_ADAPTERS, checks):
            if isinstance(result, Exception):
                results.append({"adapter": cls.adapter_name, "healthy": False, "error": str(result)})
            else:
                results.append(result)
        return results
