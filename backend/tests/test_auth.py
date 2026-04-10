"""Tests for authentication endpoints: register, login, /me."""
import pytest


class TestRegister:
    """POST /api/auth/register"""

    def test_register_success(self, client, test_user_data):
        resp = client.post("/api/auth/register", json=test_user_data)
        assert resp.status_code == 200
        body = resp.json()
        assert body["email"] == test_user_data["email"]
        assert body["full_name"] == test_user_data["full_name"]
        assert "id" in body

    def test_register_duplicate_email(self, client, test_user_data):
        client.post("/api/auth/register", json=test_user_data)
        resp = client.post("/api/auth/register", json=test_user_data)
        assert resp.status_code == 400
        assert "already exists" in resp.json()["detail"]

    def test_register_weak_password_short(self, client):
        payload = {
            "email": "weak@diagnoai.com",
            "full_name": "Weak",
            "password": "Ab1!",
            "role": "doctor",
        }
        resp = client.post("/api/auth/register", json=payload)
        assert resp.status_code == 422  # Pydantic validation error

    def test_register_weak_password_no_uppercase(self, client):
        payload = {
            "email": "weak@diagnoai.com",
            "full_name": "Weak",
            "password": "securepass1!",
            "role": "doctor",
        }
        resp = client.post("/api/auth/register", json=payload)
        assert resp.status_code == 422

    def test_register_weak_password_no_special_char(self, client):
        payload = {
            "email": "weak@diagnoai.com",
            "full_name": "Weak",
            "password": "SecurePass1",
            "role": "doctor",
        }
        resp = client.post("/api/auth/register", json=payload)
        assert resp.status_code == 422

    def test_register_invalid_email(self, client):
        payload = {
            "email": "not-an-email",
            "full_name": "Bad",
            "password": "SecurePass1!",
            "role": "doctor",
        }
        resp = client.post("/api/auth/register", json=payload)
        assert resp.status_code == 422


class TestLogin:
    """POST /api/auth/login"""

    def test_login_success(self, client, test_user_data):
        client.post("/api/auth/register", json=test_user_data)
        resp = client.post(
            "/api/auth/login",
            data={"username": test_user_data["email"], "password": test_user_data["password"]},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"

    def test_login_wrong_password(self, client, test_user_data):
        client.post("/api/auth/register", json=test_user_data)
        resp = client.post(
            "/api/auth/login",
            data={"username": test_user_data["email"], "password": "WrongPass1!"},
        )
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client):
        resp = client.post(
            "/api/auth/login",
            data={"username": "ghost@diagnoai.com", "password": "SecurePass1!"},
        )
        assert resp.status_code == 401


class TestMe:
    """GET /api/auth/me"""

    def test_me_authenticated(self, client, auth_headers):
        resp = client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        assert "email" in resp.json()

    def test_me_unauthenticated(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401


class TestPasswordReset:
    """POST /api/auth/forgot-password and /api/auth/reset-password"""

    def test_forgot_password_returns_generic_message(self, client):
        resp = client.post("/api/auth/forgot-password", json={"email": "missing@diagnoai.com"})
        assert resp.status_code == 200
        assert "If an account with this email exists" in resp.json()["message"]

    def test_forgot_and_reset_password_success(self, client, test_user_data):
        client.post("/api/auth/register", json=test_user_data)

        forgot_resp = client.post("/api/auth/forgot-password", json={"email": test_user_data["email"]})
        assert forgot_resp.status_code == 200
        assert "reset_url" in forgot_resp.json()

        reset_url = forgot_resp.json()["reset_url"]
        token = reset_url.split("token=")[-1]
        reset_val = "TestVal99#123"

        reset_resp = client.post(
            "/api/auth/reset-password",
            json={"token": token, "new_password": reset_val},
        )
        assert reset_resp.status_code == 200

        login_resp = client.post(
            "/api/auth/login",
            data={"username": test_user_data["email"], "password": reset_val},
        )
        assert login_resp.status_code == 200


class TestGoogleLogin:
    """POST /api/auth/google"""

    def test_google_login_success_new_user(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.auth.settings.GOOGLE_CLIENT_ID", "test-client-id")

        def fake_verify(_credential, _request, _client_id):
            return {
                "email": "google-user@diagnoai.com",
                "sub": "google-sub-123",
                "name": "Google User",
                "email_verified": True,
            }

        monkeypatch.setattr("app.routers.auth.id_token.verify_oauth2_token", fake_verify)

        resp = client.post(
            "/api/auth/google",
            json={"credential": "fake-google-credential", "role": "patient"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body["user"]["email"] == "google-user@diagnoai.com"

    def test_google_login_invalid_token(self, client, monkeypatch):
        monkeypatch.setattr("app.routers.auth.settings.GOOGLE_CLIENT_ID", "test-client-id")

        def fake_verify(_credential, _request, _client_id):
            raise ValueError("bad token")

        monkeypatch.setattr("app.routers.auth.id_token.verify_oauth2_token", fake_verify)

        resp = client.post("/api/auth/google", json={"credential": "invalid"})
        assert resp.status_code == 401
