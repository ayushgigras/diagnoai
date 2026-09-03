import os
import sys
import secrets
import importlib
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.routers import xray, lab, auth, tasks, reports, ws, admin, feedback, chatbot

# --------------- Rate Limiter ---------------
ratelimit_enabled = os.getenv("RATELIMIT_ENABLED", "true").lower() != "false"
limiter = Limiter(
    key_func=get_remote_address, 
    default_limits=["60/minute"] if ratelimit_enabled else [],
    enabled=ratelimit_enabled
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.xray_service import get_model
    try:
        get_model()  # Load DenseNet ONCE at startup
    except Exception as e:
        import logging
        logging.error(f"CRITICAL ERROR: Failed to load DenseNet model: {e}")
    yield

# Optional Sentry error monitoring (dynamically imported if configured)
sentry_dsn = os.getenv("SENTRY_DSN")
if sentry_dsn:
    try:
        sentry_sdk = importlib.import_module("sentry_sdk")
        sentry_sdk.init(
            dsn=sentry_dsn,
            traces_sample_rate=1.0,
        )
    except Exception:
        pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-powered diagnostic system for medical imaging and laboratory reports",
    version=settings.PROJECT_VERSION,
    lifespan=lifespan
)

# Optional Prometheus metrics (dynamically imported if installed)
try:
    prom = importlib.import_module("prometheus_fastapi_instrumentator")
    prom.Instrumentator().instrument(app).expose(app, endpoint="/api/metrics")
except Exception:
    pass

app.state.limiter = limiter
if ratelimit_enabled:
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --------------- Security Headers Middleware ---------------
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: blob:; "
        "connect-src 'self'; "
        "frame-ancestors 'none';"
    )
    return response

# --------------- CSRF Middleware ---------------
@app.middleware("http")
async def csrf_middleware(request: Request, call_next):
    CSRF_EXEMPT_PATHS = ["/api/auth/login", "/api/auth/register", "/api/auth/forgot-password", "/api/auth/reset-password", "/api/health", "/"]
    if request.method in ["POST", "PUT", "DELETE", "PATCH"] and request.url.path not in CSRF_EXEMPT_PATHS:
        csrf_token = request.headers.get("x-csrf-token")
        cookie_token = request.cookies.get("csrf_token")
        if not csrf_token or not cookie_token or csrf_token != cookie_token:
            return Response("CSRF token missing or incorrect", status_code=403)
            
    response = await call_next(request)
    
    if "csrf_token" not in request.cookies:
        response.set_cookie(
            key="csrf_token",
            value=secrets.token_urlsafe(32),
            httponly=False,
            samesite="lax",
            secure=True
        )
    return response

# --------------- CORS Middleware ---------------
cors_origins = list(settings.BACKEND_CORS_ORIGINS) if isinstance(settings.BACKEND_CORS_ORIGINS, (list, set)) else [settings.BACKEND_CORS_ORIGINS]
for domain in ["https://diagnoai.app", "https://www.diagnoai.app", "http://localhost:5173", "http://localhost:3000"]:
    if domain not in cors_origins:
        cors_origins.append(domain)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"],
    expose_headers=["X-CSRF-Token"],
)

# --------------- Trusted Host Middleware ---------------
raw_hosts = settings.ALLOWED_HOSTS if isinstance(settings.ALLOWED_HOSTS, list) else [str(settings.ALLOWED_HOSTS)]
allowed_hosts = [h.strip() for h in raw_hosts if h.strip()]
if not allowed_hosts or "*" in allowed_hosts:
    allowed_hosts = ["*"]
else:
    if not any(".herokuapp.com" in h for h in allowed_hosts):
        allowed_hosts.append("*.herokuapp.com")
        allowed_hosts.append(".herokuapp.com")

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=allowed_hosts,
)

# --------------- Routers ---------------
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(xray.router, prefix="/api/xray", tags=["X-Ray Analysis"])
app.include_router(lab.router, prefix="/api/lab", tags=["Lab Analysis"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Background Tasks"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(ws.router, prefix="/api", tags=["WebSockets"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["Feedback"])
app.include_router(chatbot.router, prefix="/api/chatbot", tags=["Chatbot"])

# --------------- Uploads Directory ---------------
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --------------- Health Check Endpoint ---------------
@app.get("/api/health")
@limiter.limit("10/minute")
async def health_check(request: Request, db: Session = Depends(get_db)):
    health_status = {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "database": "unknown",
        "redis": "unknown",
        "model": "unknown"
    }
    
    # Check Database
    try:
        db.execute(text("SELECT 1"))
        health_status["database"] = "connected"
    except Exception:
        health_status["database"] = "failed"
        health_status["status"] = "unhealthy"

    # Check Redis
    try:
        aioredis = importlib.import_module("redis.asyncio")
        redis_kwargs = {}
        if settings.CELERY_BROKER_URL.startswith("rediss://"):
            redis_kwargs["ssl_cert_reqs"] = None
        redis_client = aioredis.from_url(settings.CELERY_BROKER_URL, **redis_kwargs)
        await redis_client.ping()
        health_status["redis"] = "connected"
        await redis_client.close()
    except Exception:
        health_status["redis"] = "failed"
        health_status["status"] = "unhealthy"

    # Check Model
    from app.services.xray_service import _MODEL
    if _MODEL is not None:
        health_status["model"] = "loaded"
    else:
        health_status["model"] = "not_loaded"
        health_status["status"] = "unhealthy"

    return health_status

# Serve frontend build if dist folder exists (supports all-in-one deployment)
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if not os.path.exists(FRONTEND_DIST):
    FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist"))

if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return Response("Not Found", status_code=404)
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.exists(file_path) and not os.path.isdir(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Welcome to DiagnoAI API"}
else:
    @app.get("/")
    async def root():
        return {"message": "Welcome to DiagnoAI API"}
