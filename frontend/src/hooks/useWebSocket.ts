import { useState, useEffect, useCallback, useRef } from 'react';
import useAuthStore from '../store/useAuthStore';

// Derive WebSocket URL from API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const WS_URL = API_URL.replace(/^http/, 'ws').replace(/\/api\/?$/, '');

export function useWebSocket() {
    const [messages, setMessages] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const token = useAuthStore(state => state.token);
    const ws = useRef<WebSocket | null>(null);

    const connect = useCallback(() => {
        if (!token) return;
        
        ws.current = new WebSocket(`${WS_URL}/api/ws/notifications?token=${token}`);
        
        ws.current.onopen = () => setIsConnected(true);
        
        ws.current.onmessage = (event) => {
            setMessages(prev => [...prev, event.data]);
        };
        
        ws.current.onclose = () => {
            setIsConnected(false);
            // Reconnect after 3 seconds unless token is gone
            if (useAuthStore.getState().token) {
                setTimeout(connect, 3000);
            }
        };
    }, [token]);

    useEffect(() => {
        connect();
        return () => {
            if (ws.current) {
                ws.current.onclose = null; // Prevent reconnect on deliberate cleanup
                ws.current.close();
            }
        };
    }, [connect]);

    return { messages, isConnected };
}
