import json
import logging
import os
import re
from datetime import datetime
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.models.article import Article
from app.models.verification import VerificationResult

logger = logging.getLogger(__name__)

TRUSTED_SOURCE_NAMES = [
    "hackernews",
    "bleepingcomputer",
    "securityweek",
    "threatpost",
    "krebs",
    "darkreading",
    "thehackernews",
    "cisa",
    "nvd",
    "nist",
    "cert",
    "mitre",
    "sans",
    "schneier",
    "wired",
    "ars technica",
    "arstechnica",
    "zdnet",
    "infosecurity",
    "securityaffairs",
]

VENDOR_NAMES = [
    "microsoft",
    "google",
    "apple",
    "cisco",
    "palo alto",
    "crowdstrike",
    "sentinelone",
    "fortinet",
    "juniper",
    "vmware",
    "broadcom",
    "oracle",
    "sap",
    "adobe",
    "mozilla",
]


class VerificationService:
    def __init__(self, db: Session):
        self.db = db

    def verify_article(self, article_id: int) -> VerificationResult:
        article = self.db.query(Article).filter(Article.id == article_id).first()
        if article is None:
            raise ValueError(f"Article {article_id} not found")

        # Run AI analysis
        ai_data = self._ai_analyze(article)

        # Extract CVEs from article text
        combined_text = " ".join(
            filter(
                None,
                [article.title, article.content, article.summary],
            )
        )
        cves = self._extract_cves(combined_text)

        # Check external sources
        checks = self._check_external_sources(article, cves)

        # Calculate trust score
        trust_score, breakdown = self._calculate_trust_score(checks, cves)

        # Determine status
        new_status = "pending_manual_review" if trust_score >= 80 else "rejected"

        # Upsert verification result
        result = (
            self.db.query(VerificationResult)
            .filter(VerificationResult.article_id == article_id)
            .first()
        )
        if result is None:
            result = VerificationResult(article_id=article_id)
            self.db.add(result)

        result.authenticity_score = ai_data.get("authenticity_score", 0)
        result.credibility_score = ai_data.get("credibility_score", 0)
        result.severity = ai_data.get("severity")
        result.confidence = ai_data.get("confidence")
        result.business_impact = ai_data.get("business_impact")
        result.ai_analysis = ai_data.get("ai_analysis")
        result.cve_references = cves
        result.sources_checked = [
            {"name": key, "found": value} for key, value in checks.items()
        ]
        result.affected_products = ai_data.get("affected_products", [])
        result.recommended_actions = ai_data.get("recommended_actions")
        result.trust_score_breakdown = breakdown
        result.verified_at = datetime.utcnow()

        # Update article
        article.status = new_status
        article.trust_score = trust_score
        if ai_data.get("severity"):
            article.severity = ai_data["severity"]

        self.db.commit()
        self.db.refresh(result)
        return result

    def _ai_analyze(self, article: Article) -> dict:
        api_key = os.environ.get("OPENAI_API_KEY") or ""
        # Also try the settings-configured key
        from app.config import settings as app_settings
        if not api_key:
            api_key = app_settings.OPENAI_API_KEY

        if api_key:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=api_key)
                model = app_settings.OPENAI_MODEL or "gpt-4o-mini"

                content_snippet = (article.content or article.summary or "")[:3000]
                prompt = (
                    f"Title: {article.title}\n\n"
                    f"Content: {content_snippet}\n\n"
                    "Analyze this security intelligence article and respond with a JSON object containing:\n"
                    "- authenticity_score (0-100): likelihood the article is authentic\n"
                    "- credibility_score (0-100): credibility of the source/claims\n"
                    "- severity (one of: critical, high, medium, low, info)\n"
                    "- confidence (one of: high, medium, low)\n"
                    "- business_impact (string): business impact description\n"
                    "- ai_analysis (string): detailed analysis\n"
                    "- affected_products (list of strings): affected software/hardware\n"
                    "- recommended_actions (string): recommended mitigation steps\n"
                    "Respond ONLY with valid JSON."
                )

                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are a cybersecurity analyst. Analyze the following "
                                "security intelligence and provide structured assessment."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.2,
                    max_tokens=1024,
                )
                raw = response.choices[0].message.content or "{}"
                # Strip markdown code fences if present
                raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
                raw = re.sub(r"\s*```$", "", raw.strip())
                data = json.loads(raw)
                return data
            except Exception as exc:
                logger.warning("OpenAI analysis failed, falling back to heuristics: %s", exc)

        # Heuristic / mock analysis
        return self._heuristic_analyze(article)

    def _heuristic_analyze(self, article: Article) -> dict:
        """Keyword-based heuristic scoring when AI is not configured."""
        text = " ".join(
            filter(None, [article.title, article.content, article.summary])
        ).lower()

        authenticity_score = 50
        credibility_score = 50
        severity = "medium"

        critical_keywords = ["0-day", "zero-day", "critical", "rce", "remote code execution",
                              "ransomware", "data breach", "actively exploited"]
        high_keywords = ["vulnerability", "exploit", "cve", "patch", "attack", "malware",
                          "breach", "compromise"]
        medium_keywords = ["security", "threat", "risk", "advisory", "update"]

        crit_count = sum(1 for kw in critical_keywords if kw in text)
        high_count = sum(1 for kw in high_keywords if kw in text)

        if crit_count >= 2:
            authenticity_score = 75
            credibility_score = 70
            severity = "critical"
        elif crit_count == 1:
            authenticity_score = 65
            credibility_score = 60
            severity = "high"
        elif high_count >= 2:
            authenticity_score = 60
            credibility_score = 55
            severity = "high"
        elif high_count == 1:
            authenticity_score = 55
            credibility_score = 50
            severity = "medium"
        else:
            medium_count = sum(1 for kw in medium_keywords if kw in text)
            if medium_count >= 1:
                authenticity_score = 50
                credibility_score = 45
                severity = "low"

        confidence = "medium"
        if authenticity_score >= 70:
            confidence = "high"
        elif authenticity_score < 50:
            confidence = "low"

        return {
            "authenticity_score": authenticity_score,
            "credibility_score": credibility_score,
            "severity": severity,
            "confidence": confidence,
            "business_impact": (
                "AI analysis not configured - using heuristic scoring. "
                "Manual review recommended to assess business impact."
            ),
            "ai_analysis": (
                "AI analysis not configured - using heuristic scoring based on keyword matching. "
                "Keywords detected indicate potential security relevance."
            ),
            "affected_products": [],
            "recommended_actions": (
                "Review article manually. Apply vendor patches if applicable. "
                "Monitor for related advisories."
            ),
        }

    def _extract_cves(self, text: str) -> list[str]:
        """Extract unique CVE identifiers from text."""
        pattern = r"CVE-\d{4}-\d{4,7}"
        matches = re.findall(pattern, text, re.IGNORECASE)
        # Normalise to uppercase and deduplicate preserving order
        seen = set()
        result = []
        for m in matches:
            upper = m.upper()
            if upper not in seen:
                seen.add(upper)
                result.append(upper)
        return result

    def _check_external_sources(self, article: Article, cves: list[str]) -> dict:
        """
        Heuristic and lightweight external checks.
        Returns a dict of boolean flags.
        """
        source_name = ""
        source_type = ""
        if article.source:
            source_name = (article.source.name or "").lower()
            source_type = (article.source.source_type or "").lower()

        title_lower = (article.title or "").lower()

        # trusted_source: check if source name contains known trusted publishers
        trusted_source = any(t in source_name for t in TRUSTED_SOURCE_NAMES)

        # cve_found: any CVEs extracted
        cve_found = len(cves) > 0

        # official_advisory: advisory keywords or CVE in title, or vendor source
        official_advisory = (
            "advisory" in title_lower
            or "cve" in title_lower
            or any(v in source_name for v in VENDOR_NAMES)
        )

        # multiple_confirmations: heuristic - trusted source types or keywords
        multiple_confirmations = (
            source_type in ("vendor_blog", "threat_feed")
            or (trusted_source and cve_found)
        )

        # cisa_nvd_validation: attempt live NVD lookup for the first CVE
        cisa_nvd_validation = False
        if cves:
            cisa_nvd_validation = self._check_nvd(cves[0])

        return {
            "trusted_source": trusted_source,
            "multiple_confirmations": multiple_confirmations,
            "official_advisory": official_advisory,
            "cve_found": cve_found,
            "cisa_nvd_validation": cisa_nvd_validation,
        }

    def _check_nvd(self, cve_id: str) -> bool:
        """Try to validate a CVE against the NVD API. Returns True if found."""
        try:
            url = f"https://services.nvd.nist.gov/rest/json/cves/2.0?cveId={cve_id}"
            with httpx.Client(timeout=5.0) as client:
                response = client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    return data.get("totalResults", 0) > 0
        except Exception as exc:
            logger.debug("NVD lookup failed for %s: %s", cve_id, exc)
        return False

    def _calculate_trust_score(
        self, checks: dict, cves: list[str]
    ) -> tuple[int, dict]:
        """
        Calculate trust score from checks.
        Returns (total_score, breakdown_dict).
        """
        breakdown: dict[str, int] = {}

        if checks.get("trusted_source"):
            breakdown["trusted_source"] = 20
        if checks.get("multiple_confirmations"):
            breakdown["multiple_confirmations"] = 20
        if checks.get("official_advisory"):
            breakdown["official_advisory"] = 25
        if checks.get("cve_found"):
            breakdown["cve_found"] = 15
        if checks.get("cisa_nvd_validation"):
            breakdown["cisa_nvd_validation"] = 20

        total = min(100, sum(breakdown.values()))
        return total, breakdown
