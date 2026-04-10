from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"), index=True)
    report_type = Column(String, nullable=False) # "xray" or "lab"
    file_path = Column(String) # Path to uploaded file
    status = Column(String, default="pending") # pending, processing, completed, failed
    result_data = Column(JSON) # Store X-ray findings or Lab OCR results
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Celery task ID for background processing
    task_id = Column(String, index=True)

    patient = relationship("Patient", back_populates="reports")
    doctor = relationship("User", back_populates="reports")
