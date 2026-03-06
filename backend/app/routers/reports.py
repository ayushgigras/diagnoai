from fastapi import APIRouter, Depends
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
