from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class ReportBase(BaseModel):
    patient_id: int
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
    file_path: Optional[str] = None
    task_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
