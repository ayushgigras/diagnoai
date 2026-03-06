from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    date_of_birth = Column(String) 
    gender = Column(String)
    contact_number = Column(String)
    address = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    reports = relationship("Report", back_populates="patient")
