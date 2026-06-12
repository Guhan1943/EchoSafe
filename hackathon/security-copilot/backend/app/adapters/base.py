"""
Base source adapter contract for the CTI collection pipeline.

Every adapter must:
  1. implement fetch() to retrieve raw data from its source
  2. implement normalize() to convert raw items to NormalizedEvent dicts
  3. optionally override validate() and health_check()

Retry logic (exponential backoff) lives here so all adapters inherit it.
"""

import asyncio
import logging
import time
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

ADAPTER_REGISTRY: dict[str, type["BaseSourceAdapter"]] = {}


def register_adapter(name: str):
    """Class decorator that registers an adapter by name."""
    def decorator(cls: type["BaseSourceAdapter"]):
        ADAPTER_REGISTRY[name] = cls
        return cls
    return decorator


# ── Normalized event contract ────────────────────────────────────────────────

class NormalizedEvent(dict):
    """
    Dict subclass so it can be serialised directly while still offering
    typed construction with validation.
    """

    REQUIRED = {"id", "source", "source_type", "title", "description", "url"}

    @classmethod
    def build(
        cls,
        *,
        id: str,
        source: str,
        source_type: str,
        title: str,
        description: str,
        url: str,
        author: Optional[str] = None,
        published_at: Optional[str] = None,
        collected_at: Optional[str] = None,
        raw_payload: Optional[dict] = None,
        severity: Optional[str] = None,
        cves: Optional[list[str]] = None,
    ) -> "NormalizedEvent":
        obj = cls(
            id=id,
            source=source,
            source_type=source_type,
            title=title,
            description=description,
            url=url,
            author=author or "",
            published_at=published_at or "",
            collected_at=collected_at or datetime.now(timezone.utc).isoformat(),
            raw_payload=raw_payload or {},
            severity=severity,
            cves=cves or [],
        )
        return obj

    def is_valid(self) -> bool:
        return all(self.get(k) for k in self.REQUIRED)


# ── Adapter health record ────────────────────────────────────────────────────

class AdapterHealth:
    def __init__(self, name: str):
        self.name = name
        self.last_run: Optional[datetime] = None
        self.last_success: Optional[datetime] = None
        self.consecutive_failures: int = 0
        self.total_fetched: int = 0
        self.total_errors: int = 0
        self.last_error: Optional[str] = None

    def record_success(self, fetched: int) -> None:
        self.last_run = datetime.now(timezone.utc)
        self.last_success = self.last_run
        self.consecutive_failures = 0
        self.total_fetched += fetched

    def record_failure(self, error: str) -> None:
        self.last_run = datetime.now(timezone.utc)
        self.consecutive_failures += 1
        self.total_errors += 1
        self.last_error = error

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "last_success": self.last_success.isoformat() if self.last_success else None,
            "consecutive_failures": self.consecutive_failures,
            "total_fetched": self.total_fetched,
            "total_errors": self.total_errors,
            "last_error": self.last_error,
            "healthy": self.consecutive_failures < 3,
        }


# ── Base adapter ─────────────────────────────────────────────────────────────

class BaseSourceAdapter(ABC):
    """Abstract base for all CTI source adapters."""

    #: Human-readable adapter identifier  (e.g. "nvd_cve")
    adapter_name: str = "base"
    #: Source type label stored on each event
    source_type: str = "generic"
    #: How many items to request per page / call
    page_size: int = 100
    #: Request timeout in seconds
    timeout: float = 30.0
    #: Maximum retry attempts on transient failures
    max_retries: int = 3
    #: Base delay (seconds) for exponential backoff
    base_delay: float = 1.0

    def __init__(self, config: Optional[dict] = None):
        self.config = config or {}
        self.health = AdapterHealth(self.adapter_name)
        self._client: Optional[httpx.AsyncClient] = None

    # ── HTTP helpers ──────────────────────────────────────────────────────────

    def _build_client(self) -> httpx.AsyncClient:
        headers = {"Accept": "application/json", "User-Agent": "SecurityCopilot-CTI/1.0"}
        token = self.config.get("github_token") or self.config.get("token")
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return httpx.AsyncClient(timeout=self.timeout, headers=headers, follow_redirects=True)

    async def _get(self, url: str, params: Optional[dict] = None) -> Any:
        """GET with exponential backoff retry."""
        delay = self.base_delay
        for attempt in range(1, self.max_retries + 1):
            try:
                async with self._build_client() as client:
                    resp = client.build_request("GET", url, params=params)
                    response = await client.send(resp)
                    if response.status_code == 429:
                        retry_after = int(response.headers.get("Retry-After", delay * 2))
                        logger.warning("%s: rate-limited, waiting %ds", self.adapter_name, retry_after)
                        await asyncio.sleep(retry_after)
                        continue
                    response.raise_for_status()
                    return response.json()
            except httpx.HTTPStatusError as exc:
                logger.warning(
                    "%s: HTTP %d on attempt %d/%d — %s",
                    self.adapter_name, exc.response.status_code, attempt, self.max_retries, url,
                )
                if exc.response.status_code < 500:
                    raise
            except (httpx.RequestError, Exception) as exc:
                logger.warning(
                    "%s: request error on attempt %d/%d — %s",
                    self.adapter_name, attempt, self.max_retries, exc,
                )
            if attempt < self.max_retries:
                await asyncio.sleep(delay)
                delay = min(delay * 2, 60.0)
        raise RuntimeError(f"{self.adapter_name}: all {self.max_retries} attempts failed for {url}")

    # ── Public interface ──────────────────────────────────────────────────────

    @abstractmethod
    async def fetch(self) -> list[dict]:
        """Retrieve raw items from the source. Must return a list of raw dicts."""

    def normalize(self, raw_items: list[dict]) -> list[NormalizedEvent]:
        """Normalize raw items. Subclasses must implement _normalize_item."""
        results: list[NormalizedEvent] = []
        for item in raw_items:
            try:
                event = self._normalize_item(item)
                if event and event.is_valid():
                    results.append(event)
            except Exception as exc:
                logger.debug("%s: normalization error — %s", self.adapter_name, exc)
        return results

    @abstractmethod
    def _normalize_item(self, raw: dict) -> Optional[NormalizedEvent]:
        """Convert a single raw dict to a NormalizedEvent."""

    async def validate(self) -> bool:
        """Optional: validate that the source is reachable. Returns True/False."""
        return True

    async def health_check(self) -> dict:
        """Return adapter health info."""
        reachable = await self.validate()
        info = self.health.to_dict()
        info["reachable"] = reachable
        return info

    async def collect(self) -> list[NormalizedEvent]:
        """Full collect cycle: fetch → normalize → update health."""
        start = time.monotonic()
        try:
            raw = await self.fetch()
            events = self.normalize(raw)
            elapsed = time.monotonic() - start
            self.health.record_success(len(events))
            logger.info(
                "%s: collected %d events in %.2fs",
                self.adapter_name, len(events), elapsed,
            )
            return events
        except Exception as exc:
            self.health.record_failure(str(exc))
            logger.error("%s: collection failed — %s", self.adapter_name, exc, exc_info=True)
            return []

    async def publish_event(self, event: NormalizedEvent) -> None:
        """Hook for downstream event publishing (e.g. webhook, message queue)."""
        pass
