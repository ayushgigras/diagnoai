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
    VerifyEmailRequest,
    ResendVerificationRequest,
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

def _send_verification_email(to_email: str, name: str, verify_url: str) -> bool:
    if not settings.SMTP_HOST or not settings.SMTP_SENDER_EMAIL:
        return False

    msg = EmailMessage()
    msg["Subject"] = "Verify your DiagnoAI account"
    msg["From"] = settings.SMTP_SENDER_EMAIL
    msg["To"] = to_email
    
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #0f766e; margin: 0;">DiagnoAI</h1>
        </div>
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h2 style="margin-top: 0; color: #0f766e;">Welcome to DiagnoAI, {name or 'User'}!</h2>
          <p>Please verify your email address to activate your account. This link will expire in 24 hours.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{verify_url}" style="background-color: #0f766e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify My Account</a>
          </div>
          <p style="font-size: 14px; color: #64748b;">Or copy and paste this link into your browser:<br>
          <a href="{verify_url}" style="color: #0f766e;">{verify_url}</a></p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #94a3b8;">
          <p>&copy; {datetime.now().year} DiagnoAI. All rights reserved.</p>
        </div>
      </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Failed to send verification email: {e}")
        return False

def _send_welcome_email(to_email: str, name: str) -> bool:
    if not settings.SMTP_HOST or not settings.SMTP_SENDER_EMAIL:
        return False

    msg = EmailMessage()
    msg["Subject"] = "Welcome to DiagnoAI! 🎉"
    msg["From"] = settings.SMTP_SENDER_EMAIL
    msg["To"] = to_email
    
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #0f766e; margin: 0;">DiagnoAI</h1>
        </div>
        <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h2 style="margin-top: 0; color: #0f766e;">Welcome to the future of diagnostics, {name or 'User'}!</h2>
          <p>Your account is now fully active. Here is a quick overview of what you can do:</p>
          <ul style="line-height: 1.6;">
            <li><strong>🔬 X-Ray Analysis:</strong> Upload chest X-rays for instant, AI-powered multi-pathology detection.</li>
            <li><strong>🧪 Lab Report Analysis:</strong> Upload raw lab reports for OCR extraction and clinical interpretation against standard reference ranges.</li>
            <li><strong>📊 History Tracking:</strong> All your generated reports are saved securely to your account for easy reference.</li>
          </ul>
          <p>Get started by exploring our dashboard and running your first analysis today!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{settings.FRONTEND_URL.rstrip('/')}/login" style="background-color: #0f766e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #94a3b8;">
          <p>&copy; {datetime.now().year} DiagnoAI. All rights reserved.</p>
        </div>
      </body>
    </html>
    """
    msg.add_alternative(html_content, subtype='html')

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Failed to send welcome email: {e}")
        return False

@router.post("/register")
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
        if user_in.admin_secret != settings.ADMIN_REGISTRATION_KEY:
            raise HTTPException(
                status_code=403,
                detail="Invalid admin registration key."
            )
    
    raw_token = secrets.token_urlsafe(48)
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=requested_role,
        is_verified=False,
        verification_token_hash=_hash_reset_token(raw_token),
        verification_token_expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    verify_url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={raw_token}"
    _send_verification_email(user.email, user.full_name, verify_url)

    # Convert to dict to easily append developer fields if needed
    user_dict = UserResponse.model_validate(user).model_dump()
    if settings.APP_ENV.lower() in {"development", "dev", "local", "test", "testing"}:
        user_dict["verify_url"] = verify_url

    return user_dict

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
    elif not user.is_verified:
        raise HTTPException(
            status_code=403, 
            detail="Please verify your email address. Check your inbox or request a new verification email."
        )
        
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

    user = db.query(User).filter(User.email == email).first()
    if not user:
        if not payload.is_registration:
            return {"requires_registration": True, "email": email, "name": full_name}
            
        requested_role = payload.role if payload.role in ["doctor", "patient", "admin"] else "patient"
        
        if requested_role == "admin":
            if payload.admin_secret != settings.ADMIN_REGISTRATION_KEY:
                raise HTTPException(status_code=403, detail="Invalid admin registration key.")
                
        user = User(
            email=email,
            hashed_password=get_password_hash(secrets.token_urlsafe(32)),
            full_name=full_name,
            role=requested_role,
            google_sub=google_sub,
            auth_provider="google",
            is_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Send Welcome Email directly for new Google users
        _send_welcome_email(user.email, user.full_name)
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

    if settings.APP_ENV.lower() in {"development", "dev", "local", "test", "testing"}:
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
    return {"message": "Password has been reset successfully"}

@router.post("/verify-email")
@limiter.limit("5/minute")
def verify_email(request: Request, payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    token_hash = _hash_reset_token(payload.token)
    user = db.query(User).filter(User.verification_token_hash == token_hash).first()

    if not user or not user.verification_token_expires_at:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    expires_at = user.verification_token_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    user.is_verified = True
    user.verification_token_hash = None
    user.verification_token_expires_at = None
    db.commit()

    _send_welcome_email(user.email, user.full_name)

    return {"message": "Email verified successfully"}

@router.post("/resend-verification")
@limiter.limit("3/minute")
def resend_verification(request: Request, payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    response = {
        "message": "If an unverified account with this email exists, a new verification link has been sent."
    }

    if not user or user.is_verified:
        return response

    raw_token = secrets.token_urlsafe(48)
    user.verification_token_hash = _hash_reset_token(raw_token)
    user.verification_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    db.commit()

    verify_url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={raw_token}"
    _send_verification_email(user.email, user.full_name, verify_url)

    if settings.APP_ENV.lower() in {"development", "dev", "local", "test", "testing"}:
        response["verify_url"] = verify_url

    return response

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
