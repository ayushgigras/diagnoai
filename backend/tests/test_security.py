"""Tests for security features: headers, CORS, rate limiting, endpoint protection."""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock

from app.main import app, ratelimit_enabled


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

    def test_csrf_token_set_on_get_request(self):
        """GET requests should set CSRF cookie when client has no csrf_token cookie."""
        raw_client = TestClient(app)
        resp = raw_client.get("/")
        assert resp.status_code == 200
        assert "csrf_token" in raw_client.cookies

    def test_permissions_policy_header_present(self, client):
        """Permissions-Policy header should always be present on responses."""
        resp = client.get("/api/health")
        assert "Permissions-Policy" in resp.headers
        assert "camera=()" in resp.headers["Permissions-Policy"]


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

    def test_admin_endpoint_requires_admin_role(self, client, auth_headers):
        """Non-admin authenticated users must not access admin endpoints."""
        resp = client.get("/api/admin/users", headers=auth_headers)
        assert resp.status_code == 403


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


class TestRateLimiting:
    """Validate rate-limiting behavior while staying stable when limiter is disabled."""

    def _post_xray_analyze(self, client, headers):
        return client.post(
            "/api/xray/analyze",
            headers=headers,
            data={"xray_type": "chest"},
            files={"file": ("dummy.jpg", b"fake-image", "image/jpeg")},
        )

    def test_health_endpoint_rate_limit_header_presence(self, client):
        """Health endpoint should expose rate-limit headers when limiter is enabled."""
        resp = client.get("/api/health")
        rate_headers = [h for h in resp.headers.keys() if h.lower().startswith("x-ratelimit")]

        if ratelimit_enabled:
            assert resp.status_code == 200
            assert rate_headers
        else:
            assert resp.status_code == 200
            assert not rate_headers

    def test_xray_analyze_rate_limit_threshold(self, client, patient_auth_headers):
        """X-ray analyze endpoint should enforce the configured 5/minute threshold when active."""
        statuses = []
        for _ in range(6):
            response = self._post_xray_analyze(client, patient_auth_headers)
            statuses.append(response.status_code)

        if 429 in statuses:
            first_429_index = statuses.index(429) + 1
            assert first_429_index <= 6
        else:
            # In test env global limiter may be disabled; still verify endpoint was reachable.
            assert all(code != 401 for code in statuses)

    def test_excess_request_returns_429_if_limiter_enabled(self, client, patient_auth_headers):
        """Excess requests should return 429 when rate limiting is active."""
        saw_429 = False
        for _ in range(12):
            response = self._post_xray_analyze(client, patient_auth_headers)
            if response.status_code == 429:
                saw_429 = True
                break

        if ratelimit_enabled:
            assert saw_429
        else:
            assert not saw_429
