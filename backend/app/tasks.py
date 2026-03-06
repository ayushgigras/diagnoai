import asyncio
import os
from .celery_app import celery_app
from .services import xray_service, ocr_service, lab_service
from .database import SessionLocal
from .models.report import Report

# Helper to run async functions from synchronous celery tasks
def run_async(coro):
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)

    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()

@celery_app.task(bind=True, name="app.tasks.process_xray")
def process_xray(self, file_path: str, xray_type: str, report_id: int):
    """Background task to run DenseNet121 inference on X-Rays."""
    db = SessionLocal()
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return {"error": "Report not found"}
            
        report.status = "processing"
        db.commit()

        # Read the securely saved file
        with open(file_path, "rb") as f:
            contents = f.read()

        # Execute heavy AI inference
        result = run_async(xray_service.predict_xray(contents, xray_type))

        # Update report in DB
        report.status = "completed"
        report.result_data = result
        db.commit()

        return result
    except Exception as e:
        report = db.query(Report).filter(Report.id == report_id).first()
        if report:
            report.status = "failed"
            report.result_data = {"error": str(e)}
            db.commit()
        raise e
    finally:
        db.close()

@celery_app.task(bind=True, name="app.tasks.process_lab")
def process_lab(self, file_path: str, filename: str, report_id: int):
    """Background task to run Gemini Multimodal OCR and clinical analysis on labs."""
    db = SessionLocal()
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return {"error": "Report not found"}
            
        report.status = "processing"
        db.commit()

        # Read the securely saved file
        with open(file_path, "rb") as f:
            contents = f.read()

        # Execute OCR and Analysis
        ocr_result = run_async(ocr_service.extract_lab_values_from_file(contents, filename))
        
        if ocr_result.get("status") != "success":
            raise Exception("OCR Failed or no values matched.")
            
        extracted_values = ocr_result.get("extracted_data", {})
        analysis = lab_service.analyze_lab_values(extracted_values)
        
        analysis["extracted_values"] = extracted_values
        
        # Update report in DB
        report.status = "completed"
        report.result_data = analysis
        db.commit()

        return analysis
    except Exception as e:
        report = db.query(Report).filter(Report.id == report_id).first()
        if report:
            report.status = "failed"
            report.result_data = {"error": str(e)}
            db.commit()
        raise e
    finally:
        db.close()
