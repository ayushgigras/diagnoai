from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Body, Depends
from app.services import lab_service, ocr_service
from app.utils.upload import validate_and_save_upload
from app.tasks import process_lab
from app.database import SessionLocal
from app.models.report import Report
from app.models.user import User
from app.dependencies import get_current_user
from app.utils.patient import resolve_patient_id
from typing import Dict, Any

router = APIRouter()

@router.post("/analyze-manual")
async def analyze_manual(
    data: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user)
):
    """
    Expects JSON:
    {
        "values": { "wbc": 7000, ... }
    }
    """
    values = data.get("values", {})
    
    if not values:
        raise HTTPException(status_code=400, detail="Missing values")
        
    result = lab_service.analyze_lab_values(values)
    patient_id = data.get("patient_id")
    
    # Save report to database for history
    db = SessionLocal()
    try:
        resolved_patient_id = resolve_patient_id(db, patient_id)
        new_report = Report(
            patient_id=resolved_patient_id,
            doctor_id=current_user.id,
            report_type="lab",
            status="completed",
            result_data=result
        )
        db.add(new_report)
        db.commit()
    finally:
        db.close()
    
    return result

@router.post("/upload-file")
async def upload_lab_file(
    file: UploadFile = File(...)
):
    try:
        # 1. Validate and save file securely
        file_path = validate_and_save_upload(file, is_xray=False)
        
        # 2. Read the securely saved file
        with open(file_path, "rb") as f:
            file_bytes = f.read()
            
        result = await ocr_service.extract_lab_values_from_file(file_bytes, file.filename)
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-from-file")
async def analyze_from_file(
    file: UploadFile = File(...),
    patient_id: int | None = Form(None),
    current_user: User = Depends(get_current_user)
):
    try:
        # 1. Validate and save file securely
        file_path = validate_and_save_upload(file, is_xray=False)
        
        # 2. Create a pending report in the database
        db = SessionLocal()
        resolved_patient_id = resolve_patient_id(db, patient_id)
        new_report = Report(
            patient_id=resolved_patient_id,
            doctor_id=current_user.id,
            report_type="lab",
            file_path=file_path,
        )
        db.add(new_report)
        db.commit()
        db.refresh(new_report)
        
        # 3. Enqueue the Celery task
        task = process_lab.delay(file_path, file.filename, new_report.id)
        
        # 4. Update the report with the task ID
        new_report.task_id = task.id
        db.commit()
        db.close()
        
        return {
            "message": "Lab report analysis started in the background",
            "task_id": task.id,
            "report_id": new_report.id
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
