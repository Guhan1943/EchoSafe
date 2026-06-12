"""
Phase 6 — Risk Assessment Service.

Calculates:
  - CVSS base score (extracted from raw payload or heuristic)
  - Exploit availability (CISA KEV = confirmed exploited)
  - Public PoC availability (keyword heuristic)
  - Vendor confirmation (heuristic)
  - Mention velocity (count of same CVEs in recent threat_events)

Risk score 0–100 → severity: LOW / MEDIUM / HIGH / CRITICAL
"""

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.threat import ThreatEntity, ThreatEvent

logger = logging.getLogger(__name__)

CVSS_RE = re.compile(r"(\d+\.\d+)", re.IGNORECASE)

SEVERITY_THRESHOLDS = [
    (75, "critical"),
    (50, "high"),
    (25, "medium"),
    (0,  "low"),
]

POC_KEYWORDS = (
    "proof of concept", "poc", "exploit code", "exploit available",
    "weaponized", "metasploit", "exploit-db", "github.com/exploit",
)

VENDOR_CONFIRM_KEYWORDS = (
    "vendor confirmed", "vendor advisory", "patch released",
    "security update", "patch tuesday", "security bulletin",
)


@dataclass
class RiskResult:
    risk_score: int
    severity: str
    cvss_score: float | None
    exploit_available: bool
    public_poc: bool
    vendor_confirmed: bool
    mention_velocity: int
    reasons: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "risk_score": self.risk_score,
            "severity": self.severity,
            "cvss_score": self.cvss_score,
            "exploit_available": self.exploit_available,
            "public_poc": self.public_poc,
            "vendor_confirmed": self.vendor_confirmed,
            "mention_velocity": self.mention_velocity,
            "reasons": self.reasons,
        }


class RiskAssessmentService:
    def __init__(self, db: Session):
        self.db = db

    def assess(
        self,
        event: ThreatEvent,
        cves: list[str],
    ) -> RiskResult:
        reasons: list[str] = []
        score = 0

        raw = event.raw_payload or {}
        text = f"{event.title or ''} {event.description or ''}".lower()

        # 1. CVSS score (up to 40 points)
        cvss = self._extract_cvss(raw, text)
        if cvss is not None:
            cvss_points = min(int(cvss / 10 * 40), 40)
            score += cvss_points
            reasons.append(f"CVSS score {cvss} (+{cvss_points})")

        # 2. Exploit availability (CISA KEV = confirmed exploited, +25)
        exploit_available = event.source_adapter == "cisa"
        if not exploit_available:
            exploit_available = any(
                kw in text for kw in ("actively exploited", "in the wild", "ransomware")
            )
        if exploit_available:
            score += 25
            reasons.append("Active exploitation confirmed (+25)")

        # 3. Public PoC (+15)
        public_poc = any(kw in text for kw in POC_KEYWORDS)
        if public_poc:
            score += 15
            reasons.append("Public PoC or exploit code referenced (+15)")

        # 4. Vendor confirmation (+10)
        vendor_confirmed = any(kw in text for kw in VENDOR_CONFIRM_KEYWORDS)
        if vendor_confirmed:
            score += 10
            reasons.append("Vendor confirmation detected (+10)")

        # 5. Mention velocity — same CVEs seen in last 24h (up to +10)
        velocity = self._mention_velocity(cves)
        velocity_points = min(velocity * 2, 10)
        if velocity_points:
            score += velocity_points
            reasons.append(f"Mention velocity {velocity} recent events (+{velocity_points})")

        score = min(score, 100)
        severity = self._get_severity(event.severity, score)

        return RiskResult(
            risk_score=score,
            severity=severity,
            cvss_score=cvss,
            exploit_available=exploit_available,
            public_poc=public_poc,
            vendor_confirmed=vendor_confirmed,
            mention_velocity=velocity,
            reasons=reasons,
        )

    # ── Private ───────────────────────────────────────────────────────────────

    def _extract_cvss(self, raw: dict, text: str) -> float | None:
        # Try raw payload first (NVD has structured metrics)
        metrics = raw.get("metrics", {})
        for key in ("cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
            items = metrics.get(key, [])
            if items:
                base_score = items[0].get("cvssData", {}).get("baseScore")
                if base_score is not None:
                    return float(base_score)
        # Text heuristic: look for "CVSS … N.N"
        match = CVSS_RE.search(text)
        if match:
            val = float(match.group(1))
            if 0.0 <= val <= 10.0:
                return val
        return None

    def _mention_velocity(self, cves: list[str]) -> int:
        if not cves:
            return 0
        cutoff = datetime.utcnow() - timedelta(hours=24)
        count = (
            self.db.query(ThreatEntity)
            .join(ThreatEvent)
            .filter(
                ThreatEntity.entity_type == "cve",
                ThreatEntity.value.in_(cves),
                ThreatEvent.collected_at >= cutoff,
            )
            .count()
        )
        return count

    @staticmethod
    def _get_severity(adapter_severity: str | None, score: int) -> str:
        # If adapter provided explicit severity, use it but floor/cap with score
        if adapter_severity:
            mapped = {
                "critical": 75,
                "high": 50,
                "medium": 25,
                "low": 0,
            }.get(adapter_severity.lower(), 0)
            effective = max(score, mapped)
        else:
            effective = score

        for threshold, level in SEVERITY_THRESHOLDS:
            if effective >= threshold:
                return level
        return "low"
