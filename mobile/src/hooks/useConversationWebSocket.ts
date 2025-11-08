import { useState, useEffect, useRef, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '@env';

interface Message {
  message_id: string;
  sender_id: number;
  sender_type: 'user' | 'lawyer';
  text: string;
  timestamp: string;
  read_by_user: boolean;
  read_by_lawyer: boolean;
}

interface WebSocketMessage {
  type: 'connection_established' | 'new_message' | 'typing_indicator' | 'read_receipt' | 'error';
  message?: Message;
  user_type?: string;
  is_typing?: boolean;
  message_ids?: string[];
  error?: string;
}

interface UseConversationWebSocketReturn {
  messages: Message[];
  isConnected: boolean;
  isTyping: boolean;
  error: string | null;
  sendMessage: (text: string) => void;
  sendTypingIndicator: (isTyping: boolean) => void;
  markAsRead: () => void;
  reconnect: () => void;
}

const WS_BASE_URL = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');

export const useConversationWebSocket = (
  conversationId: string | null
): UseConversationWebSocketReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(async () => {
    if (!conversationId) {
      console.log('No conversation ID provided');
      return;
    }

    try {
      // Get access token
      const token = await SecureStore.getItemAsync('access_token');
      if (!token) {
        setError('No access token found');
        return;
      }

      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Create WebSocket connection
      const wsUrl = `${WS_BASE_URL}/api/v1/ws/conversation/${conversationId}?token=${token}`;
      console.log('Connecting to WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', data.type);

          switch (data.type) {
            case 'connection_established':
              console.log('Connection established');
              break;

            case 'new_message':
              if (data.message) {
                setMessages((prev) => [...prev, data.message!]);
              }
              break;

            case 'typing_indicator':
              setIsTyping(data.is_typing || false);
              break;

            case 'read_receipt':
              if (data.message_ids) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    data.message_ids!.includes(msg.message_id)
                      ? {
                          ...msg,
                          read_by_user: data.user_type === 'user' ? true : msg.read_by_user,
                          read_by_lawyer: data.user_type === 'lawyer' ? true : msg.read_by_lawyer,
                        }
                      : msg
                  )
                );
              }
              break;

            case 'error':
              console.error('WebSocket error message:', data.error);
              setError(data.error || 'Unknown error');
              break;

            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error occurred');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError('Failed to connect after multiple attempts');
        }
      };
    } catch (err) {
      console.error('Failed to establish WebSocket connection:', err);
      setError('Failed to connect');
    }
  }, [conversationId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      setError('Not connected to chat');
      return;
    }

    try {
      const message = {
        type: 'send_message',
        text: text.trim(),
      };

      wsRef.current.send(JSON.stringify(message));
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    }
  }, []);

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      const message = {
        type: 'typing',
        is_typing: isTyping,
      };

      wsRef.current.send(JSON.stringify(message));
    } catch (err) {
      console.error('Failed to send typing indicator:', err);
    }
  }, []);

  const markAsRead = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      const message = {
        type: 'mark_read',
      };

      wsRef.current.send(JSON.stringify(message));
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect, disconnect]);

  // Connect on mount and when conversationId changes
  useEffect(() => {
    if (conversationId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [conversationId, connect, disconnect]);

  return {
    messages,
    isConnected,
    isTyping,
    error,
    sendMessage,
    sendTypingIndicator,
    markAsRead,
    reconnect,
  };
};
