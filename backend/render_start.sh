#!/bin/bash
set -e

echo "Starting DiagnoAI Free-Tier All-in-One Backend..."

echo "Starting Redis..."
redis-server --port 6379 --daemonize yes
sleep 2

echo "Running database migrations..."
alembic upgrade head

echo "Starting Celery Worker..."
celery -A app.celery_app worker -l info --concurrency=1 &

echo "Starting FastAPI Server..."
PORT=${PORT:-8000}
exec gunicorn app.main:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120 --preload
