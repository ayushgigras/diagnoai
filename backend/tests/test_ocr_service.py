import pytest
from unittest.mock import patch, MagicMock
from app.services.ocr_service import extract_lab_values_from_file, parse_lab_text

def test_parse_lab_text():
    sample_text = """
    Complete Blood Count
    WBC 11.5
    RBC 4.5
    Hemoglobin 14.1
    Glucose 105
    """
    
    parsed = parse_lab_text(sample_text)
    
    assert parsed.get("wbc") == 11.5
    assert parsed.get("rbc") == 4.5
    assert parsed.get("hemoglobin") == 14.1
    assert parsed.get("glucose") == 105.0
    assert "platelets" not in parsed

@pytest.mark.asyncio
@patch("app.services.ocr_service.genai.GenerativeModel")
async def test_extract_lab_values_gemini_success(mock_model_class):
    # Mocking the Gemini response
    mock_model = MagicMock()
    mock_response = MagicMock()
    mock_response.text = '''[{"parameter_name": "WBC", "result_value": 7.5, "unit": "10^3/uL"}]'''
    mock_model.generate_content.return_value = mock_response
    mock_model_class.return_value = mock_model
    
    with patch("os.getenv", return_value="fake_api_key"):
        result = await extract_lab_values_from_file(b"fake_image_bytes", "test.jpg")
        
    assert result["status"] == "success"
    assert len(result["extracted_data"]) == 1
    assert result["extracted_data"][0]["parameter_name"] == "WBC"

@pytest.mark.asyncio
@patch("app.services.ocr_service.genai.configure")
@patch("app.services.ocr_service.pytesseract.image_to_string")
async def test_extract_lab_values_fallback(mock_tesseract, mock_genai_configure):
    # Trigger exception in Gemini config or generation
    mock_genai_configure.side_effect = Exception("API limit reached")
    
    # Mock tesseract fallback
    mock_tesseract.return_value = "WBC 8.2\nGlucose 90"
    
    # mock Image.open
    with patch("app.services.ocr_service.Image.open") as mock_img_open:
        mock_img_open.return_value = MagicMock()
        with patch("os.getenv", return_value="fake_api_key"):
            result = await extract_lab_values_from_file(b"fake_image_bytes", "test.jpg")
            
    # The current ocr_service implementation needs to be updated to support the fallback,
    # but the test asserts what the fallback SHOULD return
    assert result["status"] == "success"
    assert result["ocr_text"] == "Using Tesseract fallback."
    assert "extracted_data" in result
    # We map unstructured data to { "parameter_name": "wbc", "result_value": 8.2 ... } 
    # so we expect it to output standard array block.
