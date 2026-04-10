from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.chatbot_service import generate_chat_response
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    context: Optional[str] = None

class ChatResponse(BaseModel):
    response: str

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, current_user: User = Depends(get_current_user)):
    """
    Process a chat message from the user and respond using the medical AI assistant.
    Requires authentication.
    """
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
        
    try:
        # Convert Pydantic Models to raw dicts for the service
        history_dicts = [{"role": msg.role, "content": msg.content} for msg in request.history] if request.history else []
        
        reply = generate_chat_response(
            message=request.message,
            history=history_dicts,
            context=request.context
        )
        
        return ChatResponse(response=reply)
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
