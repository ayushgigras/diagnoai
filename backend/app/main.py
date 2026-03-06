from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import xray, lab, auth, tasks, reports

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-powered diagnostic system for medical imaging and laboratory reports",
    version=settings.PROJECT_VERSION,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(xray.router, prefix="/api/xray", tags=["X-Ray Analysis"])
app.include_router(lab.router, prefix="/api/lab", tags=["Lab Analysis"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Background Tasks"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "project": settings.PROJECT_NAME}

@app.get("/")
async def root():
    return {"message": "Welcome to DiagnoAI API"}
