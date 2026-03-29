import hashlib
import os
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database import get_db
from ..models.user import User
from ..schemas.user import (
    UserResponse,
    UserCreate,
    UserUpdate,
    GoogleLoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from ..config import settings
from ..utils.security import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from ..dependencies import get_current_user
from ..utils.upload import validate_and_save_upload

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(tags=["Authentication"])


def _issue_access_token(user: User) -> str:
    expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return create_access_token(data={"sub": str(user.id), "role": user.role}, expires_delta=expires)


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _build_reset_url(token: str) -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}/reset-password?token={token}"


def _send_password_reset_email(to_email: str, reset_url: str) -> bool:
    if not settings.SMTP_HOST or not settings.SMTP_SENDER_EMAIL:
        return False

    msg = EmailMessage()
    msg["Subject"] = "DiagnoAI Password Reset"
    msg["From"] = settings.SMTP_SENDER_EMAIL
    msg["To"] = to_email
    msg.set_content(
        "We received a request to reset your DiagnoAI password. "
        f"Use this link to reset it: {reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
        if settings.SMTP_USE_TLS:
            server.starttls()
        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(msg)
    return True

@router.post("/register", response_model=UserResponse)
@limiter.limit("5/minute")
def register(request: Request, user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    # Create new user – allow role from request (defaults to patient in schema)
    # Validation: prevent unauthorized admin registration
    requested_role = user_in.role if user_in.role in ["doctor", "patient", "admin"] else "patient"
    
    if requested_role == "admin":
        from ..config import settings
        if user_in.admin_secret != settings.ADMIN_REGISTRATION_KEY:
            raise HTTPException(
                status_code=403,
                detail="Invalid admin registration key."
            )
    
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=requested_role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login")
@limiter.limit("10/minute")
def login(request: Request, db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    # Find user by email (username field in OAuth2 form)
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    access_token = _issue_access_token(user)
    
    return {"access_token": access_token, "token_type": "bearer", "user": UserResponse.model_validate(user)}


@router.post("/google")
@limiter.limit("10/minute")
def google_login(request: Request, payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured on the server")

    try:
        token_data = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    email = token_data.get("email")
    google_sub = token_data.get("sub")
    full_name = token_data.get("name")
    email_verified = token_data.get("email_verified", False)

    if not email or not google_sub or not email_verified:
        raise HTTPException(status_code=400, detail="Google account email is unavailable or unverified")

    requested_role = payload.role if payload.role in ["doctor", "patient"] else "patient"

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            hashed_password=get_password_hash(secrets.token_urlsafe(32)),
            full_name=full_name,
            role=requested_role,
            google_sub=google_sub,
            auth_provider="google",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if user.google_sub and user.google_sub != google_sub:
            raise HTTPException(status_code=409, detail="Google account mismatch for this email")
        if not user.google_sub:
            user.google_sub = google_sub
        if user.full_name is None and full_name:
            user.full_name = full_name
        user.auth_provider = "google" if user.auth_provider == "local" else user.auth_provider
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token = _issue_access_token(user)
    return {"access_token": access_token, "token_type": "bearer", "user": UserResponse.model_validate(user)}


@router.post("/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    response = {
        "message": "If an account with this email exists, a password reset link has been sent."
    }

    if not user or not user.is_active:
        return response

    raw_token = secrets.token_urlsafe(48)
    user.password_reset_token_hash = _hash_reset_token(raw_token)
    user.password_reset_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    db.commit()

    reset_url = _build_reset_url(raw_token)
    email_sent = False
    try:
        email_sent = _send_password_reset_email(user.email, reset_url)
    except Exception:
        email_sent = False

    if settings.APP_ENV.lower() in {"development", "dev", "local"}:
        response["reset_url"] = reset_url
        response["email_sent"] = email_sent

    return response


@router.post("/reset-password")
@limiter.limit("10/minute")
def reset_password(request: Request, payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = _hash_reset_token(payload.token)
    user = db.query(User).filter(User.password_reset_token_hash == token_hash).first()

    if not user or not user.password_reset_token_expires_at:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    expires_at = user.password_reset_token_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user.hashed_password = get_password_hash(payload.new_password)
    user.password_reset_token_hash = None
    user.password_reset_token_expires_at = None
    db.commit()

    return {"message": "Password has been reset successfully"}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.email is not None:
        existing_user = db.query(User).filter(User.email == user_update.email).first()
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = user_update.email
    
    # Update new profile fields
    if user_update.phone is not None:
        current_user.phone = user_update.phone
    if user_update.bio is not None:
        current_user.bio = user_update.bio
    if user_update.location is not None:
        current_user.location = user_update.location
    if user_update.profile_image_url is not None:
        current_user.profile_image_url = user_update.profile_image_url
    if user_update.specialization is not None:
        current_user.specialization = user_update.specialization
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/profile-image")
def upload_profile_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        file_path = validate_and_save_upload(file, is_xray=False)
        filename = os.path.basename(file_path)
        # Using relative URL since backend serves /uploads
        image_url = f"http://localhost:8000/uploads/{filename}"
        
        current_user.profile_image_url = image_url
        db.commit()
        db.refresh(current_user)
        return {"profile_image_url": image_url, "user": UserResponse.model_validate(current_user)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/me", response_model=dict)
def delete_user_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete the current user's own account and associated data."""
    if current_user.role == "admin":
        raise HTTPException(status_code=400, detail="Admins cannot delete their own account here.")
    db.delete(current_user)
    db.commit()
    return {"message": "User account and associated data deleted successfully."}
