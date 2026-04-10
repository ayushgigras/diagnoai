import api from './api';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ChatResponse {
    response: string;
}

export const chatWithBot = async (message: string, history: ChatMessage[] = [], context: string | null = null): Promise<string> => {
    try {
        const payload = {
            message,
            history,
            context
        };
        const response = await api.post<ChatResponse>('/chatbot/chat', payload);
        return response.data.response;
    } catch (error) {
        console.error("Chatbot API error:", error);
        throw error;
    }
};
