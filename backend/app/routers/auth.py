from datetime import timedelta
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..database import get_db
from ..models.user import User
from ..schemas.user import UserResponse, UserCreate, UserUpdate
from ..utils.security import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from ..dependencies import get_current_user
from ..utils.upload import validate_and_save_upload

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(tags=["Authentication"])

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
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": UserResponse.model_validate(user)}

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
