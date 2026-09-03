release: cd backend && alembic upgrade head
web: cd backend && gunicorn app.main:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120 --preload
worker: cd backend && celery -A app.celery_app.celery_app worker -l info --concurrency=1
