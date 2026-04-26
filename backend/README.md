# DiagnoAI Backend

FastAPI backend for DiagnoAI — live at [https://diagnoai.app](https://diagnoai.app)

## Requirements

- Python 3.10+
- PostgreSQL 15+
- Redis 7+

## Environment Variables

Create `backend/.env` with:

```env
JWT_SECRET_KEY=<YOUR_JWT_SECRET_KEY>
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
DATABASE_URL=postgresql://postgres:<YOUR_DB_PASSWORD>@localhost:5432/diagnoai
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
ADMIN_REGISTRATION_KEY=<YOUR_ADMIN_SECRET_KEY>
GOOGLE_CLIENT_ID=<YOUR_GOOGLE_OAUTH_CLIENT_ID>
FRONTEND_URL=http://localhost:5173
SMTP_HOST=<YOUR_SMTP_HOST>
SMTP_PORT=587
SMTP_USERNAME=<YOUR_SMTP_USERNAME>
SMTP_PASSWORD=<YOUR_SMTP_PASSWORD>
SMTP_SENDER_EMAIL=<YOUR_SENDER_EMAIL>
SMTP_USE_TLS=true
APP_ENV=development
RATELIMIT_ENABLED=true
ALLOWED_HOSTS=localhost,127.0.0.1
BACKEND_CORS_ORIGINS=http://localhost:5173
```

`JWT_SECRET_KEY` is required at startup in production (a dev fallback is used automatically when `APP_ENV=development`). `ADMIN_REGISTRATION_KEY` is always required and gates admin-role self-registration.

## Setup

1. Create and activate virtual environment:
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run migrations:
   ```bash
   alembic upgrade head
   ```
4. Run API server:
   ```bash
   uvicorn app.main:app --reload
   ```
5. Run Celery worker (separate terminal):
   ```bash
   celery -A app.celery_app.celery_app worker --loglevel=info
   ```

## Testing

```bash
pytest tests/ -v --ignore=tests/test_api.py
```

Tests cover registration, login, JWT auth, security headers, RBAC, authorization, and X-Ray/Lab service logic.

## API Documentation

Once running, visit `http://127.0.0.1:8000/docs`.

## Role-Based Access Control (RBAC)

- **Admin**: Full access to all endpoints including user management.
- **Doctor**: Can access X-Ray analysis, Lab analysis, and report history.
- **Patient**: Can access Lab analysis and view own report history. Restricted from X-Ray analysis.

New self-registrations default to the `patient` role. To register as `admin`, supply `admin_secret` matching `ADMIN_REGISTRATION_KEY` in the request body.

## Admin Registration

```json
{
  "email": "admin@example.com",
  "full_name": "Admin User",
  "password": "SecurePass1!",
  "role": "admin",
  "admin_secret": "<ADMIN_REGISTRATION_KEY>"
}
```