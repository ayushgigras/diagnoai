# DiagnoAI Backend

FastAPI backend for DiagnoAI application.

## Requirements

- Python 3.10+
- PostgreSQL
- Redis

## Environment Variables

Create `backend/.env` with:

```env
JWT_SECRET_KEY=your-long-random-secret
GEMINI_API_KEY=your-gemini-api-key
DATABASE_URL=postgresql://postgres:your_strong_password@localhost:5432/diagnoai
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
```

`JWT_SECRET_KEY` is required at startup.

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
3. Run API server:
   ```bash
   uvicorn app.main:app --reload
   ```
4. Run Celery worker (separate terminal):
   ```bash
   celery -A app.celery_app.celery_app worker --loglevel=info
   ```

## Database

- Run migrations:
  ```bash
  alembic upgrade head
  ```

## API Documentation

Once running, visit `http://127.0.0.1:8000/docs`.

## Role-Based Access Control (RBAC)

The system enforces three user roles:
- **Admin**: Full access to all endpoints.
- **Doctor**: Can access both X-Ray analysis and Lab analysis.
- **Patient**: Can access Lab analysis and view history, but is restricted from X-Ray analysis.

*Note: All public registrations are automatically assigned the `patient` role. Role elevation to `doctor` or `admin` must be performed by a system administrator.*

## Endpoint Notes

- `POST /api/xray/analyze` accepts multipart fields: `file`, `xray_type`, optional `patient_id`. Runs synchronously.
- `POST /api/lab/analyze-from-file` accepts multipart fields: `file`, optional `patient_id`. Runs via background tasks.
- `POST /api/lab/analyze-manual` accepts JSON body with `values` and optional `patient_id`.
- `WS /api/ws/{client_id}` connects a client for real-time WebSocket notifications.
