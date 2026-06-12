"""
Weighted trust score model combining rule-based evidence and AI verification outputs.

Categories (max total 100):
  source_reputation     0-25
  ai_authenticity       0-20
  ai_credibility        0-20
  external_validation   0-20
  technical_evidence    0-10
  recency               0-5
"""

from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

NVD_CVE_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0?cveId={cve_id}"
CISA_KEV_URL = (
    "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
)

DEFAULT_SOURCE_REPUTATION: dict[str, int] = {
    "cisa": 25,
    "nvd": 25,
    "nist": 25,
    "microsoft security": 22,
    "microsoft": 22,
    "cisco talos": 22,
    "cisco": 22,
    "bleepingcomputer": 20,
    "the hacker news": 20,
    "hacker news": 20,
    "securityweek": 18,
    "krebs": 18,
    "dark reading": 18,
    "threatpost": 17,
    "security affairs": 17,
    "infosecurity": 16,
    "schneier": 16,
    "_default": 5,
}

CVE_PATTERN = re.compile(r"CVE-\d{4}-\d{4,7}", re.IGNORECASE)
IOC_HASH_PATTERN = re.compile(r"\b[a-fA-F0-9]{32,64}\b")
IOC_IP_PATTERN = re.compile(
    r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b"
)
EXPLOIT_KEYWORDS = [
    "exploit",
    "proof-of-concept",
    "proof of concept",
    " poc ",
    "0-day",
    "zero-day",
    "in the wild",
    "actively exploited",
    "remote code execution",
    " rce ",
]
IOC_KEYWORDS = [
    "indicator of compromise",
    " ioc ",
    " iocs ",
    "c2 server",
    "command and control",
    "malicious ip",
    "malicious domain",
    "threat indicator",
]

_kev_cve_set: set[str] | None = None
_kev_loaded_at: float = 0.0
_KEV_CACHE_TTL = 3600


@dataclass
class TrustScoreInput:
    source_name: str
    authenticity_score: int
    credibility_score: int
    cves: list[str]
    nvd_validated: bool
    cisa_kev_match: bool
    cve_found: bool
    ioc_detected: bool
    exploit_detected: bool
    published_at: Optional[datetime]
    source_reputation_map: Optional[dict[str, int]] = None


@dataclass
class TrustScoreResult:
    trust_score: int
    trust_level: str
    breakdown: dict[str, int]
    article_status: str


def load_source_reputation_map(settings_value: Optional[str] = None) -> dict[str, int]:
    """Merge DB settings JSON with defaults."""
    merged = DEFAULT_SOURCE_REPUTATION.copy()
    if settings_value:
        try:
            custom = json.loads(settings_value)
            if isinstance(custom, dict):
                for key, val in custom.items():
                    if isinstance(val, (int, float)):
                        merged[str(key).lower()] = int(val)
        except json.JSONDecodeError:
            logger.warning("Invalid source_reputation_map JSON in settings")
    return merged


def resolve_source_reputation(source_name: str, reputation_map: dict[str, int]) -> int:
    """Return 0-25 based on longest matching source name key."""
    name = (source_name or "").lower().strip()
    if not name:
        return min(25, reputation_map.get("_default", 5))

    best_score = reputation_map.get("_default", 5)
    best_len = 0
    for key, score in reputation_map.items():
        if key.startswith("_"):
            continue
        if key in name and len(key) > best_len:
            best_len = len(key)
            best_score = score
    return min(25, max(0, best_score))


def score_ai_authenticity(authenticity_score: int) -> int:
    return min(20, round((max(0, min(100, authenticity_score)) / 100) * 20))


def score_ai_credibility(credibility_score: int) -> int:
    return min(20, round((max(0, min(100, credibility_score)) / 100) * 20))


def score_external_validation(nvd_validated: bool, cisa_kev_match: bool) -> int:
    total = 0
    if nvd_validated:
        total += 10
    if cisa_kev_match:
        total += 10
    return min(20, total)


def score_technical_evidence(
    cve_found: bool, ioc_detected: bool, exploit_detected: bool
) -> int:
    total = 0
    if cve_found:
        total += 5
    if ioc_detected:
        total += 3
    if exploit_detected:
        total += 2
    return min(10, total)


def score_recency(published_at: Optional[datetime], now: Optional[datetime] = None) -> int:
    if published_at is None:
        return 0
    reference = now or datetime.utcnow()
    pub = published_at.replace(tzinfo=None) if published_at.tzinfo else published_at
    days = max(0, (reference - pub).days)
    if days <= 7:
        return 5
    if days <= 30:
        return 4
    if days <= 90:
        return 3
    if days <= 180:
        return 2
    if days <= 365:
        return 1
    return 0


def classify_trust_level(trust_score: int) -> str:
    if trust_score >= 90:
        return "high_confidence"
    if trust_score >= 75:
        return "trusted"
    if trust_score >= 60:
        return "pending_manual_review"
    if trust_score >= 40:
        return "low_confidence"
    return "rejected"


def article_status_for_trust_score(trust_score: int) -> str:
    """Only scores >= 60 enter analyst review."""
    return "pending_manual_review" if trust_score >= 60 else "rejected"


def calculate_trust_score(data: TrustScoreInput) -> TrustScoreResult:
    reputation_map = data.source_reputation_map or DEFAULT_SOURCE_REPUTATION

    breakdown = {
        "source_reputation": resolve_source_reputation(data.source_name, reputation_map),
        "ai_authenticity": score_ai_authenticity(data.authenticity_score),
        "ai_credibility": score_ai_credibility(data.credibility_score),
        "external_validation": score_external_validation(
            data.nvd_validated, data.cisa_kev_match
        ),
        "technical_evidence": score_technical_evidence(
            data.cve_found, data.ioc_detected, data.exploit_detected
        ),
        "recency": score_recency(data.published_at),
    }

    total = min(100, round(sum(breakdown.values())))
    trust_level = classify_trust_level(total)
    return TrustScoreResult(
        trust_score=total,
        trust_level=trust_level,
        breakdown=breakdown,
        article_status=article_status_for_trust_score(total),
    )


def extract_cves(text: str) -> list[str]:
    matches = CVE_PATTERN.findall(text or "")
    seen: set[str] = set()
    result: list[str] = []
    for match in matches:
        upper = match.upper()
        if upper not in seen:
            seen.add(upper)
            result.append(upper)
    return result


def detect_iocs(text: str) -> bool:
    lowered = f" {text.lower()} "
    if IOC_HASH_PATTERN.search(text):
        return True
    if IOC_IP_PATTERN.search(text) and any(k in lowered for k in ("malicious", "c2", "ioc", "indicator")):
        return True
    return any(k in lowered for k in IOC_KEYWORDS)


def detect_exploit_references(text: str) -> bool:
    lowered = f" {text.lower()} "
    return any(k in lowered for k in EXPLOIT_KEYWORDS)


def check_nvd(cve_id: str) -> bool:
    try:
        url = NVD_CVE_URL.format(cve_id=cve_id)
        with httpx.Client(timeout=5.0) as client:
            response = client.get(url)
            if response.status_code == 200:
                data = response.json()
                return data.get("totalResults", 0) > 0
    except Exception as exc:
        logger.debug("NVD lookup failed for %s: %s", cve_id, exc)
    return False


def _load_kev_catalog() -> set[str]:
    global _kev_cve_set, _kev_loaded_at
    now = time.time()
    if _kev_cve_set is not None and (now - _kev_loaded_at) < _KEV_CACHE_TTL:
        return _kev_cve_set

    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.get(CISA_KEV_URL)
            response.raise_for_status()
            data = response.json()
            _kev_cve_set = {
                (item.get("cveID") or "").upper()
                for item in data.get("vulnerabilities", [])
                if item.get("cveID")
            }
            _kev_loaded_at = now
            return _kev_cve_set
    except Exception as exc:
        logger.debug("CISA KEV catalog load failed: %s", exc)
        return _kev_cve_set or set()


def check_cisa_kev(cve_id: str) -> bool:
    return cve_id.upper() in _load_kev_catalog()


def validate_external(cves: list[str]) -> dict[str, bool]:
    """Check first CVE against NVD and full list against CISA KEV."""
    nvd_validated = False
    cisa_kev_match = False
    if cves:
        nvd_validated = check_nvd(cves[0])
        kev = _load_kev_catalog()
        cisa_kev_match = any(cve.upper() in kev for cve in cves)
    return {"nvd_validated": nvd_validated, "cisa_kev_match": cisa_kev_match}


def default_reputation_map_json() -> str:
    public = {k: v for k, v in DEFAULT_SOURCE_REPUTATION.items() if not k.startswith("_")}
    return json.dumps(public, indent=2)
