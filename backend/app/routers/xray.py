from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from app.services import xray_service
from app.utils.upload import validate_and_save_upload
from app.tasks import process_xray
from app.database import SessionLocal
from app.models.report import Report
from app.models.user import User
from app.dependencies import get_current_user
from app.utils.patient import resolve_patient_id
import base64
import os
from app.config import settings

router = APIRouter()

@router.post("/analyze")
async def analyze_xray(
    file: UploadFile = File(...),
    xray_type: str = Form(...),
    patient_id: int | None = Form(None),
    current_user: User = Depends(get_current_user)
):
    try:
        # 1. Validate and save file securely
        file_path = validate_and_save_upload(file, is_xray=True)
        
        # 2. Create a pending report in the database
        db = SessionLocal()
        resolved_patient_id = resolve_patient_id(db, patient_id)
        new_report = Report(
            patient_id=resolved_patient_id,
            doctor_id=current_user.id,
            report_type="xray",
            file_path=file_path,
        )
        db.add(new_report)
        db.commit()
        db.refresh(new_report)
        
        # 3. Enqueue the Celery task
        # Need to extract ID before closing DB
        report_id = new_report.id
        task = process_xray.delay(file_path, xray_type, report_id)
        
        # 4. Update the report with the task ID
        new_report.task_id = task.id
        db.commit()
        db.close()
        
        # Return immediately so the client isn't blocked by inference
        return {
            "message": "X-ray analysis started in the background",
            "task_id": task.id,
            "report_id": report_id
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

