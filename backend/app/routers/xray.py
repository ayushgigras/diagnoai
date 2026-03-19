from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from app.services import xray_service
from app.utils.upload import validate_and_save_upload
from app.database import get_db
from app.models.report import Report
from app.models.user import User
from app.dependencies import get_current_user
from app.utils.patient import resolve_or_create_patient_id

router = APIRouter()

@router.post("/analyze")
async def analyze_xray(
    file: UploadFile = File(...),
    xray_type: str = Form(...),
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
        if current_user.role == "admin":
            raise HTTPException(
                status_code=403,
                detail="Admins should not perform diagnostic analysis. Use a doctor or patient account."
            )

        # 1. Validate and save file securely
        file_path = validate_and_save_upload(file, is_xray=True)

        # 2. Read the file
        with open(file_path, "rb") as f:
            contents = f.read()

        # 3. Run AI inference synchronously (model is cached after first load)
        result = await xray_service.predict_xray(contents, xray_type)

        # 4. Save report to database for history
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
