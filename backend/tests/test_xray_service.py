import pytest
from unittest.mock import patch, MagicMock
from app.services.xray_service import predict_xray, build_xai_explanation

@pytest.mark.asyncio
@patch("app.services.xray_service.get_model")
@patch("app.services.xray_service.preprocess_for_xrv")
async def test_predict_xray_normal(mock_preprocess, mock_get_model):
    # Mocking preprocessor
    mock_preprocess.return_value = (MagicMock(), MagicMock())
    
    # Mocking model returning all low scores (normal case)
    mock_model = MagicMock()
    mock_model.pathologies = ["Atelectasis", "Cardiomegaly", "Effusion", "Infiltration", "Mass", "Nodule", "Pneumonia", "Pneumothorax"]
    mock_tensor = MagicMock()
    mock_tensor.cpu.return_value.numpy.return_value = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]
    mock_model.return_value = [mock_tensor]
    mock_get_model.return_value = mock_model
    
    # Run test
    result = await predict_xray(b"fake_image_bytes", "chest")
    
    assert result["prediction"] == "Normal"
    # confidence should be 1.0 - max(score) = 1.0 - 0.1 = 0.9
    assert result["confidence"] > 0.8
    assert len(result["findings"]) == 1
    assert result["findings"][0]["condition"] == "Normal"

@pytest.mark.asyncio
@patch("app.services.xray_service.get_model")
@patch("app.services.xray_service.get_gradcam")
@patch("app.services.xray_service.preprocess_for_xrv")
@patch("app.services.xray_service.generate_spectrum_heatmap")
async def test_predict_xray_abnormal(mock_generate_heatmap, mock_preprocess, mock_get_gradcam, mock_get_model):
    # Mocking preprocessor
    mock_preprocess.return_value = (MagicMock(), MagicMock())
    
    # Mocking heatmap response
    mock_generate_heatmap.return_value = ("fake_base64", 100, 100, MagicMock())

    # Mocking model returning a high score for Pneumonia
    mock_model = MagicMock()
    mock_model.pathologies = ["Atelectasis", "Cardiomegaly", "Effusion", "Infiltration", "Mass", "Nodule", "Pneumonia", "Pneumothorax"]
    mock_tensor = MagicMock()
    # High score for Pneumonia (idx 6) relative to others
    mock_tensor.cpu.return_value.numpy.return_value = [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.85, 0.2]
    mock_model.return_value = [mock_tensor]
    mock_get_model.return_value = mock_model
    
    # Run test
    result = await predict_xray(b"fake_image_bytes", "chest")
    
    assert result["prediction"] == "Pneumonia"
    assert result["confidence"] == 0.85
    assert len(result["findings"]) >= 1
    assert result["findings"][0]["condition"] == "Pneumonia"
