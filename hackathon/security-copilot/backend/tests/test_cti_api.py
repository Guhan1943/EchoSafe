"""
Integration tests for CTI API endpoints.
"""

from app.models.threat import ThreatEvent, ThreatRiskAssessment
from app.core.security import get_password_hash
from app.models.user import User


def _seed_threat(db, external_id="test:CVE-2024-0001", risk_score=80, severity="high") -> ThreatEvent:
    threat = ThreatEvent(
        external_id=external_id,
        source_adapter="nvd_cve",
        source_type="cve",
        title="Test Threat",
        description="A test threat event with CVE-2024-0001",
        url="https://nvd.nist.gov/vuln/detail/CVE-2024-0001",
        status="verified",
        confidence_score=70,
        confidence_level="high",
        risk_score=risk_score,
        severity=severity,
        is_duplicate=False,
    )
    db.add(threat)
    db.commit()
    db.refresh(threat)

    ra = ThreatRiskAssessment(
        event_id=threat.id,
        risk_score=risk_score,
        severity=severity,
        exploit_available=True,
        public_poc=False,
        vendor_confirmed=True,
        mention_velocity=3,
        reasons=["NVD record present"],
    )
    db.add(ra)
    db.commit()
    return threat


class TestThreatListAPI:
    def test_list_requires_auth(self, client):
        response = client.get("/api/v1/threats")
        assert response.status_code == 401

    def test_list_returns_empty_when_no_threats(self, client, auth_headers):
        response = client.get("/api/v1/threats", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["total"] == 0

    def test_list_returns_threats(self, client, db, auth_headers):
        _seed_threat(db)
        response = client.get("/api/v1/threats", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["total"] == 1

    def test_filter_by_severity(self, client, db, auth_headers):
        _seed_threat(db, external_id="test:high", severity="high")
        _seed_threat(db, external_id="test:low", severity="low", risk_score=10)
        response = client.get("/api/v1/threats?severity=high", headers=auth_headers)
        items = response.json()["items"]
        assert all(t["severity"] == "high" for t in items)

    def test_search_by_text(self, client, db, auth_headers):
        _seed_threat(db)
        response = client.get("/api/v1/threats?search=CVE-2024-0001", headers=auth_headers)
        assert response.json()["total"] >= 1


class TestThreatDetailAPI:
    def test_get_threat_detail(self, client, db, auth_headers):
        threat = _seed_threat(db)
        response = client.get(f"/api/v1/threats/{threat.id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == threat.id
        assert data["risk_assessment"]["risk_score"] == 80

    def test_get_nonexistent_threat_returns_404(self, client, auth_headers):
        response = client.get("/api/v1/threats/99999", headers=auth_headers)
        assert response.status_code == 404


class TestHighRiskAndTrending:
    def test_high_risk_returns_only_high_risk(self, client, db, auth_headers):
        _seed_threat(db, external_id="test:hi", risk_score=90, severity="critical")
        _seed_threat(db, external_id="test:lo", risk_score=10, severity="low")
        response = client.get("/api/v1/threats/high-risk?min_risk=50", headers=auth_headers)
        assert response.status_code == 200
        items = response.json()
        assert all(t["risk_score"] >= 50 for t in items)

    def test_stats_endpoint(self, client, db, auth_headers):
        _seed_threat(db)
        response = client.get("/api/v1/threats/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "by_severity" in data
