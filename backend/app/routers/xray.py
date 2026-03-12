from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from app.services import xray_service
from app.utils.upload import validate_and_save_upload
from app.database import get_db
from app.models.report import Report
from app.models.user import User
from app.dependencies import get_current_user
from app.utils.patient import resolve_patient_id

router = APIRouter()

@router.post("/analyze")
async def analyze_xray(
    file: UploadFile = File(...),
    xray_type: str = Form(...),
    patient_id: int | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # 1. Validate and save file securely
        file_path = validate_and_save_upload(file, is_xray=True)

        # 2. Read the file
        with open(file_path, "rb") as f:
            contents = f.read()

        # 3. Run AI inference synchronously (model is cached after first load)
        result = await xray_service.predict_xray(contents, xray_type)

        # 4. Save report to database for history
        resolved_patient_id = resolve_patient_id(db, patient_id)
        new_report = Report(
            patient_id=resolved_patient_id,
            doctor_id=current_user.id,
            report_type="xray",
            file_path=file_path,
            status="completed",
            result_data=result
        )
        db.add(new_report)
        db.commit()
        db.refresh(new_report)

        # 5. Return the full result directly (no polling needed)
        return result

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
