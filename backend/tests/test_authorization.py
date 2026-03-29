"""
Tests for resource-level authorization.
Verifies that users can only access their own resources, and admins can access all.
These tests directly address the 'Authorization' security flag in the analysis report.
"""

import pytest
from tests.conftest import TestingSessionLocal


def _create_report_for_user(db, user_id: int, report_type: str = "xray"):
    """Helper: directly insert a Report row for a given user."""
    from app.models.report import Report
    r = Report(doctor_id=user_id, report_type=report_type, status="completed", result_data={})
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def _get_user_id(db, email: str) -> int:
    from app.models.user import User
    return db.query(User).filter(User.email == email).first().id


class TestResourceLevelAuthorization:
    """
    Resource-level authorization: a user must own a report to delete it.
    Admins may delete any report.
    """

    def test_owner_can_delete_own_report(self, client, auth_headers):
        """The doctor who created a report can delete it."""
        db = TestingSessionLocal()
        user_id = _get_user_id(db, "testdoctor@diagnoai.com")
        report = _create_report_for_user(db, user_id)
        db.close()

        resp = client.delete(f"/api/reports/{report.id}", headers=auth_headers)
        assert resp.status_code == 200, resp.text
        assert "deleted" in resp.json().get("message", "").lower()

    def test_other_user_cannot_delete_report(self, client, auth_headers, patient_auth_headers):
        """A different user (patient) cannot delete another user's report."""
        db = TestingSessionLocal()
        # Create report belonging to the doctor, attempt delete as patient
        user_id = _get_user_id(db, "testdoctor@diagnoai.com")
        report = _create_report_for_user(db, user_id)
        db.close()

        resp = client.delete(f"/api/reports/{report.id}", headers=patient_auth_headers)
        assert resp.status_code == 403, resp.text

    def test_admin_can_delete_any_report(self, client, auth_headers, admin_auth_headers):
        """An admin can delete any user's report."""
        db = TestingSessionLocal()
        user_id = _get_user_id(db, "testdoctor@diagnoai.com")
        report = _create_report_for_user(db, user_id)
        db.close()

        resp = client.delete(f"/api/reports/{report.id}", headers=admin_auth_headers)
        assert resp.status_code == 200, resp.text

    def test_unauthenticated_cannot_delete_report(self, client, auth_headers):
        """Unauthenticated request to delete a report returns 401."""
        db = TestingSessionLocal()
        user_id = _get_user_id(db, "testdoctor@diagnoai.com")
        report = _create_report_for_user(db, user_id)
        db.close()

        resp = client.delete(f"/api/reports/{report.id}")
        assert resp.status_code == 401, resp.text

    def test_delete_nonexistent_report_returns_404(self, client, auth_headers):
        """Deleting a report that doesn't exist returns 404."""
        resp = client.delete("/api/reports/999999", headers=auth_headers)
        assert resp.status_code == 404, resp.text

    def test_history_only_returns_own_reports(self, client, auth_headers, patient_auth_headers):
        """History endpoint only returns the requests user's reports."""
        db = TestingSessionLocal()
        doctor_id = _get_user_id(db, "testdoctor@diagnoai.com")
        patient_id = _get_user_id(db, "patient@diagnoai.com")

        _create_report_for_user(db, doctor_id)
        _create_report_for_user(db, patient_id)
        db.close()

        # Doctor should only see their own report
        doctor_resp = client.get("/api/reports/history", headers=auth_headers)
        assert doctor_resp.status_code == 200
        doctor_reports = doctor_resp.json()
        assert len(doctor_reports) == 1

        # Patient should only see their own report
        patient_resp = client.get("/api/reports/history", headers=patient_auth_headers)
        assert patient_resp.status_code == 200
        patient_reports = patient_resp.json()
        assert len(patient_reports) == 1

        # The doctor's report ID should NOT appear in the patient's list
        doctor_report_ids = {r["id"] for r in doctor_reports}
        patient_report_ids = {r["id"] for r in patient_reports}
        assert doctor_report_ids.isdisjoint(patient_report_ids)


class TestAdminResourceAuthorization:
    """Admin endpoint security — only admins may access /api/admin/."""

    def test_doctor_cannot_access_admin_users(self, client, auth_headers):
        """A doctor role user cannot list admin users."""
        resp = client.get("/api/admin/users", headers=auth_headers)
        assert resp.status_code == 403, resp.text

    def test_patient_cannot_access_admin_users(self, client, patient_auth_headers):
        """A patient role user cannot list admin users."""
        resp = client.get("/api/admin/users", headers=patient_auth_headers)
        assert resp.status_code == 403, resp.text

    def test_unauthenticated_cannot_access_admin(self, client):
        """Unauthenticated request to admin endpoint returns 401."""
        resp = client.get("/api/admin/users")
        assert resp.status_code == 401, resp.text

    def test_admin_can_access_admin_users(self, client, admin_auth_headers):
        """Admin user can successfully list all users."""
        resp = client.get("/api/admin/users", headers=admin_auth_headers)
        assert resp.status_code == 200, resp.text
        assert isinstance(resp.json(), list)

    def test_admin_cannot_delete_themselves(self, client, admin_auth_headers):
        """Admin cannot bulk-delete their own account."""
        db = TestingSessionLocal()
        admin_id = _get_user_id(db, "admin@diagnoai.com")
        db.close()

        resp = client.post(
            "/api/admin/users/bulk-delete",
            json={"ids": [admin_id]},
            headers=admin_auth_headers,
        )
        assert resp.status_code == 400, resp.text


class TestFeedbackAuthorization:
    """Feedback endpoint requires authentication."""

    def test_unauthenticated_cannot_submit_feedback(self, client):
        resp = client.post("/api/feedback", json={"rating": "up"})
        assert resp.status_code == 401, resp.text

    def test_authenticated_can_submit_feedback(self, client, auth_headers):
        resp = client.post(
            "/api/feedback",
            json={"rating": "up", "report_type": "xray", "comment": "Looks accurate"},
            headers=auth_headers,
        )
        assert resp.status_code == 201, resp.text
        assert "id" in resp.json()

    def test_invalid_rating_rejected(self, client, auth_headers):
        resp = client.post(
            "/api/feedback",
            json={"rating": "sideways"},
            headers=auth_headers,
        )
        assert resp.status_code == 400, resp.text
