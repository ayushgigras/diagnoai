from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os

from ..database import get_db
from ..models.report import Report
from ..models.user import User
from ..schemas.report import ReportResponse
from ..dependencies import get_current_user

router = APIRouter(tags=["Reports"])

@router.get("/history", response_model=List[ReportResponse])
def get_my_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all reports for the currently logged-in doctor, newest first."""
    reports = (
        db.query(Report)
        .filter(Report.doctor_id == current_user.id)
        .order_by(Report.created_at.desc())
        .all()
    )

    for report in reports:
        if report.doctor:
            report.doctor_name = report.doctor.full_name
        if report.patient:
            report.patient_name = f"{report.patient.first_name} {report.patient.last_name}".strip()
            report.patient_first_name = report.patient.first_name
            report.patient_last_name = report.patient.last_name
            report.patient_date_of_birth = report.patient.date_of_birth
            report.patient_gender = report.patient.gender
            report.patient_contact_number = report.patient.contact_number
            report.patient_address = report.patient.address

    return reports

@router.delete("/{report_id}")
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a specific report by ID."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if report.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this report")
        
    db.delete(report)
    db.commit()
    return {"message": "Report deleted successfully"}

@router.get("/uploads/{filename}")
async def serve_upload(
    filename: str, 
    current_user: User = Depends(get_current_user)
):
    UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404)
    return FileResponse(file_path)
