"""Tests for the reports history endpoint."""


class TestReportsHistory:
    """GET /api/reports/history"""

    def test_get_reports_empty(self, client, auth_headers):
        resp = client.get("/api/reports/history", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_get_reports_unauthenticated(self, client):
        resp = client.get("/api/reports/history")
        assert resp.status_code == 401
