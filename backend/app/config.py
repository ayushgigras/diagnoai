import os
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    PROJECT_NAME: str = "DiagnoAI"
    PROJECT_VERSION: str = "1.0.0"
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]
    ALLOWED_HOSTS: Union[List[str], str] = ["localhost", "127.0.0.1"]
    
    # Environment API Keys
    GEMINI_API_KEY: str | None = None
    ADMIN_REGISTRATION_KEY: str

    # Redis / Celery
    CELERY_BROKER_URL: str = "redis://127.0.0.1:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://127.0.0.1:6379/0"

    # Upload paths
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "temp_uploads")
    
    @field_validator('ALLOWED_HOSTS', mode='before')
    @classmethod
    def parse_allowed_hosts(cls, v):
        if isinstance(v, str):
            return [x.strip() for x in v.split(',')]
        return v

settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
