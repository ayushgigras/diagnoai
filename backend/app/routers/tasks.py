from fastapi import APIRouter
from app.celery_app import celery_app

router = APIRouter()

@router.get("/status/{task_id}")
async def get_task_status(task_id: str):
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
        
    return response
