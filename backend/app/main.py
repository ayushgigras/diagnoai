from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
import os
import secrets

from app.config import settings
from app.routers import xray, lab, auth, tasks, reports, ws, admin, feedback

# --------------- Rate Limiter ---------------
ratelimit_enabled = os.getenv("RATELIMIT_ENABLED", "true").lower() != "false"
limiter = Limiter(
    key_func=get_remote_address, 
    default_limits=["60/minute"] if ratelimit_enabled else [],
    enabled=ratelimit_enabled
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-powered diagnostic system for medical imaging and laboratory reports",
    version=settings.PROJECT_VERSION,
)

if settings.APP_ENV == "production" and "*" in settings.BACKEND_CORS_ORIGINS:
    raise RuntimeError("CORS cannot allow wildcard '*' in production.")

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
    CSRF_EXEMPT_PATHS = ["/api/auth/login", "/api/auth/register", "/api/health", "/"]
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
            secure=settings.APP_ENV == "production"
        )
    return response

# --------------- CORS Middleware ---------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"],
    expose_headers=["X-CSRF-Token"],
)

# --------------- Trusted Host Middleware ---------------
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS,
)

# --------------- Routers ---------------
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(xray.router, prefix="/api/xray", tags=["X-Ray Analysis"])
app.include_router(lab.router, prefix="/api/lab", tags=["Lab Analysis"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Background Tasks"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(ws.router, prefix="/api", tags=["WebSockets"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(feedback.router, prefix="/api", tags=["Feedback"])

# --------------- Static Files ---------------
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)



@app.get("/api/health")
@limiter.limit("10/minute")
async def health_check(request: Request):
    return {"status": "healthy", "project": settings.PROJECT_NAME}


@app.get("/")
async def root():
    return {"message": "Welcome to DiagnoAI API"}
