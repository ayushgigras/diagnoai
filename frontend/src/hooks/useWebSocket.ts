import { useState, useEffect, useRef, useCallback } from 'react';

const useWebSocket = (clientId: string) => {
    const [messages, setMessages] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryCountRef = useRef<number>(0);

    const connect = useCallback(() => {
        if (!clientId) return;

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/api/ws';
        // Ensure only one slash between baseUrl and clientId
        const wsUrl = `${baseUrl.replace(/\/$/, '')}/${clientId}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            setIsConnected(true);
            retryCountRef.current = 0; // Reset backoff on success
        };

        ws.onmessage = (event: MessageEvent) => {
            setMessages((prev) => [...prev, event.data]);
        };

        ws.onclose = () => {
            setIsConnected(false);
            wsRef.current = null;

            // Exponential backoff: 1s, 2s, 4s, ..., max 30s
            const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
            retryCountRef.current += 1;

            reconnectTimeoutRef.current = setTimeout(() => {
                connect();
            }, delay);
        };

        ws.onerror = (error: Event) => {
            console.error('WebSocket error:', error);
            // Closing the socket triggers onclose which handles the reconnection
            if (ws.readyState !== WebSocket.CLOSED) {
                 ws.close();
            }
        };
    }, [clientId]);

    useEffect(() => {
        connect();

        const pingInterval = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send("ping");
            }
        }, 15000); // 15 seconds keep-alive

        return () => {
            clearInterval(pingInterval);
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    return {
        messages,
        isConnected,
        clearMessages
    };
};

export default useWebSocket;
