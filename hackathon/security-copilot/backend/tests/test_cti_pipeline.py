"""
Unit tests for CTI pipeline services.
"""

import pytest
from app.services.confidence_scoring import ConfidenceScoringService
from app.services.entity_extraction import EntityExtractionService
from app.services.duplicate_detection import _cosine_similarity


# ── Entity Extraction ─────────────────────────────────────────────────────────

class TestEntityExtraction:
    def setup_method(self):
        self.service = EntityExtractionService()

    def test_extracts_cves(self):
        result = self.service.extract(
            "Critical vulnerability CVE-2024-1234 and CVE-2024-5678",
            "Affects multiple products",
        )
        assert "CVE-2024-1234" in result.cves
        assert "CVE-2024-5678" in result.cves

    def test_deduplicates_cves(self):
        result = self.service.extract(
            "CVE-2024-0001 and CVE-2024-0001 again",
            "Duplicate CVE-2024-0001",
        )
        assert result.cves.count("CVE-2024-0001") == 1

    def test_cves_normalised_uppercase(self):
        result = self.service.extract("cve-2024-9999 vulnerability", "")
        assert "CVE-2024-9999" in result.cves

    def test_extracts_vulnerability_types(self):
        result = self.service.extract(
            "Remote code execution vulnerability",
            "This RCE allows attackers to run arbitrary code",
        )
        assert "rce" in result.vulnerability_types

    def test_extracts_known_vendors(self):
        result = self.service.extract("Microsoft Windows vulnerability", "Affects Windows 11")
        assert any("microsoft" in v.lower() for v in result.vendors)

    def test_empty_text_returns_empty_result(self):
        result = self.service.extract("", "")
        assert result.cves == []
        assert result.vendors == []

    def test_cves_from_raw_payload_preserved(self):
        result = self.service.extract(
            "Security advisory",
            "No CVE in text",
            raw_cves=["CVE-2024-8888"],
        )
        assert "CVE-2024-8888" in result.cves


# ── Confidence Scoring ────────────────────────────────────────────────────────

class TestConfidenceScoring:
    def setup_method(self):
        self.service = ConfidenceScoringService()

    def test_nvd_source_scores_30(self):
        result = self.service.score(
            source_adapter="nvd_cve",
            cves=["CVE-2024-1234"],
            title="Test",
            description="Test",
            raw_payload={},
        )
        assert result.confidence_score >= 30
        assert any("NVD" in r for r in result.reasoning)

    def test_cisa_source_includes_cisa_points(self):
        result = self.service.score(
            source_adapter="cisa",
            cves=["CVE-2024-0001"],
            title="Test",
            description="Test",
            raw_payload={},
        )
        assert result.confidence_score >= 10
        assert any("CISA" in r for r in result.reasoning)

    def test_vendor_advisory_language_adds_points(self):
        result = self.service.score(
            source_adapter="unknown",
            cves=[],
            title="Security Advisory for Product",
            description="Patch released for critical issue",
            raw_payload={},
        )
        assert any("Vendor advisory" in r for r in result.reasoning)

    def test_max_score_is_100(self):
        result = self.service.score(
            source_adapter="nvd_cve",
            cves=["CVE-2024-1234"],
            title="Security Advisory with patch released",
            description="Vendor advisory for critical issue",
            raw_payload={},
            nvd_validated=True,
            cisa_validated=True,
            github_validated=True,
            cert_validated=True,
        )
        assert result.confidence_score <= 100

    def test_confidence_level_verified_at_90_plus(self):
        result = self.service.score(
            source_adapter="nvd_cve",
            cves=["CVE-2024-1234"],
            title="Security Advisory patch released",
            description="Vendor confirmed advisory",
            raw_payload={},
            nvd_validated=True,
            cisa_validated=True,
            github_validated=True,
            cert_validated=True,
        )
        assert result.confidence_level in ("verified", "high")

    def test_zero_score_is_low(self):
        result = self.service.score(
            source_adapter="unknown",
            cves=[],
            title="Some random news",
            description="Not a vulnerability",
            raw_payload={},
        )
        assert result.confidence_level == "low"


# ── Cosine Similarity ─────────────────────────────────────────────────────────

class TestCosineSimilarity:
    def test_identical_vectors(self):
        v = [1.0, 0.5, 0.3]
        assert abs(_cosine_similarity(v, v) - 1.0) < 1e-6

    def test_orthogonal_vectors(self):
        a = [1.0, 0.0]
        b = [0.0, 1.0]
        assert abs(_cosine_similarity(a, b)) < 1e-6

    def test_zero_vector(self):
        assert _cosine_similarity([0.0, 0.0], [1.0, 1.0]) == 0.0

    def test_length_mismatch_returns_zero(self):
        assert _cosine_similarity([1.0, 2.0], [1.0]) == 0.0
