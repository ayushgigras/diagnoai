"""OCR service utilities.

This module provides helpers to determine file MIME types, extract
structured laboratory parameters from images or PDFs using Gemini
Vision, and a local regex-based fallback parser that can extract
common lab values from Tesseract/OCR output.

Public functions
----------------
determine_mime_type(file_name: str) -> str
    Return a best-effort MIME type for a given filename extension.

extract_lab_values_from_file(file: bytes, file_name: str) -> dict
    Async function that attempts Gemini Vision extraction and
    falls back to Tesseract+regex parsing on API errors.

parse_lab_text(text: str) -> dict
    Parse unstructured OCR text into a mapping of known lab
    parameters to numeric values (when possible).
"""

import os
import re
import json
import base64
import io
import pytesseract
import pdf2image
import google.api_core.exceptions
from PIL import Image
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

def determine_mime_type(file_name: str) -> str:
    ext = file_name.lower().split('.')[-1]
    if ext == 'pdf':
        return 'application/pdf'
    elif ext in ['png']:
        return 'image/png'
    elif ext in ['jpg', 'jpeg']:
        return 'image/jpeg'
    elif ext in ['webp']:
        return 'image/webp'
    elif ext in ['heic']:
        return 'image/heic'
    elif ext in ['heif']:
        return 'image/heif'
    return 'image/jpeg' # Default fallback

async def extract_lab_values_from_file(file: bytes, file_name: str):
    """
    Extracts structured lab parameters, values, units, and reference ranges directly from an image/PDF using Gemini Vision.

    Parameters
    ----------
    file:
        Raw file bytes of the uploaded document.
    file_name:
        Original filename; used to infer MIME type and processing path.

    Returns
    -------
    dict
        A dictionary with keys `extracted_data`, `confidence`, `ocr_text`,
        and `status`. On success `status` == "success" and
        `extracted_data` is a list of parameter dicts.
    """
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return {
                "extracted_data": [],
                "confidence": 0.0,
                "ocr_text": "Error: GEMINI_API_KEY is completely missing from environment variables.",
                "status": "error"
            }
            
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        mime_type = determine_mime_type(file_name)
        
        # Gemini accepts inline data for base64 encoded bytes
        document_part = {
            "mime_type": mime_type,
            "data": base64.b64encode(file).decode('utf-8')
        }
        
        prompt = """
        You are a world-class medical document parser. Analyze the provided laboratory report image or PDF.
        Your goal is to extract EVERY clinical test parameter into a structured JSON array.
        
        Rules for extraction:
        1. **Comprehensiveness**: Extract ALL tests, including sub-tests, calculated values, and indices.
        2. **Qualitative & Quantitative**: If the result is a number, provide it. If it's qualitative (e.g., "Positive", "Negative", "Reactive", "Trace", "1+"), extract it as a string. Do NOT skip qualitative results.
        3. **Data Integrity**: 
           - `parameter_name`: The full, clean name of the test as printed.
           - `result_value`: The patient's actual result. (String or Number).
           - `unit`: The unit of measurement (e.g., "mg/dL", "g/L", "%").
           - `reference_range`: The biological reference interval or normal range.
           - `flag`: If there's an 'H', 'L', '*', or 'Abnormal' flag printed next to the result, extract it.
        4. **Cleanliness**: Remove any artifacts like bullet points, leading numbers, or interpretation symbols from names.
        5. **Strict JSON**: Return ONLY a valid JSON array of objects. No markdown, no pre-amble.
        
        Example Output Format:
        [
          {
            "parameter_name": "Hemoglobin",
            "result_value": 14.2,
            "unit": "g/dL",
            "reference_range": "13.0 - 17.0",
            "flag": ""
          },
          {
            "parameter_name": "Urine Glucose",
            "result_value": "Negative",
            "unit": "",
            "reference_range": "Negative",
            "flag": ""
          }
        ]
        """
        
        response = model.generate_content([prompt, document_part])
        response_text = response.text.strip()
        
        # Clean up possible markdown wrappers
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        elif response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
            
        parsed_data = json.loads(response_text.strip())
        
        # Ensure it's a list
        if isinstance(parsed_data, dict):
            # sometimes the LLM might wrap it in {"data": [...]}
            if "data" in parsed_data:
                parsed_data = parsed_data["data"]
            else:
                parsed_data = [parsed_data]
                
        # Fill in missing fields just in case
        for row in parsed_data:
             if 'unit' not in row: row['unit'] = ''
             if 'reference_range' not in row: row['reference_range'] = ''
        
        return {
            "extracted_data": parsed_data,
            "confidence": 0.95 if len(parsed_data) > 0 else 0.5,
            "ocr_text": f"Successfully extracted {len(parsed_data)} parameters.",
            "status": "success"
        }

    except json.JSONDecodeError as e:
        import traceback
        traceback.print_exc()
        print(f"Gemini Vision Output JSON Error: {e}")
        return {
            "extracted_data": [],
            "confidence": 0.0,
            "ocr_text": f"Error parsing JSON from Gemini: {str(e)}",
            "status": "error"
        }
    except google.api_core.exceptions.GoogleAPIError as e:
        import traceback
        traceback.print_exc()
        print(f"Gemini Vision API Error: {e}, falling back to Tesseract.")
        
        try:
            mime_type = determine_mime_type(file_name)
            extracted_text = ""
            
            if mime_type == 'application/pdf':
                # Generate images from PDF using pdf2image
                images = pdf2image.convert_from_bytes(file)
                for img in images:
                    extracted_text += pytesseract.image_to_string(img) + "\n"
            else:
                # For image fallback
                img = Image.open(io.BytesIO(file))
                extracted_text = pytesseract.image_to_string(img)
            
            # Use the local regex parser
            parsed_dict = parse_lab_text(extracted_text)
            
            # Convert dictionary format to the structured List[Dict] format expected by frontend
            structured_data = [
                {"parameter_name": k.upper(), "result_value": v, "unit": "", "reference_range": "", "flag": ""}
                for k, v in parsed_dict.items()
            ]
            
            return {
                "extracted_data": structured_data,
                "confidence": 0.6,  # Lower confidence for fallback
                "ocr_text": "Using Tesseract fallback.",
                "status": "success"
            }
        except Exception as fallback_err:
            print(f"Tesseract fallback also failed: {fallback_err}")
            return {
                "extracted_data": [],
                "confidence": 0.0,
                "ocr_text": f"Error parsing image with Gemini: {str(e)}. Fallback failed: {str(fallback_err)}",
                "status": "error"
            }
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Unexpected Error during OCR: {e}")
        return {
            "extracted_data": [],
            "confidence": 0.0,
            "ocr_text": f"Unexpected error processing document: {str(e)}",
            "status": "error"
        }

def parse_lab_text(text: str) -> dict:
    """
    Parses unstructured OCR text to find key-value pairs for all known lab tests.

    Parameters
    ----------
    text:
        Raw OCR-extracted text from a lab report image or PDF.

    Returns
    -------
    dict
        Mapping of parameter short-names to numeric values when found.
    """
    data = {}
    text_lower = text.lower()
    lines = text_lower.split('\n')
    
    # Helper to find value after key using line processing
    def extract_val(keywords):
        for key in keywords:
            # Use word boundaries if key is alphanumeric or contains hyphens (like rdw-cv)
            key_pattern = r"\b" + re.escape(key) + r"\b" if key.replace("-", "").replace(" ", "").isalnum() else re.escape(key)
            
            for i, line in enumerate(lines):
                if re.search(key_pattern, line):
                    # Try to find a number in this line after the key
                    parts = re.split(key_pattern, line, maxsplit=1)
                    if len(parts) > 1:
                        right_part = parts[1]
                        num_match = re.search(r"(\d+(\.\d+)?)", right_part)
                        if num_match:
                            try:
                                return float(num_match.group(1))
                            except ValueError:
                                pass
                    
                    # If not found in this line, maybe it's on the very next line
                    if i + 1 < len(lines):
                        next_line = lines[i+1]
                        num_match = re.search(r"(\d+(\.\d+)?)", next_line)
                        if num_match:
                            try:
                                return float(num_match.group(1))
                            except ValueError:
                                pass
        return None

    # CBC Parameters
    val = extract_val(["wbc", "white blood", "leukocyte", "leucocyte", "tlc"])
    if val: data["wbc"] = val
        
    val = extract_val(["rbc", "red blood", "erythrocyte"])
    if val: data["rbc"] = val
        
    val = extract_val(["hemoglobin", "haemoglobin", "hgb", "hb"])
    if val: data["hemoglobin"] = val
        
    val = extract_val(["hematocrit", "hct", "pcv"])
    if val: data["hematocrit"] = val
        
    val = extract_val(["platelet", "plt", "thrombocyte"])
    if val: data["platelets"] = val
        
    # CBC Indices & Differentials
    val = extract_val(["mcv", "mean corpuscular volume"])
    if val: data["mcv"] = val
        
    val = extract_val(["mchc"])
    if val: data["mchc"] = val

    val = extract_val(["mch"])
    if val: data["mch"] = val

    val = extract_val(["rdw-cv", "rdw"])
    if val: data["rdw_cv"] = val

    val = extract_val(["rdw-sd"])
    if val: data["rdw_sd"] = val

    val = extract_val(["neutrophil"])
    if val: data["neutrophils"] = val

    val = extract_val(["lymphocyte"])
    if val: data["lymphocytes"] = val

    val = extract_val(["eosinophil"])
    if val: data["eosinophils"] = val

    val = extract_val(["monocyte"])
    if val: data["monocytes"] = val

    val = extract_val(["basophil"])
    if val: data["basophils"] = val

    val = extract_val(["mpv", "mean platelet volume"])
    if val: data["mpv"] = val

    val = extract_val(["pct"])
    if val: data["pct"] = val

    val = extract_val(["pdw"])
    if val: data["pdw"] = val

    # Metabolic Parameters
    val = extract_val(["glucose", "glu", "sugar"])
    if val: data["glucose"] = val
        
    val = extract_val(["calcium", "ca"])
    if val: data["calcium"] = val
        
    val = extract_val(["sodium", "na"])
    if val: data["sodium"] = val
        
    val = extract_val(["potassium", "k"])
    if val: data["potassium"] = val

    # Lipid Parameters
    val = extract_val(["cholesterol", "total cholesterol"])
    if val: data["total_cholesterol"] = val
    
    val = extract_val(["hdl", "high density"])
    if val: data["hdl"] = val
    
    val = extract_val(["ldl", "low density"])
    if val: data["ldl"] = val
    
    val = extract_val(["triglycerides", "trig"])
    if val: data["triglycerides"] = val

    # Liver Parameters
    val = extract_val(["alt", "sgpt", "alanine"])
    if val: data["alt"] = val
    
    val = extract_val(["ast", "sgot", "aspartate"])
    if val: data["ast"] = val
    
    val = extract_val(["alp", "alkaline"])
    if val: data["alp"] = val
    
    val = extract_val(["bilirubin", "total bilirubin"])
    if val: data["bilirubin"] = val

    # Thyroid Parameters
    val = extract_val(["tsh", "thyroid stimulating", "thyrotropin"])
    if val: data["tsh"] = val
    
    val = extract_val(["t4", "thyroxine", "free t4"])
    if val: data["t4"] = val
    
    val = extract_val(["t3", "triiodothyronine", "free t3"])
    if val: data["t3"] = val

    return data

