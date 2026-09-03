#!/bin/bash
set -e

echo "=== Starting DiagnoAI on Heroku ==="

# Check and run database migrations
if [ "$RUN_MIGRATIONS" != "false" ]; then
    echo "Running database migrations via Alembic..."
    alembic upgrade head || echo "Migration warning: check DB connection if this failed."
fi

# If using local/embedded redis for single dyno
if [ -z "$REDIS_URL" ] && [ -z "$CELERY_BROKER_URL" ]; then
    echo "Starting local Redis instance for single-dyno setup..."
    redis-server --port 6379 --daemonize yes
    sleep 2
fi

# If SINGLE_DYNO is enabled or worker is not separate, run background worker
if [ "$SINGLE_DYNO" = "true" ] || [ -z "$SEPARATE_WORKER" ]; then
    echo "Starting background Celery worker..."
    celery -A app.celery_app.celery_app worker -l info --concurrency=1 &
fi

# Start FastAPI Web Server with Gunicorn + Uvicorn worker
PORT=${PORT:-8000}
echo "Starting FastAPI server on port $PORT..."
exec gunicorn app.main:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120 --preload
