"""
Phase 5 — Deterministic Confidence Scoring.

Scores are additive based on source signals:
  NVD match        +30
  GitHub Advisory  +25
  Vendor Advisory  +25
  CERT match       +10
  CISA match       +10
  ──────────────────────
  Maximum           100

Confidence levels:
  0–29   → LOW
  30–59  → MEDIUM
  60–89  → HIGH
  90–100 → VERIFIED
"""

from dataclasses import dataclass, field

SIGNAL_WEIGHTS = {
    "nvd_match": 30,
    "github_advisory": 25,
    "vendor_advisory": 25,
    "cert_match": 10,
    "cisa_match": 10,
}

LEVEL_THRESHOLDS = [
    (90, "verified"),
    (60, "high"),
    (30, "medium"),
    (0,  "low"),
]


@dataclass
class ConfidenceResult:
    confidence_score: int
    confidence_level: str
    reasoning: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "confidence_score": self.confidence_score,
            "confidence_level": self.confidence_level,
            "reasoning": self.reasoning,
        }


class ConfidenceScoringService:
    def score(
        self,
        *,
        source_adapter: str,
        cves: list[str],
        title: str,
        description: str,
        raw_payload: dict,
        # cross-source flags (set by pipeline after lookups)
        nvd_validated: bool = False,
        cisa_validated: bool = False,
        github_validated: bool = False,
        cert_validated: bool = False,
    ) -> ConfidenceResult:
        """Compute deterministic confidence score from source signals."""
        score = 0
        reasoning: list[str] = []

        # Source adapter self-score
        if source_adapter == "nvd_cve" or nvd_validated:
            score += SIGNAL_WEIGHTS["nvd_match"]
            reasoning.append(f"NVD record present (+{SIGNAL_WEIGHTS['nvd_match']})")

        if source_adapter == "github_advisory" or github_validated:
            score += SIGNAL_WEIGHTS["github_advisory"]
            reasoning.append(f"GitHub Advisory (+{SIGNAL_WEIGHTS['github_advisory']})")

        if source_adapter == "cisa" or cisa_validated:
            score += SIGNAL_WEIGHTS["cisa_match"]
            reasoning.append(f"CISA KEV entry (+{SIGNAL_WEIGHTS['cisa_match']})")

        if source_adapter == "cert_feed" or cert_validated:
            score += SIGNAL_WEIGHTS["cert_match"]
            reasoning.append(f"CERT/CC advisory (+{SIGNAL_WEIGHTS['cert_match']})")

        # Vendor advisory detection (heuristic from title/description)
        vendor_keywords = ("advisory", "security update", "patch", "bulletin", "hotfix")
        lower = f"{title} {description}".lower()
        if any(kw in lower for kw in vendor_keywords):
            score += SIGNAL_WEIGHTS["vendor_advisory"]
            reasoning.append(f"Vendor advisory language detected (+{SIGNAL_WEIGHTS['vendor_advisory']})")

        score = min(score, 100)
        level = self._get_level(score)

        return ConfidenceResult(
            confidence_score=score,
            confidence_level=level,
            reasoning=reasoning,
        )

    @staticmethod
    def _get_level(score: int) -> str:
        for threshold, level in LEVEL_THRESHOLDS:
            if score >= threshold:
                return level
        return "low"
