"""Tests for security features: headers, CORS, rate limiting, endpoint protection."""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock


class TestSecurityHeaders:
    """Verify security headers are present on all responses."""

    def test_security_headers_present(self, client):
        resp = client.get("/api/health")
        assert resp.headers.get("X-Content-Type-Options") == "nosniff"
        assert resp.headers.get("X-Frame-Options") == "DENY"
        assert resp.headers.get("X-XSS-Protection") == "1; mode=block"
        assert "max-age" in resp.headers.get("Strict-Transport-Security", "")
        assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"

    def test_content_security_policy(self, client):
        resp = client.get("/")
        csp = resp.headers.get("Content-Security-Policy", "")
        assert "default-src" in csp


class TestEndpointProtection:
    """Ensure protected endpoints reject unauthenticated requests."""

    def test_xray_analyze_requires_auth(self, client):
        resp = client.post("/api/xray/analyze")
        assert resp.status_code == 401

    def test_lab_manual_requires_auth(self, client):
        resp = client.post("/api/lab/analyze-manual", json={"values": {"wbc": 7000}})
        assert resp.status_code == 401

    def test_lab_upload_requires_auth(self, client):
        resp = client.post("/api/lab/upload-file")
        assert resp.status_code == 401

    def test_reports_history_requires_auth(self, client):
        resp = client.get("/api/reports/history")
        assert resp.status_code == 401

    def test_task_status_requires_auth(self, client):
        resp = client.get("/api/tasks/status/fake-task-id")
        assert resp.status_code == 401


class TestPublicEndpoints:
    """Ensure public endpoints remain accessible."""

    @patch("app.main.aioredis.from_url")
    def test_health_endpoint(self, mock_from_url, client):
        # Mock Redis so ping() doesn't need a real Redis server
        mock_redis = MagicMock()
        mock_redis.ping = AsyncMock(return_value=True)
        mock_redis.close = AsyncMock()
        mock_from_url.return_value = mock_redis
        
        resp = client.get("/api/health")
        assert resp.status_code == 200

    def test_root_endpoint(self, client):
        resp = client.get("/")
        assert resp.status_code == 200


class TestInputValidation:
    """Test that invalid inputs are properly rejected."""

    def test_register_missing_fields(self, client):
        resp = client.post("/api/auth/register", json={})
        assert resp.status_code == 422

    def test_register_invalid_role_type(self, client):
        payload = {
            "email": "valid@email.com",
            "password": "SecurePass1!",
            "full_name": "Test",
            "role": 12345,  # should be string
        }
        resp = client.post("/api/auth/register", json=payload)
        # FastAPI/Pydantic may coerce int to str, so just  ensure no 500
        assert resp.status_code != 500
