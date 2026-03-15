# DiagnoAI - Intelligent Healthcare Diagnostics

DiagnoAI is a full-stack AI-powered diagnostic system designed to assist healthcare professionals in analyzing medical imaging (X-Rays) and laboratory reports. It ships with two frontends — a **React + Vite SPA** for production use and a **Streamlit** app for rapid prototyping and demos.

## Features

- **🔬 X-Ray Analysis**: Automated detection of conditions like Pneumonia, COVID-19, and Fractures from X-ray images using deep learning (TorchXRayVision), processing synchronously for immediate results.
- **🧪 Lab Report Analysis**: Intelligent parsing of PDF/Image lab reports using OCR (Google Gemini Vision), with automatic interpretation of values against reference ranges.
- **📝 Intelligent Insights**: Confidence scores, probability distributions, and clinical recommendations.
- **🔒 Secure by Design**: JWT authentication, CSRF protection, bcrypt password hashing, rate limiting, security headers, input validation, and role-based access control.
- **📊 Report History**: Persistent report storage with per-user history via PostgreSQL.
- **⚡ Background Processing**: Long-running Lab OCR tasks run asynchronously via Celery + Redis.
- **🔔 Real-time Notifications**: WebSockets-based real-time updates for background tasks and system alerts.

## Architecture

```
┌─────────────┐       ┌──────────────┐       ┌──────────┐
│  React SPA  │──────►│  FastAPI      │──────►│PostgreSQL│
│  (Vite+TS)  │  JWT  │  REST API     │  ORM  │          │
└──────┬──────┘       └──────┬──┬────┘       └──────────┘
       │        WebSocket    │  │
       └─────────────────────┘  │
                                │
                        ┌───────▼───────┐       ┌──────────┐
                        │  Celery       │──────►│  Redis   │
                        │  Workers      │       │  Broker  │
                        └───────┬───────┘       └──────────┘
                                │
                       ┌────────▼─────┐        ┌──────────────┐
                       │ Google Gemini│        │TorchXRayVision│
                       │ (Lab OCR/AI) │        │  (X-Ray AI)   │
                       └──────────────┘        └──────────────┘
```

| Layer             | Technology                                |
|-------------------|-------------------------------------------|
| Frontend (SPA)    | React 18, TypeScript, Vite, Tailwind CSS  |
| Frontend (Demo)   | Streamlit                                 |
| Backend API       | FastAPI, Pydantic, SQLAlchemy, WebSockets  |
| Authentication    | JWT (python-jose), bcrypt (passlib), CSRF |
| Database          | PostgreSQL, Alembic migrations            |
| Task Queue        | Celery + Redis                            |
| AI / ML           | PyTorch, TorchXRayVision, Google Gemini   |
| Testing           | pytest (backend), Vitest (frontend)       |

## Project Structure

```
diagnoai/
├── frontend/                 # React + Vite + TypeScript application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── common/       # Navbar, Footer, NotificationsHelper, etc.
│   │   │   ├── lab/          # FileUploader, LabResults
│   │   │   └── xray/         # ImageUploader, AnalysisResults
│   │   ├── pages/            # Route pages (Home, Login, XRay, Lab, History, Profile)
│   │   ├── services/         # Axios API layer & WebSockets
│   │   ├── store/            # Zustand auth and UI store
│   │   └── __tests__/        # Vitest test suites
│   └── package.json
├── backend/                  # FastAPI + Python application
│   ├── app/
│   │   ├── main.py           # App entry, middleware, CSRF
│   │   ├── config.py         # Pydantic settings
│   │   ├── database.py       # SQLAlchemy engine + session
│   │   ├── dependencies.py   # Auth dependencies
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── routers/          # API route handlers (incl. ws.py)
│   │   ├── services/         # Business logic
│   │   └── utils/            # Utilities
│   ├── tests/                # pytest test suites
│   ├── alembic/              # Database migrations
│   └── requirements.txt
├── streamlit_app.py          # Streamlit demo frontend
└── docker-compose.yml        # PostgreSQL + Redis infrastructure
```

## Quick Start

### Prerequisites
- Node.js (v18+)
- Python (3.10+ recommended)
- Docker (recommended for PostgreSQL + Redis)

### 1) Start Infrastructure (PostgreSQL + Redis)

```bash
docker compose up -d
```

### 2) Backend Setup

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:

```env
JWT_SECRET_KEY=<YOUR_JWT_SECRET_KEY>
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
DATABASE_URL=postgresql://postgres:<YOUR_DB_PASSWORD>@localhost:5432/diagnoai
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
ADMIN_REGISTRATION_KEY=<YOUR_ADMIN_SECRET_KEY>
APP_ENV=development
```

Run database migrations:

```bash
alembic upgrade head
```

Run API:

```bash
uvicorn app.main:app --reload
```

Run worker in a second terminal:

```bash
celery -A app.celery_app.celery_app worker --loglevel=info
```

Server runs at `http://localhost:8000` and docs at `http://localhost:8000/docs`.

### 3) Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Client runs at `http://localhost:5173`.

### 4) Streamlit Frontend (Alternative)

```bash
streamlit run streamlit_app.py
```

Opens at `http://localhost:8501`. Ensure the backend API server is running on port 8000.

## API Endpoints

| Method | Endpoint                  | Auth | Description                          |
|--------|---------------------------|------|--------------------------------------|
| POST   | `/api/auth/register`      | No   | Register a new user                  |
| POST   | `/api/auth/login`         | No   | Login and receive JWT token          |
| GET    | `/api/auth/me`            | Yes  | Get current user profile             |
| POST   | `/api/xray/analyze`       | Yes  | Upload X-ray for synchronous analysis|
| POST   | `/api/lab/analyze-manual` | Yes  | Analyze manually entered lab values  |
| POST   | `/api/lab/upload-file`    | Yes  | Upload lab report for OCR extraction |
| POST   | `/api/lab/analyze-from-file`| Yes| Upload & analyze lab report end-to-end|
| GET    | `/api/tasks/status/{id}`  | Yes  | Check background task status         |
| GET    | `/api/reports/history`    | Yes  | Get authenticated user's report history|
| WS     | `/api/ws/{client_id}`     | No*  | Connect to WebSocket notifications   |
| GET    | `/api/admin/users`        | Admin| List all users                       |
| PATCH  | `/api/admin/users/{id}/role`| Admin| Update a user's role               |
| DELETE | `/api/admin/users/{id}`   | Admin| Delete a user                        |
| GET    | `/api/health`             | No   | Health check                         |

## Security

DiagnoAI implements the following security best practices:

| Practice                    | Implementation                                     |
|-----------------------------|---------------------------------------------------|
| **Authentication**          | JWT Bearer tokens (OAuth2PasswordBearer)           |
| **Authorization**           | Role-based access control (doctor, admin)          |
| **CSRF Protection**         | Custom middleware verifying tokens and cookies     |
| **Password Hashing**        | bcrypt via passlib                                 |
| **Password Validation**     | Min 8 chars, uppercase, lowercase, digit, special  |
| **Rate Limiting**           | slowapi — 60 req/min global, 5/min register, 10/min login |
| **Security Headers**        | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, HSTS, CSP, Referrer-Policy, Permissions-Policy |
| **CORS**                    | Whitelisted origins, restricted methods/headers    |
| **SQL Injection Prevention**| SQLAlchemy ORM (parameterized queries)             |
| **XSS Prevention**          | CSP headers + React auto-escaping                  |
| **Input Validation**        | Pydantic schemas, file type/size validation        |
| **File Upload Security**    | UUID filenames, extension whitelist, size limits   |
| **Trusted Hosts**           | TrustedHostMiddleware                              |

## Testing

### Backend Tests (pytest)

```bash
cd backend
pytest tests/ -v
```

Tests cover:
- User registration & login flows
- Password strength validation (reject weak passwords)
- JWT authentication & authorization
- Security header verification
- Endpoint protection (all protected routes reject unauthenticated requests)
- Input validation

### Frontend Tests (Vitest)

```bash
cd frontend
npm test
```

Tests cover:
- Auth store (login, logout, localStorage persistence)
- App component rendering
- Navigation structure

## Notes

- Auth is JWT-based. `JWT_SECRET_KEY` is required in production (a dev fallback is used automatically when `APP_ENV=development`).
- `ADMIN_REGISTRATION_KEY` is always required at startup. It is used to gate admin-role registrations via `POST /api/auth/register`.
- Background analysis (`/api/lab/analyze-from-file`) uses Celery + Redis. X-ray analysis operates synchronously.
- `patient_id` can be passed in analyze requests; if omitted, backend resolves a fallback patient.
- New self-registrations default to the `patient` role. To register as `admin`, supply `admin_secret` matching `ADMIN_REGISTRATION_KEY` in the request body.

## UI Features

- **📊 X-Ray Analysis Dashboard**: SVG confidence ring, 4-stat summary row (Prediction, Confidence, Findings, Severity), auto-expanded XAI explainability cards with numbered steps, full probability distribution with highlighted primary prediction, and Grad-CAM heatmap visualization.
- **🧪 Lab Analysis Dashboard**: Assessment banner with AI interpretation callout, 4-stat dashboard (Total, Normal, Abnormal, Critical), individual parameter cards with 3-zone gauge bars (Low/Normal/High), direction arrows, and numbered recommendation cards.
- **📥 PDF Report Generation**: Downloadable diagnostic reports using jsPDF with auto-table formatting, severity-colored badges, structured findings tables, and XAI explainability sections. Supports both X-Ray and Lab report formats.

## AI Capabilities

- **🧪 Lab Report Engine (Fully Integrated)**: Utilizes Google's `gemini-2.5-flash` Multimodal Vision API to perform zero-shot, dynamic table extraction from raw laboratory images/PDFs. It securely maps parameters to reference ranges and acts as a clinical assistant to provide plain-English interpretations.
- **🔬 X-Ray Model**: Uses TorchXRayVision for multi-label pathology detection on chest X-rays. To connect additional models, update `backend/app/services/xray_service.py`.

## License

MIT

