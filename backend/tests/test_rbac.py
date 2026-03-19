"""Tests for Role-Based Access Control (RBAC) enforcement."""


class TestRegistrationRBAC:
    """Verify registration always assigns the patient role."""

    def test_register_admin_rejected_without_key(self, client):
        """If client sends role='admin' without admin_secret, they get 403."""
        payload = {
            "email": "sneaky@diagnoai.com",
            "full_name": "Sneaky User",
            "password": "SecurePass1!",
            "role": "admin",
        }
        resp = client.post("/api/auth/register", json=payload)
        assert resp.status_code == 403

    def test_register_default_role_is_patient(self, client):
        """Registration without specifying role defaults to patient."""
        payload = {
            "email": "default@diagnoai.com",
            "full_name": "Default User",
            "password": "SecurePass1!",
        }
        resp = client.post("/api/auth/register", json=payload)
        assert resp.status_code == 200
        assert resp.json()["role"] == "patient"


    pass


class TestLabRBAC:
    """Verify Lab endpoints allow all authenticated users."""

    def test_patient_allowed_lab_manual(self, client, patient_auth_headers):
        """Patient users should NOT get 403 on lab analyze-manual."""
        resp = client.post(
            "/api/lab/analyze-manual",
            json={"values": {"wbc": 7000}},
            headers=patient_auth_headers,
        )
        # Should not be 401 or 403 — may fail for unrelated reasons (missing service etc.)
        assert resp.status_code not in (401, 403)

    def test_patient_allowed_lab_upload(self, client, patient_auth_headers):
        """Patient users should NOT get 403 on lab upload-file."""
        resp = client.post("/api/lab/upload-file", headers=patient_auth_headers)
        # 422 = missing file (expected), but NOT 401/403
        assert resp.status_code not in (401, 403)


class TestMeEndpointRBAC:
    """Verify /me returns role in the response."""

    def test_me_returns_role_patient(self, client, patient_auth_headers):
        resp = client.get("/api/auth/me", headers=patient_auth_headers)
        assert resp.status_code == 200
        assert resp.json()["role"] == "patient"

    def test_me_returns_role_doctor(self, client, auth_headers):
        resp = client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["role"] == "doctor"

    def test_me_returns_role_admin(self, client, admin_auth_headers):
        resp = client.get("/api/auth/me", headers=admin_auth_headers)
        assert resp.status_code == 200
        assert resp.json()["role"] == "admin"
