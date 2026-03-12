from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
import re

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: Optional[str] = "patient"
    phone: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    profile_image_url: Optional[str] = None
    specialization: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    profile_image_url: Optional[str] = None
    specialization: Optional[str] = None
    is_active: Optional[bool] = None

class UserCreate(UserBase):
    password: str
    admin_secret: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character")
        return v

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
