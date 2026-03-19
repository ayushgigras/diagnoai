import pytest
from fastapi.testclient import TestClient
import os

os.makedirs("tests/test_assets", exist_ok=True)

def test_patient_can_access_xray(client: TestClient, patient_auth_headers: dict):
    with open("tests/test_assets/dummy_xray.jpg", "wb") as f:
        f.write(b"dummy")
    with open("tests/test_assets/dummy_xray.jpg", "rb") as f:
        response = client.post(
            "/api/xray/analyze",
            headers=patient_auth_headers,
            data={"xray_type": "chest"},
            files={"file": ("dummy_xray.jpg", f, "image/jpeg")}
        )
    # The analyze internally might fail if no dummy logic, but it should NOT be 403.
    assert response.status_code in [200, 422, 500] 
    assert response.status_code != 403

def test_doctor_can_access_xray(client: TestClient, auth_headers: dict):
    with open("tests/test_assets/dummy_xray.jpg", "wb") as f:
        f.write(b"dummy")
    with open("tests/test_assets/dummy_xray.jpg", "rb") as f:
        response = client.post(
            "/api/xray/analyze",
            headers=auth_headers,
            data={
                "xray_type": "chest",
                "patient_first_name": "John",
                "patient_last_name": "Doe"
            },
            files={"file": ("dummy_xray.jpg", f, "image/jpeg")}
        )
    assert response.status_code in [200, 422, 500]
    assert response.status_code != 403

def test_admin_cannot_access_xray(client: TestClient, admin_auth_headers: dict):
    # Depending on test setup, dummy files might not even be read if 403 fires early
    response = client.post(
        "/api/xray/analyze",
        headers=admin_auth_headers,
        data={"xray_type": "chest"},
        files={"file": ("dummy.jpg", b"fake image", "image/jpeg")}
    )
    assert response.status_code == 403
    assert "Admins should not perform diagnostic analysis" in response.json().get("detail", "")

def test_unauthenticated_cannot_access_xray(client: TestClient):
    response = client.post(
        "/api/xray/analyze",
        data={"xray_type": "chest"},
        files={"file": ("dummy.jpg", b"fake image", "image/jpeg")}
    )
    assert response.status_code == 401
