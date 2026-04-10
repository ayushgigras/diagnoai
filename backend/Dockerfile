# Use official python slim image
FROM python:3.10-slim

# Install system dependencies, including Tesseract, and gcc for building packages
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libgl1-mesa-glx \
    libglib2.0-0 \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements limits scope for caching
COPY requirements.txt .

# Install dependencies explicitly bypassing cache for PyTorch to avoid massive layers
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment
ENV PYTHONPATH=/app
ENV APP_ENV=production

# Run FastAPI app with gunicorn
CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
