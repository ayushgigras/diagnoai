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
    ├── app/services   # Business logic (ML/OCR Mocks)
    └── app/routers    # API Endpoints
```

## Quick Start

### Prerequisites
- Node.js (v18+)
- Python (3.8+)

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```
Server will start at `http://localhost:8000`. API Docs at `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
Client will start at `http://localhost:5173`.

## AI Capabilities (Mock/Placeholder)

Currently, the system uses intelligent placeholders to demonstrate functionality:
- **X-Ray Model**: Returns randomized but plausible predictions for demonstration.
- **OCR Engine**: Simulates extraction delay and returns sample data for common test types (CBC, Metabolic).

To connect real models, update `backend/app/services/xray_service.py` and `backend/app/services/ocr_service.py`.

## License

MIT
