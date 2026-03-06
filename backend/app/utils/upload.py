import os
import uuid
import shutil
from fastapi import UploadFile, HTTPException

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"]
ALLOWED_PDF_TYPES = ["application/pdf"]
MAX_FILE_SIZE_MB = 10

def validate_and_save_upload(file: UploadFile, is_xray: bool = False) -> str:
    """Validates file type and size, then securely saves it with a UUID."""
    
    # 1. Validate File Type
    if is_xray:
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=400, detail="Only JPEG/PNG images are allowed for X-Rays.")
    else:
        if file.content_type not in ALLOWED_IMAGE_TYPES and file.content_type not in ALLOWED_PDF_TYPES:
            raise HTTPException(status_code=400, detail="Only PDF or JPEG/PNG images are allowed for Lab Reports.")
            
    # 2. Prevent directory traversal by generating a safe unique filename
    ext = os.path.splitext(file.filename)[1]
    safe_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    # 3. Read and save while enforcing size limits
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_MB}MB.")
        
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not securely save the file.")
        
    return file_path
