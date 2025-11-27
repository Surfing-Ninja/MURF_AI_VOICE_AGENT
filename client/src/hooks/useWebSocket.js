import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for managing WebSocket connection
 * 
 * Features:
 * - Automatic connection management
 * - Message handling with callbacks
 * - Reconnection logic
 * - Connection state tracking
 * 
 * @param {string} url - WebSocket server URL
 * @returns {Object} { ws, isConnected, sendMessage, connect, disconnect }
 */
export const useWebSocket = (url) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('✓ WebSocket already connected');
        return;
      }

      console.log(`🔌 Connecting to WebSocket: ${url}`);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✓ WebSocket connected');
        setIsConnected(true);
        setError(null);
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        
        // Auto-reconnect after 3 seconds
        if (!event.wasClean) {
          console.log('⚠️ Connection lost, reconnecting in 3s...');
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('WebSocket connection error');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received:', data.type);
          
          // Dispatch custom event for message handling
          window.dispatchEvent(new CustomEvent('websocket-message', { detail: data }));
        } catch (err) {
          console.error('❌ Failed to parse message:', err);
        }
      };

    } catch (err) {
      console.error('❌ Failed to connect:', err);
      setError(err.message);
    }
  }, [url]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  /**
   * Send message to server
   */
  const sendMessage = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message');
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ws: wsRef.current,
    isConnected,
    error,
    sendMessage,
    connect,
    disconnect
  };
};

export default useWebSocket;
