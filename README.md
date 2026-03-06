# DiagnoAI - Intelligent Healthcare Diagnostics

DiagnoAI is a full-stack AI-powered diagnostic system designed to assist healthcare professionals in analyzing medical imaging (X-Rays) and laboratory reports.

![DiagnoAI](https://via.placeholder.com/800x400?text=DiagnoAI+Dashboard)

## Features

- **🔬 X-Ray Analysis**: Automated detection of conditions like Pneumonia, COVID-19, and Fractures from X-ray images using deep learning (TorchXRayVision).
- **🧪 Lab Report Analysis**: Intelligent parsing of PDF/Image lab reports using OCR (Google Gemini Vision), with automatic interpretation of values against reference ranges.
- **📝 Intelligent Insights**: Confidence scores, probability distributions, and clinical recommendations.
- **🔒 Secure by Design**: JWT authentication, bcrypt password hashing, rate limiting, security headers, input validation, and role-based access control.
- **📊 Report History**: Persistent report storage with per-user history via PostgreSQL.
- **⚡ Background Processing**: Long-running AI inference runs asynchronously via Celery + Redis.

## Architecture

```
┌─────────────┐       ┌──────────────┐       ┌──────────┐
│  React SPA  │──────►│  FastAPI      │──────►│PostgreSQL│
│  (Vite+TS)  │  JWT  │  REST API     │  ORM  │          │
└─────────────┘       └──────┬───────┘       └──────────┘
                             │
                     ┌───────▼───────┐       ┌──────────┐
                     │  Celery       │──────►│  Redis   │
                     │  Workers      │       │  Broker  │
                     └───────┬───────┘       └──────────┘
                             │
                ┌────────────┼────────────┐
                ▼                         ▼
        ┌──────────────┐        ┌──────────────┐
        │TorchXRayVision│       │ Google Gemini │
        │  (X-Ray AI)   │       │ (Lab OCR/AI)  │
        └──────────────┘        └──────────────┘
```

| Layer             | Technology                                |
|-------------------|-------------------------------------------|
| Frontend          | React 18, TypeScript, Vite, Tailwind CSS  |
| Backend API       | FastAPI, Pydantic, SQLAlchemy              |
| Authentication    | JWT (python-jose), bcrypt (passlib)       |
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
│   │   │   ├── common/       # Navbar, Footer, ProtectedRoute, Button, Card
│   │   │   ├── lab/          # FileUploader, ExtractedDataPreview, LabResults
│   │   │   └── xray/         # ImageUploader, XRayTypeSelector, AnalysisResults
│   │   ├── pages/            # Route pages (Home, Login, Register, XRay, Lab, History, About)
│   │   ├── services/         # Axios API layer
│   │   ├── store/            # Zustand auth store
│   │   └── __tests__/        # Vitest test suites
│   └── package.json
├── backend/                  # FastAPI + Python application
│   ├── app/
│   │   ├── main.py           # App entry, middleware, security headers
│   │   ├── config.py         # Pydantic settings
│   │   ├── database.py       # SQLAlchemy engine + session
│   │   ├── dependencies.py   # Auth dependencies (JWT decode, role checks)
│   │   ├── models/           # SQLAlchemy ORM models (User, Patient, Report)
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── routers/          # API route handlers
│   │   ├── services/         # Business logic (xray_service, lab_service, ocr_service)
│   │   └── utils/            # Security, file upload, PDF generation
│   ├── tests/                # pytest test suites
│   ├── alembic/              # Database migrations
│   └── requirements.txt
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
JWT_SECRET_KEY=your-long-random-secret
GEMINI_API_KEY=your-gemini-api-key
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/diagnoai
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
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

## API Endpoints

| Method | Endpoint                  | Auth | Description                          |
|--------|---------------------------|------|--------------------------------------|
| POST   | `/api/auth/register`      | No   | Register a new user                  |
| POST   | `/api/auth/login`         | No   | Login and receive JWT token          |
| GET    | `/api/auth/me`            | Yes  | Get current user profile             |
| POST   | `/api/xray/analyze`       | Yes  | Upload X-ray for background analysis |
| POST   | `/api/lab/analyze-manual` | Yes  | Analyze manually entered lab values  |
| POST   | `/api/lab/upload-file`    | Yes  | Upload lab report for OCR extraction |
| POST   | `/api/lab/analyze-from-file`| Yes | Upload & analyze lab report end-to-end|
| GET    | `/api/tasks/status/{id}`  | Yes  | Check background task status         |
| GET    | `/api/reports/history`    | Yes  | Get authenticated user's report history|
| GET    | `/api/health`             | No   | Health check                         |

## Security

DiagnoAI implements the following security best practices:

| Practice                    | Implementation                                     |
|-----------------------------|---------------------------------------------------|
| **Authentication**          | JWT Bearer tokens (OAuth2PasswordBearer)           |
| **Authorization**           | Role-based access control (doctor, admin)          |
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

- Auth is JWT-based and `JWT_SECRET_KEY` is required (app will not start in production without it).
- Background analysis (`/api/xray/analyze`, `/api/lab/analyze-from-file`) uses Celery + Redis.
- `patient_id` can be passed in analyze requests; if omitted, backend resolves a fallback patient.

## AI Capabilities

- **🧪 Lab Report Engine (Fully Integrated)**: Utilizes Google's `gemini-2.5-flash` Multimodal Vision API to perform zero-shot, dynamic table extraction from raw laboratory images/PDFs. It securely maps parameters to reference ranges and acts as a clinical assistant to provide plain-English interpretations.
- **🔬 X-Ray Model**: Uses TorchXRayVision for multi-label pathology detection on chest X-rays. To connect additional models, update `backend/app/services/xray_service.py`.

## License

MIT

