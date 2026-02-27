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
        "values": { "wbc": 7000, ... }
    }
    """
    values = data.get("values", {})
    
    if not values:
        raise HTTPException(status_code=400, detail="Missing values")
        
    return lab_service.analyze_lab_values(values)

@router.post("/upload-file")
async def upload_lab_file(
    file: UploadFile = File(...)
):
    # Process file with OCR
    # For mock, just pass path or filename
    
    # In real app, save file to temp dir
    file_bytes = await file.read()
    result = await ocr_service.extract_lab_values_from_file(file_bytes, file.filename)
    return result

@router.post("/analyze-from-file")
async def analyze_from_file(
    file: UploadFile = File(...)
):
    # 1. Read file bytes
    file_bytes = await file.read()
    
    # 2. OCR extraction
    ocr_result = await ocr_service.extract_lab_values_from_file(file_bytes, file.filename)
    
    if ocr_result.get("status") != "success":
        raise HTTPException(status_code=400, detail="OCR Failed or no values matched.")
        
    # 3. Analyze values
    extracted_values = ocr_result.get("extracted_data", {})
    analysis = lab_service.analyze_lab_values(extracted_values)
    
    # Optional: Attach extracted text/values back to analysis for frontend display
    analysis["extracted_values"] = extracted_values
    analysis["ocr_text_preview"] = ocr_result.get("ocr_text", "")[:500] 
    
    return analysis
