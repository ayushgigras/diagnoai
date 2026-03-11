from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

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
