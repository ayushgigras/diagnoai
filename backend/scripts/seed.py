import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.patient import Patient
from app.models.user import User

def seed_db():
    db = SessionLocal()
    
    # Check if patient exists
    p = db.query(Patient).filter(Patient.id == 1).first()
    if not p:
        print("Seeding dummy patient with ID 1...")
        patient = Patient(id=1, first_name="John", last_name="Doe")
        db.add(patient)
    
    # We already have doctor_id 1 from test script (if it works), but let's make sure
    u = db.query(User).filter(User.id == 1).first()
    if not u:
        print("Seeding dummy doctor with ID 1...")
        doctor = User(id=1, email="doctor1@diagnoai.com", hashed_password="dummy", role="doctor")
        db.add(doctor)
        
    db.commit()
    db.close()
    print("Seed complete.")

if __name__ == "__main__":
    seed_db()
