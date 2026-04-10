from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class ReportBase(BaseModel):
    patient_id: Optional[int] = None
    report_type: str
    status: Optional[str] = "pending"
    result_data: Optional[Dict[str, Any]] = None

class ReportCreate(ReportBase):
    file_path: Optional[str] = None

class ReportResponse(ReportBase):
    id: int
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None # Added for admin dashboard
    patient_name: Optional[str] = None # Added for admin dashboard
    user_full_name: Optional[str] = None # Fallback for patient name if uploader is patient
    patient_first_name: Optional[str] = None
    patient_last_name: Optional[str] = None
    patient_date_of_birth: Optional[str] = None
    patient_gender: Optional[str] = None
    patient_contact_number: Optional[str] = None
    patient_address: Optional[str] = None
    file_path: Optional[str] = None
    task_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
