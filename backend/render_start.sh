#!/bin/bash
# Exit early if any command fails
set -e

echo "Starting DiagnoAI Free-Tier All-in-One Backend..."

# 1. Start Redis Server in the background
echo "Starting Redis..."
redis-server --port 6379 --daemonize yes
sleep 2

# 2. Run Database Migrations
echo "Running database migrations..."
alembic upgrade head

# 3. Start Celery Worker in the background
echo "Starting Celery Worker..."
celery -A app.celery_app worker -l info --concurrency=2 &

# 4. Start the FastAPI Web Server (Render injects PORT)
echo "Starting FastAPI Server..."
PORT=${PORT:-8000}
gunicorn app.main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
