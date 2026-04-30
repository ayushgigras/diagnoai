"""Tests for feedback endpoint payload validation and auth rules."""

from tests.conftest import TestingSessionLocal


def _get_user_id(db, email: str) -> int:
    from app.models.user import User

    return db.query(User).filter(User.email == email).first().id


def _create_report_for_user(db, user_id: int):
    from app.models.report import Report

    report = Report(doctor_id=user_id, report_type="xray", status="completed", result_data={})
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def test_feedback_submit_up_success(client, auth_headers):
    """Authenticated user can submit up feedback."""
    response = client.post(
        "/api/feedback",
        headers=auth_headers,
        json={"rating": "up", "report_type": "xray", "comment": "Accurate result"},
    )

    assert response.status_code == 201
    body = response.json()
    assert "id" in body
    assert body["message"] == "Feedback submitted successfully"


def test_feedback_submit_down_success(client, auth_headers):
    """Authenticated user can submit down feedback."""
    response = client.post(
        "/api/feedback",
        headers=auth_headers,
        json={"rating": "down", "report_type": "lab", "comment": "Needs improvement"},
    )

    assert response.status_code == 201
    body = response.json()
    assert "id" in body
    assert body["message"] == "Feedback submitted successfully"


def test_feedback_invalid_rating_returns_400(client, auth_headers):
    """Unsupported rating values are rejected with HTTP 400."""
    response = client.post(
        "/api/feedback",
        headers=auth_headers,
        json={"rating": "meh"},
    )

    assert response.status_code == 400
    assert "Rating must be" in response.json()["detail"]


def test_feedback_unauthenticated_denied(client):
    """Unauthenticated users cannot submit feedback."""
    response = client.post("/api/feedback", json={"rating": "up"})
    assert response.status_code == 401


def test_feedback_report_id_is_linked(client, auth_headers):
    """Submitted report_id is accepted and persisted in the feedback record."""
    db = TestingSessionLocal()
    user_id = _get_user_id(db, "testdoctor@diagnoai.com")
    report = _create_report_for_user(db, user_id)

    response = client.post(
        "/api/feedback",
        headers=auth_headers,
        json={"rating": "up", "report_id": report.id, "report_type": "xray"},
    )

    assert response.status_code == 201
    body = response.json()
    assert "id" in body
    assert body["message"] == "Feedback submitted successfully"

    from app.models.feedback import Feedback

    saved = db.query(Feedback).filter(Feedback.id == body["id"]).first()
    assert saved is not None
    assert saved.report_id == report.id
    db.close()
