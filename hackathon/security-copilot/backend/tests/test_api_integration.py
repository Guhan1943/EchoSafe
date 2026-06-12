from app.core.security import get_password_hash
from app.models.article import Article
from app.models.source import Source
from app.models.user import User


def _create_analyst(db) -> User:
    user = User(
        email="analyst@test.local",
        hashed_password=get_password_hash("Analyst123!"),
        full_name="Test Analyst",
        role="analyst",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _analyst_headers(client, analyst: User) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": analyst.email, "password": "Analyst123!"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_list_sources_requires_auth(client):
    response = client.get("/api/v1/sources")
    assert response.status_code == 401


def test_admin_can_create_source(client, db, auth_headers):
    response = client.post(
        "/api/v1/sources",
        headers=auth_headers,
        json={
            "name": "Test Feed",
            "url": "https://example.com/feed.xml",
            "source_type": "rss_feed",
            "polling_interval_minutes": 60,
        },
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Test Feed"


def test_viewer_only_sees_approved_articles(client, db):
    viewer = User(
        email="viewer@test.local",
        hashed_password=get_password_hash("Viewer123!"),
        full_name="Test Viewer",
        role="viewer",
        is_active=True,
    )
    source = Source(name="Feed", url="https://example.com/feed", source_type="rss_feed")
    db.add_all([viewer, source])
    db.commit()
    db.refresh(source)

    db.add_all(
        [
            Article(
                source_id=source.id,
                title="Draft article",
                url="https://example.com/draft",
                status="new",
            ),
            Article(
                source_id=source.id,
                title="Approved article",
                url="https://example.com/approved",
                status="approved",
            ),
        ]
    )
    db.commit()

    login = client.post(
        "/api/v1/auth/login",
        data={"username": viewer.email, "password": "Viewer123!"},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    response = client.get("/api/v1/articles", headers=headers)
    assert response.status_code == 200
    titles = [item["title"] for item in response.json()["items"]]
    assert titles == ["Approved article"]


def test_analyst_can_verify_article(client, db):
    analyst = _create_analyst(db)
    headers = _analyst_headers(client, analyst)

    source = Source(name="Feed", url="https://example.com/feed2", source_type="rss_feed")
    db.add(source)
    db.commit()
    db.refresh(source)

    article = Article(
        source_id=source.id,
        title="Critical zero-day vulnerability in ExampleOS",
        url="https://example.com/zero-day",
        content="A critical zero-day RCE vulnerability CVE-2024-9999 was discovered.",
        summary="Critical security issue",
        status="new",
    )
    db.add(article)
    db.commit()
    db.refresh(article)

    response = client.post(f"/api/v1/articles/{article.id}/verify", headers=headers)
    assert response.status_code == 200
    payload = response.json()
    assert payload["severity"] in {"critical", "high", "medium", "low", "info"}
    assert "authenticity_score" in payload
