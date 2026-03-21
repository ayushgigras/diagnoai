from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.user import User
from ..models.report import Report
from ..schemas.user import UserResponse, UserUpdate
from ..schemas.report import ReportResponse
from ..dependencies import get_current_admin

router = APIRouter(tags=["Admin"])

from pydantic import BaseModel

class RoleUpdate(BaseModel):
    role: str

# --- User Management ---

@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """List all users in the system."""
    return db.query(User).all()

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Delete a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
        
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    role_update: RoleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Update a user's role."""
    role = role_update.role
    if role not in ["admin", "doctor", "patient"]:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.role = role
    db.commit()
    return {"message": f"User role updated to {role}"}

@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user_details(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Admin updating user details directly."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key != "id": # Prevent changing ID
            setattr(user, key, value)
            
    db.commit()
    db.refresh(user)
    return user

# --- Report Management ---

@router.get("/reports", response_model=List[ReportResponse])
def get_all_reports(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """List all reports in the system with doctor and patient names."""
    reports = db.query(Report).order_by(Report.created_at.desc()).all()
    
    # Enrich reports with names
    for report in reports:
        # Always expose the submitting user's full name so JS can use it
        if report.doctor:
            report.doctor_name = report.doctor.full_name
            report.user_full_name = report.doctor.full_name  # account owner
        else:
            report.user_full_name = None

        if report.patient:
            # Doctor filled a patient form — use those details
            first = report.patient.first_name or ''
            last  = report.patient.last_name  or ''
            full  = f"{first} {last}".strip()
            report.patient_name         = full if full else report.user_full_name
            report.patient_first_name   = first
            report.patient_last_name    = last
            report.patient_date_of_birth    = report.patient.date_of_birth
            report.patient_gender           = report.patient.gender
            report.patient_contact_number   = report.patient.contact_number
            report.patient_address          = report.patient.address
        else:
            # Patient-role user ran their own analysis — use their account name
            report.patient_name = report.user_full_name or ''
            
    return reports


@router.delete("/reports/{report_id}")
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Delete any report by ID."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    db.delete(report)
    db.commit()
    return {"message": "Report deleted successfully"}

# --- Bulk Actions ---

class BulkDeleteRequest(BaseModel):
    ids: List[int]

@router.post("/users/bulk-delete")
def bulk_delete_users(
    request: BulkDeleteRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Delete multiple users at once."""
    users = db.query(User).filter(User.id.in_(request.ids)).all()
    
    # Security: Ensure admin is not deleting themselves
    admin_id_to_delete = next((u.id for u in users if u.id == admin.id), None)
    if admin_id_to_delete:
        raise HTTPException(status_code=400, detail="Bulk delete contains your own admin account. Please unselect yourself.")
        
    deleted_count = 0
    for user in users:
        db.delete(user)
        deleted_count += 1
        
    db.commit()
    return {"message": f"Successfully deleted {deleted_count} users"}

@router.post("/reports/bulk-delete")
def bulk_delete_reports(
    request: BulkDeleteRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Delete multiple reports at once."""
    reports = db.query(Report).filter(Report.id.in_(request.ids)).all()
    
    deleted_count = 0
    for report in reports:
        db.delete(report)
        deleted_count += 1
        
    db.commit()
    return {"message": f"Successfully deleted {deleted_count} reports"}
