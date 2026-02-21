import easyocr
import re
import numpy as np
import pdf2image
import cv2
import os

# Initialize EasyOCR Reader once (at module level to avoid reloading)
# gpu=True if CUDA is available, else False
reader = easyocr.Reader(['en'], gpu=False) 

async def extract_lab_values_from_file(file: bytes, file_name: str, test_type: str):
    """
    Extracts text from image/PDF using EasyOCR and parses values using Regex.
    """
    
    extracted_text = ""
    
    try:
        # 1. Convert File Bytes to Image(s)
        images = []
        if file_name.lower().endswith('.pdf'):
            # Convert PDF to images
            images = pdf2image.convert_from_bytes(file)
        else:
            # Decode image bytes
            nparr = np.frombuffer(file, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            images = [img]
            
        # 2. Run OCR on each page
        full_text_lines = []
        for img in images:
            # EasyOCR expects numpy array
            if not isinstance(img, np.ndarray):
                img = np.array(img)
                
            result = reader.readtext(img, detail=0) # detail=0 returns just the text list
            full_text_lines.extend(result)
            
        extracted_text = "\n".join(full_text_lines)
        
        # 3. Parse Data based on Test Type
        parsed_data = parse_lab_text(extracted_text, test_type)
        
        return {
            "extracted_data": parsed_data,
            "confidence": 0.95 if parsed_data else 0.5, # confident if we found matching keys
            "ocr_text": extracted_text,
            "status": "success"
        }

    except Exception as e:
        print(f"OCR Error: {e}")
        return {
            "extracted_data": {},
            "confidence": 0.0,
            "ocr_text": f"Error processing file: {str(e)}",
            "status": "error"
        }

def parse_lab_text(text: str, test_type: str) -> dict:
    """
    Parses unstructured OCR text to find key-value pairs for specific lab tests.
    """
    data = {}
    text_lower = text.lower()
    
    # Helper to find value after key
    # Looks for: key ... [number]
    def extract_val(keywords, max_dist=50):
        for key in keywords:
            # Regex to find number (int or float) near the keyword
            # Pattern: keyword followed by non-digits (up to 50 chars) then a number
            pattern = re.escape(key) + r"[^0-9\.]{0," + str(max_dist) + r"}(\d+(\.\d+)?)"
            match = re.search(pattern, text_lower)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    continue
        return None

    if test_type == "cbc":
        # WBC
        val = extract_val(["wbc", "white blood", "leukocyte"])
        if val: data["wbc"] = val
            
        # RBC
        val = extract_val(["rbc", "red blood", "erythrocyte"])
        if val: data["rbc"] = val
            
        # Hemoglobin
        val = extract_val(["hemoglobin", "hgb", "hb"])
        if val: data["hemoglobin"] = val
            
        # Hematocrit
        val = extract_val(["hematocrit", "hct", "pcv"])
        if val: data["hematocrit"] = val
            
        # Platelets
        val = extract_val(["platelet", "plt", "thrombocyte"])
        if val: data["platelets"] = val
            
    elif test_type == "metabolic":
        # Glucose
        val = extract_val(["glucose", "glu", "sugar"])
        if val: data["glucose"] = val
            
        # Calcium
        val = extract_val(["calcium", "ca"])
        if val: data["calcium"] = val
            
        # Sodium
        val = extract_val(["sodium", "na"])
        if val: data["sodium"] = val
            
        # Potassium
        val = extract_val(["potassium", "k"])
        if val: data["potassium"] = val

    elif test_type == "lipid":
        # Cholesterol
        val = extract_val(["cholesterol", "total cholesterol"])
        if val: data["total_cholesterol"] = val
        
        # HDL
        val = extract_val(["hdl", "high density"])
        if val: data["hdl"] = val
        
        # LDL
        val = extract_val(["ldl", "low density"])
        if val: data["ldl"] = val
        
        # Triglycerides
        val = extract_val(["triglycerides", "trig"])
        if val: data["triglycerides"] = val

    elif test_type == "liver":
        # ALT
        val = extract_val(["alt", "sgpt", "alanine"])
        if val: data["alt"] = val
        
        # AST
        val = extract_val(["ast", "sgot", "aspartate"])
        if val: data["ast"] = val
        
        # ALP
        val = extract_val(["alp", "alkaline"])
        if val: data["alp"] = val
        
        # Bilirubin
        val = extract_val(["bilirubin", "total bilirubin"])
        if val: data["bilirubin"] = val

    elif test_type == "thyroid":
        # TSH
        val = extract_val(["tsh", "thyroid stimulating", "thyrotropin"])
        if val: data["tsh"] = val
        
        # T4
        val = extract_val(["t4", "thyroxine", "free t4"])
        if val: data["t4"] = val
        
        # T3
        val = extract_val(["t3", "triiodothyronine", "free t3"])
        if val: data["t3"] = val

    return data

