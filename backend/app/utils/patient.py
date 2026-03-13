from typing import Any, Dict, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.patient import Patient


def _normalize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned if cleaned else None


def create_patient_from_details(db: Session, patient_details: Dict[str, Any]) -> int:
    first_name = _normalize_text(patient_details.get("first_name"))
    last_name = _normalize_text(patient_details.get("last_name"))

    if not first_name or not last_name:
        raise HTTPException(
            status_code=400,
            detail="Patient first_name and last_name are required"
        )

    new_patient = Patient(
        first_name=first_name,
        last_name=last_name,
        date_of_birth=_normalize_text(patient_details.get("date_of_birth")),
        gender=_normalize_text(patient_details.get("gender")),
        contact_number=_normalize_text(patient_details.get("contact_number")),
        address=_normalize_text(patient_details.get("address")),
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    return new_patient.id


def resolve_patient_id(db: Session, patient_id: Optional[int] = None) -> int:
    if patient_id is not None:
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        return patient.id

    # Use a dedicated fallback record instead of reusing the first patient.
    fallback_patient = (
        db.query(Patient)
        .filter(Patient.first_name == "Unknown", Patient.last_name == "Patient")
        .order_by(Patient.id.asc())
        .first()
    )
    if fallback_patient:
        return fallback_patient.id

    fallback_patient = Patient(first_name="Unknown", last_name="Patient")
    db.add(fallback_patient)
    db.commit()
    db.refresh(fallback_patient)
    return fallback_patient.id


def resolve_or_create_patient_id(
    db: Session,
    patient_id: Optional[int] = None,
    patient_details: Optional[Dict[str, Any]] = None,
) -> int:
    if patient_id is not None:
        return resolve_patient_id(db, patient_id)

    if patient_details:
        return create_patient_from_details(db, patient_details)

    return resolve_patient_id(db, None)