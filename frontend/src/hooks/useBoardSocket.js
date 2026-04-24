import { useEffect, useRef, useCallback } from 'react';

const WS_BASE = process.env.REACT_APP_BACKEND_URL
  ?.replace('https://', 'wss://')
  ?.replace('http://', 'ws://');

export function useBoardSocket(boardId, onMessage) {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    if (!boardId || !WS_BASE) return;
    const url = `${WS_BASE}/api/ws/board/${boardId}`;
    try {
      const ws = new WebSocket(url);
      ws.onopen = () => { /* connected */ };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch { /* ignore */ }
      };
      ws.onclose = () => {
        wsRef.current = null;
        // Reconnect after 3s
        reconnectTimer.current = setTimeout(connect, 3000);
      };
      ws.onerror = () => { ws.close(); };
      wsRef.current = ws;
    } catch { /* ignore */ }
  }, [boardId, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { send };
}
