from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Body
from app.services import lab_service, ocr_service
from typing import Dict, Any

router = APIRouter()

@router.post("/analyze-manual")
async def analyze_manual(
    data: Dict[str, Any] = Body(...)
):
    """
    Expects JSON:
    {
        "test_type": "cbc",
        "values": { "wbc": 7000, ... }
    }
    """
    test_type = data.get("test_type")
    values = data.get("values", {})
    
    if not test_type or not values:
        raise HTTPException(status_code=400, detail="Missing test_type or values")
        
    return lab_service.analyze_lab_values(values, test_type)

@router.post("/upload-file")
async def upload_lab_file(
    file: UploadFile = File(...),
    test_type: str = Form(...)
):
    # Process file with OCR
    # For mock, just pass path or filename
    
    # In real app, save file to temp dir
    
    result = ocr_service.extract_lab_values_from_file(file.filename, test_type)
    return result

@router.post("/analyze-from-file")
async def analyze_from_file(
    file: UploadFile = File(...),
    test_type: str = Form(...)
):
    # 1. OCR extraction
    ocr_result = ocr_service.extract_lab_values_from_file(file.filename, test_type)
    
    if ocr_result.get("status") != "success":
        raise HTTPException(status_code=400, detail="OCR Failed")
        
    # 2. Analyze values
    extracted_values = ocr_result.get("extracted_data", {})
    analysis = lab_service.analyze_lab_values(extracted_values, test_type)
    
    return analysis

