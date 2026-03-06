# DiagnoAI - Intelligent Healthcare Diagnostics

DiagnoAI is a full-stack AI-powered diagnostic system designed to assist healthcare professionals in analyzing medical imaging (X-Rays) and laboratory reports.

![DiagnoAI](https://via.placeholder.com/800x400?text=DiagnoAI+Dashboard)

## Features

- **🔬 X-Ray Analysis**: Automated detection of conditions like Pneumonia, COVID-19, and Fractures from X-ray images.
- **🧪 Lab Report Analysis**: Intelligent parsing of PDF/Image lab reports using OCR, with automatic interpretation of values against reference ranges.
- **📝 Intelligent Insights**: Confidence scores, probability distributions, and clinical recommendations.
- **🔒 Privacy First**: Secure data handling and processing.

## Project Structure

```
diagnoai/
├── frontend/          # React + Vite + TypeScript application
│   ├── src/components # UI Components
│   ├── src/pages      # Main Pages (XRay, Lab, Home)
│   └── src/services   # API integration
└── backend/           # FastAPI + Python application
    ├── app/services   # Business logic (X-Ray inference + Gemini OCR/analysis)
    └── app/routers    # API Endpoints
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

## Notes

- Auth is JWT-based and `JWT_SECRET_KEY` is now required.
- Background analysis (`/api/xray/analyze`, `/api/lab/analyze-from-file`) uses Celery + Redis.
- `patient_id` can be passed in analyze requests; if omitted, backend resolves a fallback patient.

## AI Capabilities

- **🧪 Lab Report Engine (Fully Integrated)**: Utilizes Google's `gemini-2.5-flash` Multimodal Vision API to perform zero-shot, dynamic table extraction from raw laboratory images/PDFs. It securely maps parameters to reference ranges and acts as a clinical assistant to provide plain-English interpretations.
- **🔬 X-Ray Model**: Currently uses intelligent architectural placeholders. To connect real models, update `backend/app/services/xray_service.py`.

## License

MIT

