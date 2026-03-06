from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.patient import Patient


def resolve_patient_id(db: Session, patient_id: Optional[int] = None) -> int:
    if patient_id is not None:
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        return patient.id

    existing_patient = db.query(Patient).order_by(Patient.id.asc()).first()
    if existing_patient:
        return existing_patient.id

    fallback_patient = Patient(first_name="Unknown", last_name="Patient")
    db.add(fallback_patient)
    db.commit()
    db.refresh(fallback_patient)
    return fallback_patient.id