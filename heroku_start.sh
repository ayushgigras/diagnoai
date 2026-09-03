#!/bin/bash
set -e

echo "=== Starting DiagnoAI on Heroku ==="

# If backend folder exists, navigate into it
if [ -d "backend" ]; then
    echo "Navigating into backend directory..."
    cd backend
fi

# Run database migrations
if [ "$RUN_MIGRATIONS" != "false" ]; then
    echo "Running database migrations via Alembic..."
    alembic upgrade head || echo "Migration warning: check DB connection if this failed."
fi

# Start FastAPI Web Server with Gunicorn + Uvicorn worker
PORT=${PORT:-8000}
echo "Starting FastAPI server on port $PORT..."
exec gunicorn app.main:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120 --preload
