# DiagnoAI Backend

FastAPI backend for DiagnoAI application.

## Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
2. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Linux/Mac: `source venv/bin/activate`
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the server:
   ```bash
   uvicorn app.main:app --reload
   ```

## API Documentation
Once running, visit `http://127.0.0.1:8000/docs`.
