"""
Unit tests for CTI source adapters.
Tests normalization logic without hitting real network endpoints.
"""

import pytest
from app.adapters.github_advisory import GitHubAdvisoryAdapter
from app.adapters.nvd_cve import NVDCVEAdapter
from app.adapters.cisa import CISAAdapter
from app.adapters.cert_feed import CERTFeedAdapter
from app.adapters.base import NormalizedEvent


# ── GitHub Advisory ───────────────────────────────────────────────────────────

class TestGitHubAdvisoryAdapter:
    def setup_method(self):
        self.adapter = GitHubAdvisoryAdapter()

    def test_normalize_full_advisory(self):
        raw = {
            "ghsa_id": "GHSA-xxxx-yyyy-zzzz",
            "summary": "Critical RCE in ExampleLib",
            "description": "Remote code execution via CVE-2024-9999.",
            "html_url": "https://github.com/advisories/GHSA-xxxx-yyyy-zzzz",
            "severity": "critical",
            "published_at": "2024-01-15T10:00:00Z",
            "identifiers": [{"type": "CVE", "value": "CVE-2024-9999"}],
        }
        event = self.adapter._normalize_item(raw)
        assert event is not None
        assert event.is_valid()
        assert event["source"] == "github_advisory"
        assert "CVE-2024-9999" in event["cves"]
        assert event["severity"] == "critical"
        assert "GHSA-xxxx-yyyy-zzzz" in event["id"]

    def test_normalize_moderate_mapped_to_medium(self):
        raw = {
            "ghsa_id": "GHSA-test-moderate",
            "summary": "Moderate issue",
            "severity": "moderate",
            "html_url": "https://github.com/advisories/GHSA-test-moderate",
        }
        event = self.adapter._normalize_item(raw)
        assert event["severity"] == "medium"

    def test_normalize_missing_id_returns_none(self):
        event = self.adapter._normalize_item({"summary": "no id"})
        assert event is None

    def test_cve_extracted_from_text_when_not_in_identifiers(self):
        raw = {
            "ghsa_id": "GHSA-text-cve",
            "summary": "Affects CVE-2025-1234 in multiple products",
            "description": "",
            "html_url": "https://github.com/advisories/GHSA-text-cve",
            "severity": "high",
            "identifiers": [],
        }
        event = self.adapter._normalize_item(raw)
        assert "CVE-2025-1234" in event["cves"]


# ── NVD CVE ───────────────────────────────────────────────────────────────────

class TestNVDCVEAdapter:
    def setup_method(self):
        self.adapter = NVDCVEAdapter()

    def test_normalize_cve_record(self):
        raw = {
            "cve": {
                "id": "CVE-2024-12345",
                "published": "2024-03-01T00:00:00.000",
                "descriptions": [
                    {"lang": "en", "value": "A critical buffer overflow vulnerability."}
                ],
                "metrics": {
                    "cvssMetricV31": [{
                        "cvssData": {
                            "baseScore": 9.8,
                            "baseSeverity": "CRITICAL",
                        }
                    }]
                },
                "references": [{"url": "https://example.com/advisory"}],
            }
        }
        event = self.adapter._normalize_item(raw)
        assert event is not None
        assert event["id"] == "nvd:CVE-2024-12345"
        assert "CVE-2024-12345" in event["cves"]
        assert event["severity"] == "critical"
        assert "buffer overflow" in event["description"]

    def test_normalize_missing_cve_id_returns_none(self):
        event = self.adapter._normalize_item({"cve": {}})
        assert event is None


# ── CISA ──────────────────────────────────────────────────────────────────────

class TestCISAAdapter:
    def setup_method(self):
        self.adapter = CISAAdapter()

    def test_normalize_kev_entry(self):
        raw = {
            "cveID": "CVE-2023-44487",
            "vendorProject": "IETF",
            "product": "HTTP/2",
            "vulnerabilityName": "HTTP/2 Rapid Reset Attack",
            "dateAdded": "2023-10-10",
            "shortDescription": "HTTP/2 protocol allows denial of service.",
            "requiredAction": "Apply mitigations per vendor guidance.",
        }
        event = self.adapter._normalize_item(raw)
        assert event is not None
        assert "CVE-2023-44487" in event["cves"]
        assert "[CISA KEV]" in event["title"]
        assert event["severity"] == "high"

    def test_normalize_missing_cve_returns_none(self):
        event = self.adapter._normalize_item({"vendorProject": "Test"})
        assert event is None


# ── NormalizedEvent ───────────────────────────────────────────────────────────

class TestNormalizedEvent:
    def test_valid_event(self):
        event = NormalizedEvent.build(
            id="test:001",
            source="test",
            source_type="advisory",
            title="Test",
            description="Test description",
            url="https://example.com",
        )
        assert event.is_valid()

    def test_invalid_event_missing_url(self):
        event = NormalizedEvent.build(
            id="test:002",
            source="test",
            source_type="advisory",
            title="Test",
            description="Test",
            url="",
        )
        assert not event.is_valid()
