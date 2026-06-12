import json
import logging
import os
import re
from datetime import datetime

import httpx
from sqlalchemy.orm import Session

from app.models.article import Article
from app.models.verification import VerificationResult
from app.repositories.settings import SettingsRepository
from app.services.trust_scoring import (
    TrustScoreInput,
    calculate_trust_score,
    detect_exploit_references,
    detect_iocs,
    extract_cves,
    load_source_reputation_map,
    validate_external,
)

logger = logging.getLogger(__name__)


class VerificationService:
    def __init__(self, db: Session):
        self.db = db

    def verify_article(self, article_id: int) -> VerificationResult:
        article = self.db.query(Article).filter(Article.id == article_id).first()
        if article is None:
            raise ValueError(f"Article {article_id} not found")

        ai_data = self._ai_analyze(article)

        combined_text = " ".join(
            filter(None, [article.title, article.content, article.summary])
        )
        cves = extract_cves(combined_text)
        external = validate_external(cves)

        source_name = ""
        if article.source:
            source_name = article.source.name or ""

        reputation_map = self._load_reputation_map()

        score_input = TrustScoreInput(
            source_name=source_name,
            authenticity_score=int(ai_data.get("authenticity_score", 0)),
            credibility_score=int(ai_data.get("credibility_score", 0)),
            cves=cves,
            nvd_validated=external["nvd_validated"],
            cisa_kev_match=external["cisa_kev_match"],
            cve_found=len(cves) > 0,
            ioc_detected=detect_iocs(combined_text),
            exploit_detected=detect_exploit_references(combined_text),
            published_at=article.published_at,
            source_reputation_map=reputation_map,
        )

        score_result = calculate_trust_score(score_input)

        result = (
            self.db.query(VerificationResult)
            .filter(VerificationResult.article_id == article_id)
            .first()
        )
        if result is None:
            result = VerificationResult(article_id=article_id)
            self.db.add(result)

        result.authenticity_score = score_input.authenticity_score
        result.credibility_score = score_input.credibility_score
        result.severity = ai_data.get("severity")
        result.confidence = ai_data.get("confidence")
        result.business_impact = ai_data.get("business_impact")
        result.ai_analysis = ai_data.get("ai_analysis")
        result.cve_references = cves
        result.sources_checked = [
            {"name": "nvd_validated", "found": external["nvd_validated"]},
            {"name": "cisa_kev_match", "found": external["cisa_kev_match"]},
            {"name": "ioc_detected", "found": score_input.ioc_detected},
            {"name": "exploit_detected", "found": score_input.exploit_detected},
        ]
        result.affected_products = ai_data.get("affected_products", [])
        result.recommended_actions = ai_data.get("recommended_actions")
        result.trust_score_breakdown = score_result.breakdown
        result.trust_level = score_result.trust_level
        result.verified_at = datetime.utcnow()

        article.status = score_result.article_status
        article.trust_score = score_result.trust_score
        if ai_data.get("severity"):
            article.severity = ai_data["severity"]

        self.db.commit()
        self.db.refresh(result)
        return result

    def _load_reputation_map(self) -> dict[str, int]:
        repo = SettingsRepository(self.db)
        setting = repo.get_by_key("source_reputation_map")
        return load_source_reputation_map(setting.value if setting else None)

    def _ai_analyze(self, article: Article) -> dict:
        api_key = os.environ.get("OPENAI_API_KEY") or ""
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
                raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
                raw = re.sub(r"\s*```$", "", raw.strip())
                data = json.loads(raw)
                return data
            except Exception as exc:
                logger.warning("OpenAI analysis failed, falling back to heuristics: %s", exc)

        return self._heuristic_analyze(article)

    def _heuristic_analyze(self, article: Article) -> dict:
        """Keyword-based heuristic scoring when AI is not configured."""
        text = " ".join(
            filter(None, [article.title, article.content, article.summary])
        ).lower()

        authenticity_score = 50
        credibility_score = 50
        severity = "medium"

        critical_keywords = [
            "0-day", "zero-day", "critical", "rce", "remote code execution",
            "ransomware", "data breach", "actively exploited",
        ]
        high_keywords = [
            "vulnerability", "exploit", "cve", "patch", "attack", "malware",
            "breach", "compromise",
        ]
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
