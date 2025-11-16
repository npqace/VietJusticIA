import { useState, useEffect, useRef, useCallback } from 'react';

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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE_URL = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');

export const useConversationWebSocket = (
  conversationId: string | null,
  accessToken: string | null
): UseConversationWebSocketReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const isMountedRef = useRef(true);
  const isConnectingRef = useRef(false);
  const currentConversationIdRef = useRef<string | null>(null);
  const currentAccessTokenRef = useRef<string | null>(null);
  const effectGenerationRef = useRef(0);
  const typingIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingIndicatorRef = useRef<boolean | null>(null);
  const processedMessageIdsRef = useRef<Set<string>>(new Set());

  const connect = useCallback(() => {
    if (!conversationId || !accessToken) {
      console.log('No conversation ID or access token provided');
      return;
    }

    // Check if we're already connected to the same conversation
    if (
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN &&
      currentConversationIdRef.current === conversationId &&
      currentAccessTokenRef.current === accessToken
    ) {
      console.log('WebSocket already connected to this conversation');
      return;
    }

    // Prevent duplicate connection attempts
    if (isConnectingRef.current) {
      console.log('Connection already in progress');
      return;
    }

    try {
      isConnectingRef.current = true;

      // Close existing connection if any (only if it's a different conversation or token)
      if (wsRef.current) {
        if (
          currentConversationIdRef.current !== conversationId ||
          currentAccessTokenRef.current !== accessToken
        ) {
          console.log('Closing existing connection for different conversation/token');
          wsRef.current.close(1000, 'Switching conversation');
        } else if (wsRef.current.readyState === WebSocket.OPEN) {
          console.log('Connection already open, skipping');
          isConnectingRef.current = false;
          return;
        }
      }

      // Create WebSocket connection
      const wsUrl = `${WS_BASE_URL}/api/v1/ws/conversation/${conversationId}?token=${accessToken}`;
      console.log('Connecting to WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      // Clear processed messages when switching conversations
      if (currentConversationIdRef.current !== conversationId) {
        processedMessageIdsRef.current.clear();
      }
      
      currentConversationIdRef.current = conversationId;
      currentAccessTokenRef.current = accessToken;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
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
                const messageId = data.message.message_id;
                
                // Prevent duplicate processing using ref (works even with React Strict Mode)
                if (processedMessageIdsRef.current.has(messageId)) {
                  console.log('Message already processed, skipping:', messageId);
                  return;
                }
                
                processedMessageIdsRef.current.add(messageId);
                console.log('New message received:', data.message);
                
                setMessages((prev) => {
                  // Double-check in state as well
                  const messageExists = prev.some(
                    (msg) => msg.message_id === messageId
                  );
                  if (messageExists) {
                    console.log('Message already in state, skipping');
                    return prev;
                  }
                  console.log('Previous messages count:', prev.length);
                  const updated = [...prev, data.message!];
                  console.log('Updated messages count:', updated.length);
                  return updated;
                });
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
        isConnectingRef.current = false;

        // Only attempt to reconnect if:
        // 1. Component is still mounted
        // 2. Not a normal closure (code 1000) - normal closures are intentional
        // 3. Not closing due to switching conversation/token
        // 4. Haven't exceeded max reconnect attempts
        // 5. Still have valid conversationId and accessToken
        if (
          isMountedRef.current &&
          event.code !== 1000 &&
          reconnectAttemptsRef.current < maxReconnectAttempts &&
          conversationId &&
          accessToken &&
          currentConversationIdRef.current === conversationId &&
          currentAccessTokenRef.current === accessToken
        ) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            if (
              isMountedRef.current &&
              conversationId &&
              accessToken &&
              currentConversationIdRef.current === conversationId &&
              currentAccessTokenRef.current === accessToken
            ) {
              reconnectAttemptsRef.current++;
              connect();
            }
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError('Failed to connect after multiple attempts');
        }
      };
    } catch (err) {
      console.error('Failed to establish WebSocket connection:', err);
      setError('Failed to connect');
      isConnectingRef.current = false;
    }
  }, [conversationId, accessToken]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (typingIndicatorTimeoutRef.current) {
      clearTimeout(typingIndicatorTimeoutRef.current);
      typingIndicatorTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    isConnectingRef.current = false;
    currentConversationIdRef.current = null;
    currentAccessTokenRef.current = null;
    lastTypingIndicatorRef.current = null;
    processedMessageIdsRef.current.clear();
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

    // Throttle typing indicators - only send if state changed or after 500ms
    if (lastTypingIndicatorRef.current === isTyping) {
      // State hasn't changed, don't send duplicate
      return;
    }

    // Clear existing timeout
    if (typingIndicatorTimeoutRef.current) {
      clearTimeout(typingIndicatorTimeoutRef.current);
      typingIndicatorTimeoutRef.current = null;
    }

    // If stopping typing, send immediately
    if (!isTyping) {
      lastTypingIndicatorRef.current = isTyping;
      try {
        const message = {
          type: 'typing',
          is_typing: isTyping,
        };
        wsRef.current.send(JSON.stringify(message));
      } catch (err) {
        console.error('Failed to send typing indicator:', err);
      }
      return;
    }

    // If starting typing, throttle to avoid spam
    typingIndicatorTimeoutRef.current = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        lastTypingIndicatorRef.current = isTyping;
        try {
          const message = {
            type: 'typing',
            is_typing: isTyping,
          };
          wsRef.current.send(JSON.stringify(message));
        } catch (err) {
          console.error('Failed to send typing indicator:', err);
        }
      }
    }, 300); // Wait 300ms before sending typing indicator
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

  // Connect on mount and when dependencies change
  useEffect(() => {
    isMountedRef.current = true;
    const currentEffectGeneration = ++effectGenerationRef.current;

    if (conversationId && accessToken) {
      // Only connect if we don't already have a connection to this conversation
      if (
        !wsRef.current ||
        wsRef.current.readyState !== WebSocket.OPEN ||
        currentConversationIdRef.current !== conversationId ||
        currentAccessTokenRef.current !== accessToken
      ) {
        connect();
      }
    } else {
      // If no conversationId or accessToken, disconnect
      disconnect();
    }

    return () => {
      // Only run cleanup if this is still the current effect (not React Strict Mode re-run)
      if (effectGenerationRef.current !== currentEffectGeneration) {
        // This is an old effect cleanup, ignore it (React Strict Mode)
        return;
      }

      // Don't disconnect if we're still connecting or if WebSocket is in CONNECTING state
      if (
        isConnectingRef.current ||
        (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING)
      ) {
        console.log('Skipping cleanup - connection in progress');
        return;
      }

      isMountedRef.current = false;
      
      // Cleanup: disconnect if we're switching conversations or unmounting
      // The cleanup runs with the OLD values (from when this effect ran)
      // So we disconnect if we had a connection for these old values
      if (wsRef.current && conversationId && accessToken) {
        // Only disconnect if this cleanup is for the conversation we're currently connected to
        // (i.e., we're switching away from it or unmounting)
        if (
          currentConversationIdRef.current === conversationId &&
          currentAccessTokenRef.current === accessToken
        ) {
          disconnect();
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, accessToken]);

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
