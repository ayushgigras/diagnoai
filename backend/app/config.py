import os
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    PROJECT_NAME: str = "DiagnoAI"
    PROJECT_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    BACKEND_CORS_ORIGINS: Union[List[str], str] = ["http://localhost:5173", "http://localhost:8501"]
    ALLOWED_HOSTS: Union[List[str], str] = ["localhost", "127.0.0.1"]
    
    # Environment API Keys
    GEMINI_API_KEY: str | None = None
    ADMIN_REGISTRATION_KEY: str = "diagnoai-admin-key"
    GOOGLE_CLIENT_ID: str | None = None
    FRONTEND_URL: str = "http://localhost:5173"

    # Optional SMTP settings for password reset emails
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_SENDER_EMAIL: str | None = None
    SMTP_USE_TLS: bool = True

    # Redis / Celery (Heroku Data for Redis provides REDIS_URL or REDIS_TLS_URL)
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL") or os.getenv("REDIS_URL") or os.getenv("REDIS_TLS_URL") or "redis://127.0.0.1:6379/0"
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND") or os.getenv("REDIS_URL") or os.getenv("REDIS_TLS_URL") or "redis://127.0.0.1:6379/0"

    # Upload paths
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "temp_uploads")
    
    @field_validator('ALLOWED_HOSTS', mode='before')
    @classmethod
    def parse_allowed_hosts(cls, v):
        if isinstance(v, str):
            v_trimmed = v.strip()
            if v_trimmed.startswith('[') and v_trimmed.endswith(']'):
                import json
                try:
                    return json.loads(v_trimmed)
                except Exception:
                    pass
            return [x.strip() for x in v_trimmed.split(',') if x.strip()]
        return v

    @field_validator('BACKEND_CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            v_trimmed = v.strip()
            if v_trimmed.startswith('[') and v_trimmed.endswith(']'):
                import json
                try:
                    return json.loads(v_trimmed)
                except Exception:
                    pass
            return [x.strip() for x in v_trimmed.split(',') if x.strip()]
        return v

settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
