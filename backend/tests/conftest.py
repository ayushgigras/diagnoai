"""
Shared test fixtures for DiagnoAI backend tests.
Uses an in-memory SQLite database so tests never touch production data.
"""
import os
import sys
from unittest.mock import MagicMock

# Patch DATABASE_URL *before* any app module is imported so the production
# PostgreSQL engine is never created during test collection.
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

# Allow testclient host for TrustedHostMiddleware
os.environ["ALLOWED_HOSTS"] = "testserver,localhost,127.0.0.1"

# Disable rate limiting in tests
os.environ["RATELIMIT_ENABLED"] = "false"

# Mock celery so tests don't require celery/redis to be installed or running.
mock_celery_module = MagicMock()
sys.modules["celery"] = mock_celery_module

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app

# --------------- In-memory SQLite for tests ---------------
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# SQLite doesn't enforce FK constraints by default — enable them.
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_database():
    """Create all tables before each test, drop them after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    """Pre-configured TestClient for the FastAPI application."""
    test_client = TestClient(app)
    test_client.headers.update({"x-csrf-token": "test_csrf_token"})
    test_client.cookies.set("csrf_token", "test_csrf_token")
    return test_client


@pytest.fixture
def test_user_data():
    """Standard user registration payload."""
    return {
        "email": "testdoctor@diagnoai.com",
        "full_name": "Dr. Test",
        "password": "SecurePass1!",
        "role": "doctor",  # Note: registration ignores this and sets "patient"
    }


@pytest.fixture
def auth_headers(client, test_user_data):
    """Register a user, elevate to doctor, log in, and return Authorization headers."""
    # Register (creates a patient)
    client.post("/api/auth/register", json=test_user_data)
    # Elevate to doctor directly in the DB so existing tests pass
    db = TestingSessionLocal()
    from app.models.user import User
    user = db.query(User).filter(User.email == test_user_data["email"]).first()
    user.role = "doctor"
    db.commit()
    db.close()
    # Login
    login_resp = client.post(
        "/api/auth/login",
        data={"username": test_user_data["email"], "password": test_user_data["password"]},
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def patient_auth_headers(client):
    """Register a patient user and return Authorization headers."""
    patient_data = {
        "email": "patient@diagnoai.com",
        "full_name": "Patient Test",
        "password": "SecurePass1!",
    }
    client.post("/api/auth/register", json=patient_data)
    login_resp = client.post(
        "/api/auth/login",
        data={"username": patient_data["email"], "password": patient_data["password"]},
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers(client):
    """Register a user, elevate to admin, and return Authorization headers."""
    admin_data = {
        "email": "admin@diagnoai.com",
        "full_name": "Admin Test",
        "password": "SecurePass1!",
    }
    client.post("/api/auth/register", json=admin_data)
    db = TestingSessionLocal()
    from app.models.user import User
    user = db.query(User).filter(User.email == admin_data["email"]).first()
    user.role = "admin"
    db.commit()
    db.close()
    login_resp = client.post(
        "/api/auth/login",
        data={"username": admin_data["email"], "password": admin_data["password"]},
    )
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

