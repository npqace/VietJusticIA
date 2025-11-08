import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Button,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useConversationWebSocket } from '../hooks/useConversationWebSocket';
import api from '../services/api';

interface Message {
  message_id: string;
  sender_id: number;
  sender_type: 'user' | 'lawyer';
  text: string;
  timestamp: string;
  read_by_user: boolean;
  read_by_lawyer: boolean;
}

interface ConversationChatProps {
  conversationId: string;
  serviceRequestTitle: string;
  userRole: 'user' | 'lawyer';
}

const ConversationChat: React.FC<ConversationChatProps> = ({
  conversationId,
  serviceRequestTitle,
  userRole,
}) => {
  const [inputText, setInputText] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get access token from localStorage
  const accessToken = localStorage.getItem('access_token');

  // WebSocket hook
  const {
    messages: wsMessages,
    isConnected,
    isTyping: otherUserIsTyping,
    error: wsError,
    sendMessage: wsSendMessage,
    sendTypingIndicator,
    markAsRead,
    reconnect,
  } = useConversationWebSocket(conversationId, accessToken);

  // Fetch conversation history
  useEffect(() => {
    fetchConversationHistory();
  }, [conversationId]);

  const fetchConversationHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await api.get(`/api/v1/conversations/${conversationId}`);

      if (response.data && response.data.messages) {
        setAllMessages(response.data.messages);
        // Mark messages as read
        markAsRead();
      }
    } catch (error) {
      console.error('Failed to fetch conversation history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Merge websocket messages with history
  useEffect(() => {
    console.log('wsMessages updated, length:', wsMessages.length);
    if (wsMessages.length > 0) {
      setAllMessages((prev) => {
        const newMessages = wsMessages.filter(
          (wsMsg) => !prev.some((msg) => msg.message_id === wsMsg.message_id)
        );
        console.log('Merging new messages:', newMessages.length, 'Total after merge:', prev.length + newMessages.length);
        return [...prev, ...newMessages];
      });
    }
  }, [wsMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [allMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !conversationId) return;

    wsSendMessage(text);
    setInputText('');

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTypingIndicator(false);
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setInputText(text);

    // Send typing indicator
    if (text.length > 0) {
      sendTypingIndicator(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(false);
      }, 2000);
    } else {
      sendTypingIndicator(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoadingHistory) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" height="100%">
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{serviceRequestTitle}</Typography>
          <Box display="flex" alignItems="center" gap={1}>
            {isConnected ? (
              <Chip label="Connected" color="success" size="small" />
            ) : (
              <Chip label="Disconnected" color="error" size="small" />
            )}
            {!isConnected && (
              <Button size="small" startIcon={<RefreshIcon />} onClick={reconnect}>
                Reconnect
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Error Alert */}
      {wsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {wsError}
        </Alert>
      )}

      {/* Messages Area */}
      <Paper
        elevation={1}
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          mb: 2,
          bgcolor: '#f5f5f5',
        }}
      >
        {allMessages.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <Typography color="text.secondary">No messages yet. Start the conversation!</Typography>
          </Box>
        ) : (
          <>
            {allMessages.map((message) => {
              const isMyMessage = message.sender_type === userRole;

              return (
                <Box
                  key={message.message_id}
                  display="flex"
                  justifyContent={isMyMessage ? 'flex-end' : 'flex-start'}
                  mb={2}
                >
                  <Paper
                    elevation={2}
                    sx={{
                      maxWidth: '70%',
                      p: 1.5,
                      bgcolor: isMyMessage ? '#1976d2' : '#fff',
                      color: isMyMessage ? '#fff' : '#000',
                    }}
                  >
                    <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                      {message.text}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 0.5,
                        color: isMyMessage ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
                      }}
                    >
                      {formatTime(message.timestamp)}
                    </Typography>
                  </Paper>
                </Box>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* Typing Indicator */}
        {otherUserIsTyping && (
          <Box display="flex" mb={2}>
            <Paper elevation={1} sx={{ p: 1.5, bgcolor: '#fff' }}>
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                Other person is typing...
              </Typography>
            </Paper>
          </Box>
        )}
      </Paper>

      {/* Input Area */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Box display="flex" gap={1}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={inputText}
            onChange={handleTextChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={!isConnected}
            variant="outlined"
            size="small"
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!inputText.trim() || !isConnected}
            sx={{ alignSelf: 'flex-end' }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  );
};

export default ConversationChat;
