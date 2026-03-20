import os
import warnings
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from jose import jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

# Secret key to encode the JWT token.
# In production, this should be a strong random string stored in an environment variable.
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    app_env = os.getenv("APP_ENV", "development").lower()
    if app_env in {"development", "dev", "local"}:
        SECRET_KEY = "dev-only-insecure-secret-change-me"
        warnings.warn(
            "JWT_SECRET_KEY is not set. Using an insecure development fallback. "
            "Set JWT_SECRET_KEY in backend/.env.",
            RuntimeWarning,
        )
    else:
        raise RuntimeError("JWT_SECRET_KEY environment variable is required.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 day

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(datetime.UTC) + expires_delta
    else:
        expire = datetime.now(datetime.UTC) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
