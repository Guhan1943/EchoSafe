from datetime import datetime, timedelta

from app.services.trust_scoring import TrustScoreInput, calculate_trust_score


class TestVerificationIntegration:
    def test_verification_service_uses_weighted_model(self):
        result = calculate_trust_score(
            TrustScoreInput(
                source_name="The Hacker News",
                authenticity_score=85,
                credibility_score=80,
                cves=["CVE-2024-1234"],
                nvd_validated=True,
                cisa_kev_match=False,
                cve_found=True,
                ioc_detected=False,
                exploit_detected=True,
                published_at=datetime.utcnow() - timedelta(days=5),
            )
        )
        assert "source_reputation" in result.breakdown
        assert "ai_authenticity" in result.breakdown
        assert result.trust_score <= 100
