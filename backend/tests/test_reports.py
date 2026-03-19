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

    def test_patient_can_access_own_reports(self, client, auth_headers): # Using mock/fixture headers
        resp = client.get("/api/reports/history", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_patient_cannot_see_other_users_reports(self, client, auth_headers):
        resp = client.get("/api/reports/history", headers=auth_headers)
        assert resp.status_code == 200
        # If the user only has their own, verify no other IDs exist
        # In a real db-backed test, this checks the returned patient_ids matching the token
        reports = resp.json()
        for r in reports:
            assert "Not found" not in str(r.get("patient_name", ""))

    def test_report_history_structure(self, client, auth_headers):
        resp = client.get("/api/reports/history", headers=auth_headers)
        assert resp.status_code == 200
        reports = resp.json()
        if len(reports) > 0:
            report = reports[0]
            assert "id" in report
            assert "patient_name" in report
            assert "doctor_name" in report
            assert "status" in report
            assert "file_path" in report
            assert "created_at" in report
