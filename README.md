# DiagnoAI — Intelligent Healthcare Diagnostics

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Security Score](https://img.shields.io/badge/Security-94%2F100-brightgreen)](./docs/DEPLOYMENT.md)

DiagnoAI is a full-stack AI-powered diagnostic system designed to assist healthcare professionals in analyzing medical imaging (X-Rays) and laboratory reports. It ships with two frontends — a **React + Vite SPA** for production use and a **Streamlit** app for rapid prototyping and demos.

📖 **Docs:** [API Reference](./docs/API.md) · [Deployment Guide](./docs/DEPLOYMENT.md) · [Contributing](./CONTRIBUTING.md)

## Features

- **🔬 X-Ray Analysis**: Automated detection of conditions like Pneumonia, COVID-19, and Fractures from X-ray images using deep learning (TorchXRayVision), processing synchronously for immediate results.
- **🧪 Lab Report Analysis**: Intelligent parsing of PDF/Image lab reports using OCR (Google Gemini Vision), with automatic interpretation of values against reference ranges and clinical flags (H/L/*).
- **🤖 Context-Aware Medical Chatbot**: A global AI assistant that understands the medical report currently on your screen and answers your health queries in plain English.
- **📝 Intelligent Insights**: Confidence scores, probability distributions, and plain-English clinical recommendations.
- **🔒 Secure by Design**: JWT authentication, CSRF protection, bcrypt password hashing, rate limiting, security headers, input validation, and role-based access control (RBAC).
- **🔑 Modern Auth Options**: Email/password login, Google sign-in, forgot-password flow, and token-based password reset.
- **📊 Report History**: Persistent report storage with per-user history and resource-level authorization.
- **🛠️ Admin Control**: User activation/deactivation, role management, and bulk report deletion.
- **⚡ Background Processing**: Long-running Lab OCR tasks run asynchronously via Celery + Redis.
- **🔔 Real-time Notifications**: WebSockets-based real-time updates for background tasks and system alerts.
- **💬 AI Feedback System**: Users can rate AI analysis accuracy (👍/👎 + comments), helping improve model quality over time.

## Architecture

## Architecture

```mermaid
graph TD
    %% Define Styles
    classDef react fill:#00d8ff,stroke:#000,stroke-width:2px,color:#000
    classDef fastapi fill:#059487,stroke:#000,stroke-width:2px,color:#fff
    classDef db fill:#336791,stroke:#000,stroke-width:2px,color:#fff
    classDef redis fill:#d82c20,stroke:#000,stroke-width:2px,color:#fff
    classDef ai fill:#fbbc05,stroke:#000,stroke-width:2px,color:#000

    subgraph Client Tier ["Client Tier"]
        UI["React SPA<br/>(Vite, TS)"]:::react
    end

    subgraph Application Tier ["Application Tier"]
        API["FastAPI Backend<br/>REST + WebSockets"]:::fastapi
        Celery["Celery Workers<br/>(Async Tasks)"]:::fastapi
        
        API -- "Enqueues Tasks" --> Celery
    end

    subgraph Data Tier ["Data Tier"]
        DB[("PostgreSQL")]:::db
        Broker[("Redis<br/>(Broker/Backend)")]:::redis
        
        API -- "SQLAlchemy ORM" --> DB
        Celery -- "Read/Write" --> DB
        API -- "Task Comm" --> Broker
        Celery -- "Fetch Task" --> Broker
    end

    subgraph AI Tier ["AI Inference engines"]
        OCR["Google Gemini<br/>(Vision / LLM)"]:::ai
        Vision["TorchXRayVision<br/>(DenseNet)"]:::ai
        
        Celery -- "Extract Lab Data" --> OCR
        API -- "Sync X-Ray Infer" --> Vision
    end

    UI -- "JWT / HTTPS" --> API
    UI -. "WS Messages" .-> API
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
GOOGLE_CLIENT_ID=<YOUR_GOOGLE_OAUTH_CLIENT_ID>
FRONTEND_URL=http://localhost:5173
SMTP_HOST=<YOUR_SMTP_HOST>
SMTP_PORT=587
SMTP_USERNAME=<YOUR_SMTP_USERNAME>
SMTP_PASSWORD=<YOUR_SMTP_PASSWORD>
SMTP_SENDER_EMAIL=<YOUR_SENDER_EMAIL>
SMTP_USE_TLS=true
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

Optional `frontend/.env` for Google sign-in:

```env
VITE_GOOGLE_CLIENT_ID=<YOUR_GOOGLE_OAUTH_CLIENT_ID>
VITE_API_URL=http://localhost:8000/api
```

Client runs at `http://localhost:5173`.

### 4) Streamlit Frontend (Alternative)

```bash
streamlit run streamlit_app.py
```

Opens at `http://localhost:8501`. Ensure the backend API server is running on port 8000.

## 🚀 Production Deployment (Docker + Nginx)

For full production, DiagnoAI utilizes `docker-compose.prod.yml` which deploys Nginx as a reverse proxy alongside PostgreSQL, Redis, FastAPI, Celery, and the Vite SPA built assets.

1. Ensure `nginx/nginx.conf` and `docker-compose.prod.yml` are present.
2. Edit your `.env` properly with `APP_ENV=production` and strong secrets.
3. Build and deploy:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
Your application will be served exclusively over port 80 (or 443 with SSL certs) with static files directly cached by Nginx.

## API Endpoints

| Method | Endpoint                  | Auth | Description                          |
|--------|---------------------------|------|--------------------------------------|
| POST   | `/api/auth/register`      | No   | Register a new user                  |
| POST   | `/api/auth/login`         | No   | Login and receive JWT token          |
| POST   | `/api/auth/google`        | No   | Sign in with Google ID token         |
| POST   | `/api/auth/forgot-password` | No | Request password reset link          |
| POST   | `/api/auth/reset-password`  | No | Reset password using reset token     |
| GET    | `/api/auth/me`            | Yes  | Get current user profile             |
| POST   | `/api/xray/analyze`       | Yes  | Upload X-ray for synchronous analysis|
| POST   | `/api/lab/analyze-manual` | Yes  | Analyze manually entered lab values  |
| POST   | `/api/lab/upload-file`    | Yes  | Upload lab report for OCR extraction |
| POST   | `/api/lab/analyze-from-file`| Yes| Upload & analyze lab report end-to-end|
| GET    | `/api/tasks/status/{id}`  | Yes  | Check background task status         |
| GET    | `/api/reports/history`    | Yes  | Get authenticated user's report history|
| DELETE | `/api/reports/{id}`       | Yes* | Delete a report (Owner or Admin only) |
| WS     | `/api/ws/{client_id}`     | No*  | Connect to WebSocket notifications   |
| GET    | `/api/admin/users`        | Admin| List all users                       |
| PATCH  | `/api/admin/users/{id}/role`| Admin| Update a user's role               |
| PATCH  | `/api/admin/users/{id}/status`| Admin| Activate/Deactivate a user         |
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

## Troubleshooting

- **"CSRF token missing" error**: Clear cookies and reload the page.
- **Celery worker not connecting**: Check that Redis is running on port 6379.
- **Database connection error**: Verify `DATABASE_URL` in `.env` and that `docker compose` is running.
- **TorchXRayVision model slow on first load**: The model is cached after the first inference; subsequent calls are fast.
- **Frontend showing CORS error**: Verify `VITE_API_URL` matches the backend URL and `BACKEND_CORS_ORIGINS` includes the frontend URL.

## Environment Variables

| Variable | Description | Required | Example |
|---|---|---|---|
| JWT_SECRET_KEY | Secret for signing JWT tokens | Yes (prod) | random 32+ char string |
| GEMINI_API_KEY | Google Gemini API key for lab OCR | Yes | AIza... |
| DATABASE_URL | PostgreSQL connection string | Yes | postgresql://... |
| CELERY_BROKER_URL | Redis URL for Celery | Yes | redis://localhost:6379/0 |
| CELERY_RESULT_BACKEND | Redis URL for results | Yes | redis://localhost:6379/1 |
| ADMIN_REGISTRATION_KEY | Secret to register admin accounts | Yes | random string |
| GOOGLE_CLIENT_ID | Google OAuth client ID (backend verification) | No | 123...apps.googleusercontent.com |
| FRONTEND_URL | Frontend base URL used to build reset links | No | http://localhost:5173 |
| SMTP_HOST | SMTP host for password reset emails | No | smtp.gmail.com |
| SMTP_PORT | SMTP port | No | 587 |
| SMTP_USERNAME | SMTP username | No | your-email@gmail.com |
| SMTP_PASSWORD | SMTP app password / SMTP password | No | app-specific-password |
| SMTP_SENDER_EMAIL | From email for reset emails | No | your-email@gmail.com |
| SMTP_USE_TLS | Enable STARTTLS for SMTP | No | true |
| APP_ENV | Environment (development/production) | No | development |
| RATELIMIT_ENABLED | Enable/disable rate limiting | No | true |
| ALLOWED_HOSTS | Comma-separated allowed hostnames | No | localhost,127.0.0.1 |
| BACKEND_CORS_ORIGINS | Allowed frontend origins | No | http://localhost:5173 |

## Known Limitations

- Mobile layout not fully optimized (planned improvement)
- WebSocket reconnection is manual (handled by useWebSocket hook)
- X-Ray model supports chest X-rays only currently
- Lab report OCR accuracy depends on image quality

## Notes

- Auth is JWT-based. `JWT_SECRET_KEY` is required in production (a dev fallback is used automatically when `APP_ENV=development`).
- `ADMIN_REGISTRATION_KEY` is always required at startup. It is used to gate admin-role registrations via `POST /api/auth/register`.
- Google sign-in requires `GOOGLE_CLIENT_ID` on the backend and `VITE_GOOGLE_CLIENT_ID` on the frontend.
- Password reset emails use SMTP settings when configured; in development, the forgot-password response also includes a direct `reset_url` for local testing.
- Background analysis (`/api/lab/analyze-from-file`) uses Celery + Redis. X-ray analysis operates synchronously.
- `patient_id` can be passed in analyze requests; if omitted, backend resolves a fallback patient.
- New self-registrations default to the `patient` role. To register as `admin`, supply `admin_secret` matching `ADMIN_REGISTRATION_KEY` in the request body.

## UI Features

- **📊 X-Ray Analysis Dashboard**: SVG confidence ring, 4-stat summary row (Prediction, Confidence, Findings, Severity), auto-expanded XAI explainability cards with numbered steps, full probability distribution with highlighted primary prediction, and Grad-CAM heatmap visualization.
- **🧪 Lab Analysis Dashboard**: Assessment banner with AI interpretation callout, 4-stat dashboard (Total, Normal, Abnormal, Critical), individual parameter cards with 3-zone gauge bars (Low/Normal/High), direction arrows, and numbered recommendation cards.
- **📥 PDF Report Generation**: Downloadable diagnostic reports using jsPDF with auto-table formatting, severity-colored badges, structured findings tables, and XAI explainability sections. Supports both X-Ray and Lab report formats.
- **💬 Medical Chatbot Widget**: Floating UI element powered by Framer Motion, enabling on-demand, context-aware conversations about active reports with smooth animations and professional aesthetics.

## AI Capabilities

- **🧪 Lab Report Engine (Fully Integrated)**: Utilizes Google's `gemini-2.5-flash` Multimodal Vision API to perform zero-shot, dynamic table extraction from raw laboratory images/PDFs. It securely maps parameters to reference ranges and acts as a clinical assistant to provide plain-English interpretations.
- **🔬 X-Ray Model**: Uses TorchXRayVision for multi-label pathology detection on chest X-rays. To connect additional models, update `backend/app/services/xray_service.py`.

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

- Fork the repository and create a feature branch
- Write tests for new functionality
- Run `pytest tests/ -v` (backend) and `npm test` (frontend) before submitting
- Follow existing code style

## Changelog

### v1.2.0 (April 2026)
- ✅ Added DiagnoAI Medical Assistant — a global, context-aware chatbot widget for answering user queries about their medical reports.
- ✅ Integrated Gemini 2.5 Flash for rapid chatbot responses with strict medical-only constraints.
- ✅ Added `useChatStore` state management for dynamic context injection.

### v1.1.0 (March 2026)
- ✅ Added AI feedback system — users can rate analysis accuracy
- ✅ Centralized frontend error handling with user-friendly messages
- ✅ Resource-level authorization on report history and deletion
- ✅ Improved CSP security headers (explicit script-src, font-src, blob: img)
- ✅ Added `X-Permitted-Cross-Domain-Policies` security header
- ✅ Fixed `flag` (H/L/*) field type definition for lab parameters
- ✅ New comprehensive authorization test suite (20+ test cases)
- ✅ Full API reference documentation (`docs/API.md`)
- ✅ Production deployment guide (`docs/DEPLOYMENT.md`)
- ✅ Polished ErrorBoundary UI with dev-mode stack traces

### v1.0.0 (March 2026)
- Initial release with X-Ray and Lab analysis
- JWT authentication, Google OAuth, CSRF protection
- Role-based access control (patient / doctor / admin)
- Email verification and password reset flows
- PDF report generation
- Celery + Redis background processing
- WebSocket real-time notifications

## License

MIT
