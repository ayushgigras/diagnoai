import time

def extract_lab_values_from_file(file_path: str, test_type: str):
    """Placeholder OCR - replace with actual Tesseract/EasyOCR"""
    
    # Simulate OCR processing
    time.sleep(3)
    
    # Return mock extracted data
    mock_data = {
        "cbc": {
            "wbc": 7500,
            "rbc": 4.7,
            "hemoglobin": 14.0,
            "hematocrit": 42.0,
            "platelets": 250000,
            "mcv": 90
        },
        "metabolic": {
            "glucose": 85,
            "calcium": 9.2,
            "sodium": 140,
            "potassium": 4.2
        }
    }
    
    extracted = mock_data.get(test_type, {})
    if not extracted and test_type not in mock_data:
        # Default fallback if test type not in mock
        extracted = {"sample_param": 123}

    return {
        "extracted_data": extracted,
        "confidence": 0.88,
        "ocr_text": "Mock OCR text extraction...\nSample Report...",
        "status": "success"
    }
