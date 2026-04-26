FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    gcc \
    redis-server \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app
ENV APP_ENV=production

RUN adduser --disabled-password --gecos '' appuser && \
    mkdir -p /app/uploads && \
    chown -R appuser:appuser /app

USER appuser

CMD ["bash", "render_start.sh"]
