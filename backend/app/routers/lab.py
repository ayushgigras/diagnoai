from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Body, Depends, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
from app.services import lab_service, ocr_service
from app.utils.upload import validate_and_save_upload
from app.tasks import process_lab
from app.database import get_db
from app.models.report import Report
from app.models.user import User
from app.dependencies import get_current_user
from app.utils.patient import resolve_or_create_patient_id
from typing import Dict, Any

router = APIRouter()

@router.post("/analyze-manual")
@limiter.limit("10/minute")
async def analyze_manual(
    request: Request,
    data: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
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
    patient_payload = data.get("patient") if isinstance(data.get("patient"), dict) else None
    has_patient_names = bool(
        (patient_payload or {}).get("first_name", "").strip()
        and (patient_payload or {}).get("last_name", "").strip()
    )

    if current_user.role == "doctor" and patient_id is None and not has_patient_names:
        raise HTTPException(
            status_code=400,
            detail="Doctor must provide patient details before analysis"
        )
    
    # Save report to database for history
    resolved_patient_id = resolve_or_create_patient_id(
        db,
        patient_id=patient_id,
        patient_details=patient_payload if has_patient_names else None,
    )
    new_report = Report(
        patient_id=resolved_patient_id,
        doctor_id=current_user.id,
        report_type="lab",
        status="completed",
        result_data=result
    )
    db.add(new_report)
    db.commit()
    
    return result

@router.post("/upload-file")
@limiter.limit("5/minute")
async def upload_lab_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
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
@limiter.limit("5/minute")
async def analyze_from_file(
    request: Request,
    file: UploadFile = File(...),
    patient_id: int | None = Form(None),
    patient_first_name: str | None = Form(None),
    patient_last_name: str | None = Form(None),
    patient_date_of_birth: str | None = Form(None),
    patient_gender: str | None = Form(None),
    patient_contact_number: str | None = Form(None),
    patient_address: str | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # 1. Validate and save file securely
        file_path = validate_and_save_upload(file, is_xray=False)
        
        # 2. Create a pending report in the database
        patient_details = {
            "first_name": patient_first_name,
            "last_name": patient_last_name,
            "date_of_birth": patient_date_of_birth,
            "gender": patient_gender,
            "contact_number": patient_contact_number,
            "address": patient_address,
        }
        has_patient_names = bool((patient_first_name or "").strip() and (patient_last_name or "").strip())

        if current_user.role == "doctor" and patient_id is None and not has_patient_names:
            raise HTTPException(
                status_code=400,
                detail="Doctor must provide patient details before analysis"
            )

        resolved_patient_id = resolve_or_create_patient_id(
            db,
            patient_id=patient_id,
            patient_details=patient_details if has_patient_names else None,
        )
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
        
        return {
            "message": "Lab report analysis started in the background",
            "task_id": task.id,
            "report_id": new_report.id
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
