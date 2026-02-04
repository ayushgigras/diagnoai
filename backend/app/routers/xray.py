from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.services import xray_service
import base64
import shutil
import os
from app.config import settings

router = APIRouter()

@router.post("/analyze")
async def analyze_xray(
    file: UploadFile = File(...),
    xray_type: str = Form(...)
):
    try:
        # Save temp file (optional, but good for debugging/logging if needed)
        # For this mock, we just pass the bytes or path
        
        contents = await file.read()
        
        # Call service
        result = await xray_service.predict_xray(contents, xray_type)
        
        # If we had real heatmap generation, we'd handle it here
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

