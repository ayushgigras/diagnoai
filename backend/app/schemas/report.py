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
    doctor_id: int
    file_path: Optional[str] = None
    task_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
