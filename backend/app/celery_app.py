import os
import ssl
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

# We look for REDIS_URL / REDIS_TLS_URL (Heroku Redis) or CELERY_BROKER_URL
CELERY_BROKER_URL = (
    os.getenv("CELERY_BROKER_URL")
    or os.getenv("REDIS_URL")
    or os.getenv("REDIS_TLS_URL")
    or "redis://localhost:6379/0"
)
CELERY_RESULT_BACKEND = (
    os.getenv("CELERY_RESULT_BACKEND")
    or os.getenv("REDIS_URL")
    or os.getenv("REDIS_TLS_URL")
    or "redis://localhost:6379/1"
)

celery_app = Celery(
    "diagnoai_worker",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=["app.tasks"]
)

celery_conf = {
    "task_serializer": "json",
    "accept_content": ["json"],
    "result_serializer": "json",
    "timezone": "UTC",
    "enable_utc": True,
    "task_track_started": True,
    "task_time_limit": 300,  # 5 minutes, given heavy AI workloads
}

# Support eager execution for local development without Redis
if os.getenv("CELERY_ALWAYS_EAGER", "false").lower() == "true":
    celery_conf["task_always_eager"] = True
    celery_conf["task_eager_propagates"] = True

# Configure SSL if connecting via rediss:// (common on Heroku Redis)
if CELERY_BROKER_URL.startswith("rediss://"):
    celery_conf["broker_use_ssl"] = {"ssl_cert_reqs": ssl.CERT_NONE}
if CELERY_RESULT_BACKEND.startswith("rediss://"):
    celery_conf["redis_backend_use_ssl"] = {"ssl_cert_reqs": ssl.CERT_NONE}

celery_app.conf.update(celery_conf)
