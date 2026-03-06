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
