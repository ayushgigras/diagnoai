import os
import google.generativeai as genai
import traceback
from fastapi import HTTPException

# Configure standard system prompt for medical focus
MEDICAL_SYSTEM_PROMPT = """You are 'DiagnoAI Assistant', an expert, highly knowledgeable, and empathetic medical AI assistant.
Your primary role is to help patients understand their medical reports, symptoms, and general health inquiries.
CRITICAL RULES:
1. You MUST ONLY respond to questions related to health, medicine, biology, wellness, diagnostics, and anatomy.
2. If the user asks a non-medical question (e.g., coding, history, casual non-health chat), you must politely, but firmly, refuse to answer and remind them that you are exclusively a medical assistant.
3. Be compassionate, clear, and explain medical terms in plain English.
4. Always include a disclaimer that your advice does not replace professional medical consultation.
5. If medical context or report data is provided, use it to accurately address the user's concerns. 
"""

def generate_chat_response(message: str, history: list = None, context: str = None) -> str:
    """
    Generates a response using Gemini, strictly adhering to medical constraints.
    history follows format: [{"role": "user" or "model", "parts": ["text"]}]
    """
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")
        
        genai.configure(api_key=api_key)
        
        # We use flash as it's quick and reliable for chat
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Build prompt payload
        messages = []
        
        # Add system prompt as the first exchange to set behavior, if no history is provided,
        # or just prepend context to the current message. In newer APIs, system_instruction is available,
        # but to ensure compatibility, we'll embed the system prompt in the user's first query or behind the scenes.
        
        # If there's context, inject it into the prompt silently
        context_prompt = f"\n\nContext about the user's current report:\n{context}" if context else ""
        
        full_message = f"{MEDICAL_SYSTEM_PROMPT}\n\nUser's Request:\n{message}{context_prompt}"
        
        # format history for gemini
        formatted_history = []
        if history:
            for msg in history:
                if "role" in msg and "content" in msg:
                    role = "model" if msg["role"] in ["assistant", "model", "ai"] else "user"
                    formatted_history.append({"role": role, "parts": [msg["content"]]})
        
        chat = model.start_chat(history=formatted_history)
        response = chat.send_message(full_message)
        
        return response.text
        
    except Exception as e:
        print(f"Chatbot API Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to generate AI response. Please try again later.")
