from fastapi import APIRouter, Depends
from app.celery_app import celery_app
from app.models.user import User
from app.dependencies import get_current_user
from app.database import SessionLocal
from app.models.report import Report

router = APIRouter()

@router.get("/status/{task_id}")
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """Checks the status of a Celery background task."""
    task_result = celery_app.AsyncResult(task_id)

    response = {
        "task_id": task_id,
        "status": task_result.status,
    }

    if task_result.status == "SUCCESS":
        response["result"] = task_result.result
    elif task_result.status == "FAILURE":
        response["error"] = str(task_result.info)
    elif task_result.status in {"PENDING", "STARTED", "RETRY"}:
        # Fall back to persisted report status in case result backend is unavailable
        # or has evicted/expired the task metadata.
        db = SessionLocal()
        try:
            report = db.query(Report).filter(Report.task_id == task_id).first()
            if report:
                if report.status == "completed":
                    response["status"] = "SUCCESS"
                    response["result"] = report.result_data
                elif report.status == "failed":
                    response["status"] = "FAILURE"
                    if isinstance(report.result_data, dict):
                        response["error"] = report.result_data.get("error")
                    else:
                        response["error"] = "Task failed during background processing"
                elif report.status == "processing":
                    response["status"] = "STARTED"
        finally:
            db.close()
        
    return response
