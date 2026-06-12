def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_login_success(client, admin_user):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": admin_user.email, "password": "Admin123!"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert payload["access_token"]
    assert payload["user"]["email"] == admin_user.email
    assert payload["user"]["role"] == "admin"


def test_login_invalid_password(client, admin_user):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": admin_user.email, "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_get_me_requires_auth(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_get_me_success(client, auth_headers, admin_user):
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == admin_user.email
