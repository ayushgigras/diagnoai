import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    doctor = "doctor"
    patient = "patient"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String, default=UserRole.patient.value)  # admin, doctor, patient
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    google_sub = Column(String, unique=True, nullable=True)
    auth_provider = Column(String, nullable=False, default="local")
    password_reset_token_hash = Column(String, nullable=True)
    password_reset_token_expires_at = Column(DateTime, nullable=True)
    
    # New Profile Fields
    phone = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    location = Column(String, nullable=True)
    profile_image_url = Column(String, nullable=True)
    specialization = Column(String, nullable=True)  # Mainly for doctors

    # Relationships
    reports = relationship("Report", back_populates="doctor")
