"""Tests for chatbot endpoint authentication and request handling."""

from unittest.mock import patch


def test_chatbot_unauthenticated(client):
    """Unauthenticated users cannot access chatbot endpoint."""
    response = client.post("/api/chatbot/chat", json={"message": "Hello"})
    assert response.status_code == 401


def test_chatbot_empty_message_returns_400(client, auth_headers):
    """Empty message payload returns a 400 validation error from endpoint logic."""
    response = client.post("/api/chatbot/chat", headers=auth_headers, json={"message": ""})
    assert response.status_code == 400
    assert response.json()["detail"] == "Message cannot be empty"


@patch("app.routers.chatbot.generate_chat_response")
def test_chatbot_valid_message_returns_response(mock_generate, client, auth_headers):
    """Valid chatbot request returns success and contains a response field."""
    mock_generate.return_value = "This is a mock AI response."

    payload = {"message": "What is pneumonia?", "history": []}
    response = client.post("/api/chatbot/chat", headers=auth_headers, json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert data["response"] == "This is a mock AI response."
    mock_generate.assert_called_once_with(message="What is pneumonia?", history=[], context=None)


@patch("app.routers.chatbot.generate_chat_response")
def test_chatbot_accepts_context_payload(mock_generate, client, auth_headers):
    """Context payload is accepted and forwarded to the service without server errors."""
    mock_generate.return_value = "Mock response based on context."

    payload = {
        "message": "Explain this report",
        "context": "Patient has elevated WBC count.",
    }
    response = client.post("/api/chatbot/chat", headers=auth_headers, json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    mock_generate.assert_called_once_with(
        message="Explain this report",
        history=[],
        context="Patient has elevated WBC count.",
    )
