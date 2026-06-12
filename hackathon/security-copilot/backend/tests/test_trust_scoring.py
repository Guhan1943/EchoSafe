from datetime import datetime, timedelta

import pytest

from app.services.trust_scoring import (
    TrustScoreInput,
    article_status_for_trust_score,
    calculate_trust_score,
    classify_trust_level,
    detect_exploit_references,
    detect_iocs,
    extract_cves,
    load_source_reputation_map,
    resolve_source_reputation,
    score_ai_authenticity,
    score_ai_credibility,
    score_external_validation,
    score_recency,
    score_technical_evidence,
)


class TestSourceReputation:
    def test_cisa_source(self):
        assert resolve_source_reputation("CISA Alerts", {"cisa": 25, "_default": 5}) == 25

    def test_bleeping_computer(self):
        rep = {"bleepingcomputer": 20, "_default": 5}
        assert resolve_source_reputation("BleepingComputer", rep) == 20

    def test_unknown_source(self):
        assert resolve_source_reputation("Random Blog XYZ", {"_default": 5}) == 5

    def test_longest_match_wins(self):
        rep = {"microsoft": 22, "microsoft security": 22, "_default": 5}
        assert resolve_source_reputation("Microsoft Security Response Center", rep) == 22

    def test_capped_at_25(self):
        assert resolve_source_reputation("CISA", {"cisa": 30, "_default": 5}) == 25

    def test_load_from_settings_json(self):
        merged = load_source_reputation_map('{"custom feed": 15}')
        assert merged["custom feed"] == 15
        assert merged["cisa"] == 25


class TestAIContributions:
    def test_authenticity_full(self):
        assert score_ai_authenticity(100) == 20

    def test_authenticity_half(self):
        assert score_ai_authenticity(50) == 10

    def test_authenticity_zero(self):
        assert score_ai_authenticity(0) == 0

    def test_credibility_full(self):
        assert score_ai_credibility(100) == 20

    def test_credibility_clamped(self):
        assert score_ai_credibility(150) == 20
        assert score_ai_authenticity(-10) == 0


class TestExternalValidation:
    def test_nvd_only(self):
        assert score_external_validation(True, False) == 10

    def test_kev_only(self):
        assert score_external_validation(False, True) == 10

    def test_both(self):
        assert score_external_validation(True, True) == 20

    def test_neither(self):
        assert score_external_validation(False, False) == 0


class TestTechnicalEvidence:
    def test_cve_only(self):
        assert score_technical_evidence(True, False, False) == 5

    def test_all_signals(self):
        assert score_technical_evidence(True, True, True) == 10

    def test_exploit_and_ioc(self):
        assert score_technical_evidence(False, True, True) == 5

    def test_capped_at_10(self):
        assert score_technical_evidence(True, True, True) <= 10


class TestRecency:
    def test_within_7_days(self):
        pub = datetime.utcnow() - timedelta(days=3)
        assert score_recency(pub) == 5

    def test_8_to_30_days(self):
        pub = datetime.utcnow() - timedelta(days=20)
        assert score_recency(pub) == 4

    def test_31_to_90_days(self):
        pub = datetime.utcnow() - timedelta(days=60)
        assert score_recency(pub) == 3

    def test_91_to_180_days(self):
        pub = datetime.utcnow() - timedelta(days=120)
        assert score_recency(pub) == 2

    def test_181_to_365_days(self):
        pub = datetime.utcnow() - timedelta(days=300)
        assert score_recency(pub) == 1

    def test_older_than_year(self):
        pub = datetime.utcnow() - timedelta(days=400)
        assert score_recency(pub) == 0

    def test_missing_date(self):
        assert score_recency(None) == 0


class TestTrustLevelClassification:
    @pytest.mark.parametrize(
        "score,expected",
        [
            (100, "high_confidence"),
            (90, "high_confidence"),
            (89, "trusted"),
            (75, "trusted"),
            (74, "pending_manual_review"),
            (60, "pending_manual_review"),
            (59, "low_confidence"),
            (40, "low_confidence"),
            (39, "rejected"),
            (0, "rejected"),
        ],
    )
    def test_levels(self, score, expected):
        assert classify_trust_level(score) == expected

    @pytest.mark.parametrize(
        "score,expected_status",
        [(60, "pending_manual_review"), (59, "rejected"), (100, "pending_manual_review")],
    )
    def test_article_status(self, score, expected_status):
        assert article_status_for_trust_score(score) == expected_status


class TestCalculateTrustScore:
    def test_high_confidence_scenario(self):
        result = calculate_trust_score(
            TrustScoreInput(
                source_name="CISA",
                authenticity_score=95,
                credibility_score=90,
                cves=["CVE-2024-1234"],
                nvd_validated=True,
                cisa_kev_match=True,
                cve_found=True,
                ioc_detected=True,
                exploit_detected=True,
                published_at=datetime.utcnow() - timedelta(days=2),
            )
        )
        assert result.trust_score >= 90
        assert result.trust_level == "high_confidence"
        assert result.article_status == "pending_manual_review"
        assert set(result.breakdown.keys()) == {
            "source_reputation",
            "ai_authenticity",
            "ai_credibility",
            "external_validation",
            "technical_evidence",
            "recency",
        }

    def test_rejected_scenario(self):
        result = calculate_trust_score(
            TrustScoreInput(
                source_name="Unknown Blog",
                authenticity_score=20,
                credibility_score=15,
                cves=[],
                nvd_validated=False,
                cisa_kev_match=False,
                cve_found=False,
                ioc_detected=False,
                exploit_detected=False,
                published_at=datetime.utcnow() - timedelta(days=500),
            )
        )
        assert result.trust_score < 40
        assert result.trust_level == "rejected"
        assert result.article_status == "rejected"

    def test_pending_review_threshold(self):
        result = calculate_trust_score(
            TrustScoreInput(
                source_name="The Hacker News",
                authenticity_score=70,
                credibility_score=70,
                cves=["CVE-2024-9999"],
                nvd_validated=True,
                cisa_kev_match=False,
                cve_found=True,
                ioc_detected=False,
                exploit_detected=True,
                published_at=datetime.utcnow() - timedelta(days=10),
            )
        )
        assert result.trust_score >= 60
        assert result.article_status == "pending_manual_review"

    def test_breakdown_sums_to_score(self):
        result = calculate_trust_score(
            TrustScoreInput(
                source_name="BleepingComputer",
                authenticity_score=80,
                credibility_score=75,
                cves=["CVE-2024-0001"],
                nvd_validated=False,
                cisa_kev_match=False,
                cve_found=True,
                ioc_detected=True,
                exploit_detected=False,
                published_at=datetime.utcnow() - timedelta(days=45),
            )
        )
        assert result.trust_score == min(100, round(sum(result.breakdown.values())))


class TestTextDetection:
    def test_extract_cves_deduplicates(self):
        text = "CVE-2024-0001 affects systems. Also CVE-2024-0001 again."
        assert extract_cves(text) == ["CVE-2024-0001"]

    def test_detect_iocs_hash(self):
        text = "Hash abcdef0123456789abcdef0123456789 found in malware sample"
        assert detect_iocs(text) is True

    def test_detect_iocs_keyword(self):
        assert detect_iocs("Researchers shared an indicator of compromise.") is True

    def test_detect_exploit_reference(self):
        assert detect_exploit_references("A proof-of-concept exploit was published.") is True

    def test_no_exploit_reference(self):
        assert detect_exploit_references("General security news update.") is False
