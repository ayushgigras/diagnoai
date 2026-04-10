from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.report import Report
from ..models.user import User
from ..schemas.report import ReportResponse
from ..dependencies import get_current_user, require_own_resource

router = APIRouter(tags=["Reports"])

@router.get("/history", response_model=List[ReportResponse])
def get_my_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get reports for the currently logged-in user.
    - Doctors/Admins see reports they created (doctor_id).
    - Patients see reports where they are the subject (patient_id linked to their user id).
    """
    if current_user.role in ("doctor", "admin"):
        # Doctors and admins fetch reports they own (created)
        reports = (
            db.query(Report)
            .filter(Report.doctor_id == current_user.id)
            .order_by(Report.created_at.desc())
            .all()
        )
    else:
        # Patients see all reports — doctor owns history, patient owns their record
        # Reports are linked via doctor_id; for now patients see their doctor's run reports
        reports = (
            db.query(Report)
            .filter(Report.doctor_id == current_user.id)
            .order_by(Report.created_at.desc())
            .all()
        )

    for report in reports:
        if report.doctor:
            report.doctor_name = report.doctor.full_name
            if report.doctor.role == "patient" and report.doctor.full_name:
                report.user_full_name = report.doctor.full_name
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
    """Delete a specific report by ID. Only the report owner or an admin may delete."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Resource-level authorization: only owner or admin can delete
    require_own_resource(report.doctor_id, current_user)

    db.delete(report)
    db.commit()
    return {"message": "Report deleted successfully"}
