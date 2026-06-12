from app.services.verification import VerificationService


class TestTrustScoreCalculation:
    def test_maximum_trust_score(self):
        service = VerificationService(db=None)  # type: ignore[arg-type]
        checks = {
            "trusted_source": True,
            "multiple_confirmations": True,
            "official_advisory": True,
            "cve_found": True,
            "cisa_nvd_validation": True,
        }
        total, breakdown = service._calculate_trust_score(checks, ["CVE-2024-1234"])
        assert total == 100
        assert sum(breakdown.values()) == 100

    def test_rejected_threshold(self):
        service = VerificationService(db=None)  # type: ignore[arg-type]
        checks = {"trusted_source": True, "cve_found": True}
        total, _ = service._calculate_trust_score(checks, ["CVE-2024-1234"])
        assert total == 35
        assert total < 80

    def test_pending_review_threshold(self):
        service = VerificationService(db=None)  # type: ignore[arg-type]
        checks = {
            "trusted_source": True,
            "multiple_confirmations": True,
            "official_advisory": True,
            "cve_found": True,
        }
        total, _ = service._calculate_trust_score(checks, ["CVE-2024-1234"])
        assert total == 80

    def test_extract_cves_deduplicates(self):
        service = VerificationService(db=None)  # type: ignore[arg-type]
        text = "CVE-2024-0001 affects systems. Also CVE-2024-0001 again."
        cves = service._extract_cves(text)
        assert cves == ["CVE-2024-0001"]
