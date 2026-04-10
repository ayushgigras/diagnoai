import asyncio
import os
from .celery_app import celery_app
from .services import xray_service, ocr_service, lab_service
from .database import SessionLocal
from .models.report import Report
import redis
import json
from .config import settings
from loguru import logger

def notify_user(doctor_id: int, message_type: str, report_id: int, status: str, details: str = ""):
    try:
        r = redis.from_url(settings.CELERY_BROKER_URL)
        payload = {
            "type": message_type,
            "report_id": report_id,
            "status": status,
            "details": details
        }
        r.publish(f"notifications:{doctor_id}", json.dumps(payload))
        logger.info(f"Published notification to {doctor_id}: {message_type} -> {status}")
    except Exception as e:
        logger.error(f"Failed to publish notification: {e}")

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

@celery_app.task(bind=True, name="app.tasks.process_xray", autoretry_for=(Exception,), max_retries=3, default_retry_delay=5)
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

        notify_user(report.doctor_id, "xray_analysis", report.id, "processing", "Running dense neural inference...")

        # Execute heavy AI inference
        result = run_async(xray_service.predict_xray(contents, xray_type))

        # Update report in DB
        report.status = "completed"
        report.result_data = result
        db.commit()

        notify_user(report.doctor_id, "xray_analysis", report.id, "completed", "X-Ray analysis is ready.")
        logger.info(f"Completed process_xray for report {report_id}")

        return result
    except Exception as e:
        logger.error(f"process_xray failed for report {report_id}: {str(e)}")
        report = db.query(Report).filter(Report.id == report_id).first()
        if report:
            report.status = "failed"
            report.result_data = {"error": str(e)}
            db.commit()
            notify_user(report.doctor_id, "xray_analysis", report.id, "failed", f"X-Ray analysis failed: {str(e)}")
        raise e
    finally:
        db.close()

@celery_app.task(bind=True, name="app.tasks.process_lab", autoretry_for=(Exception,), max_retries=3, default_retry_delay=5)
def process_lab(self, file_path: str, filename: str, report_id: int):
    """Background task to run Gemini Multimodal OCR and clinical analysis on labs."""
    db = SessionLocal()
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            logger.warning(f"Report {report_id} not found for process_lab")
            return {"error": "Report not found"}
            
        report.status = "processing"
        db.commit()
        logger.info(f"Started processing lab task for report {report_id}")

        # Read the securely saved file
        with open(file_path, "rb") as f:
            contents = f.read()

        notify_user(report.doctor_id, "lab_analysis", report.id, "processing", "Extracting text and running semantic OCR...")

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

        notify_user(report.doctor_id, "lab_analysis", report.id, "completed", "Lab report analysis is ready.")
        logger.info(f"Completed process_lab for report {report_id}")

        return analysis
    except Exception as e:
        logger.error(f"process_lab failed for report {report_id}: {str(e)}")
        report = db.query(Report).filter(Report.id == report_id).first()
        if report:
            report.status = "failed"
            report.result_data = {"error": str(e)}
            db.commit()
            notify_user(report.doctor_id, "lab_analysis", report.id, "failed", f"Lab report analysis failed: {str(e)}")
        raise e
    finally:
        db.close()
