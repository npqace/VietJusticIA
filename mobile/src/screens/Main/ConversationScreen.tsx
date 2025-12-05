import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useConversationWebSocket } from '../../hooks/useConversationWebSocket';
import api from '../../api';
import { COLORS, FONTS, SIZES } from '../../constants/styles';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import { ConversationScreenNavigationProp, ConversationScreenRouteProp } from '../../types/navigation';
import logger from '../../utils/logger';
import { SCREEN_NAMES } from '../../constants/screens';

interface Message {
  message_id: string;
  sender_id: number;
  sender_type: 'user' | 'lawyer';
  text: string;
  timestamp: string;
  read_by_user: boolean;
  read_by_lawyer: boolean;
}

const TIMING = {
  MARK_AS_READ_DELAY: 500,
  AUTO_SCROLL_DELAY: 100,
  TYPING_INDICATOR_TIMEOUT: 2000,
} as const;

/**
 * Real-time lawyer-client conversation screen with WebSocket integration.
 *
 * Features:
 * - Real-time messaging via WebSocket
 * - Message history persistence
 * - Typing indicators
 * - Connection status indicators
 * - Auto-scroll to latest message
 * - Mark messages as read functionality
 * - Message deduplication
 * - Auto-conversation creation/retrieval
 */
const ConversationScreen: React.FC = () => {
  const navigation = useNavigation<ConversationScreenNavigationProp>();
  const route = useRoute<ConversationScreenRouteProp>();
  const { conversationId: initialConversationId, serviceRequestId, title } = route.params;
  const { user } = useAuth();

  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [inputText, setInputText] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  } = useConversationWebSocket(conversationId);

  const [allMessages, setAllMessages] = useState<Message[]>([]);

  /**
   * Fetches or creates conversation for the service request.
   * Displays alert if conversation doesn't exist (lawyer hasn't accepted request yet).
   */
  const getOrCreateConversation = useCallback(async () => {
    try {
      setIsCreatingConversation(true);
      // Try to get existing conversation
      try {
        const response = await api.get(`/api/v1/conversations/service-request/${serviceRequestId}`);
        if (response.data && response.data.conversation_id) {
          setConversationId(response.data.conversation_id);
          return;
        }
      } catch (getError: any) {
        // If not found (404), try to create it
        if (getError.response?.status === 404) {
          logger.debug('Conversation not found, attempting to create...');
          try {
            const createResponse = await api.post('/api/v1/conversations/', {
              service_request_id: serviceRequestId
            });
            if (createResponse.data && createResponse.data.conversation_id) {
              setConversationId(createResponse.data.conversation_id);
              return;
            }
          } catch (createError: any) {
            logger.error('Failed to create conversation:', createError);
            // If creation fails (e.g. status not accepted), show error
            if (createError.response?.status === 400) {
              Alert.alert(
                'Chưa thể bắt đầu',
                'Luật sư cần chấp nhận yêu cầu của bạn trước khi bắt đầu cuộc trò chuyện.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } else {
              Alert.alert('Lỗi', 'Không thể tạo cuộc trò chuyện. Vui lòng thử lại sau.');
            }
            return;
          }
        } else {
          throw getError;
        }
      }
    } catch (error: any) {
      logger.error('Failed to get conversation:', error);
      Alert.alert('Lỗi', 'Không thể tải cuộc trò chuyện');
    } finally {
      setIsCreatingConversation(false);
      setIsLoadingHistory(false);
    }
  }, [serviceRequestId, navigation]);

  /**
   * Fetches message history for the conversation from backend API.
   * Marks messages as read if WebSocket is connected.
   */
  const fetchConversationHistory = useCallback(async () => {
    if (!conversationId) return;

    try {
      setIsLoadingHistory(true);
      const response = await api.get(`/api/v1/conversations/${conversationId}`);

      if (response.data && response.data.messages) {
        setAllMessages(response.data.messages);
        // Mark messages as read only if WebSocket is connected
        if (isConnected) {
          markAsRead();
        }
      }
    } catch (error) {
      logger.error('Failed to fetch conversation history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [conversationId, isConnected, markAsRead]);

  // Fetch conversation history
  useEffect(() => {
    if (conversationId) {
      fetchConversationHistory();
    } else {
      // Try to get or create conversation
      getOrCreateConversation();
    }
  }, [conversationId, fetchConversationHistory, getOrCreateConversation]);

  // Mark messages as read when WebSocket connects
  useEffect(() => {
    if (isConnected && allMessages.length > 0 && conversationId) {
      // Small delay to ensure WebSocket is fully ready
      const timer = setTimeout(() => {
        markAsRead();
      }, TIMING.MARK_AS_READ_DELAY);
      return () => clearTimeout(timer);
    }
  }, [isConnected, conversationId, allMessages.length, markAsRead]);

  // Merge websocket messages with history
  useEffect(() => {
    if (wsMessages.length > 0) {
      setAllMessages((prev) => {
        const newMessages = wsMessages.filter(
          (wsMsg) => !prev.some((msg) => msg.message_id === wsMsg.message_id)
        );
        return [...prev, ...newMessages];
      });
    }
  }, [wsMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (allMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, TIMING.AUTO_SCROLL_DELAY);
    }
  }, [allMessages]);

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

  const handleTextChange = (text: string) => {
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
      }, TIMING.TYPING_INDICATOR_TIMEOUT);
    } else {
      sendTypingIndicator(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    // Normalize role comparison to be case-insensitive
    const isMyMessage = user && item.sender_type === (user.role.toLowerCase() === 'lawyer' ? 'lawyer' : 'user');
    const messageTime = new Date(item.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}>
        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          ]}
        >
          <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
            {item.text}
          </Text>
          <Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>
            {messageTime}
          </Text>
        </View>
      </View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={COLORS.gray} />
      <Text style={styles.emptyTitle}>Chưa có tin nhắn nào</Text>
      <Text style={styles.emptyDescription}>
        Bắt đầu cuộc trò chuyện bằng cách gửi tin nhắn đầu tiên
      </Text>
    </View>
  );

  if (isCreatingConversation || isLoadingHistory) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {isCreatingConversation ? 'Đang tải cuộc trò chuyện...' : 'Đang tải tin nhắn...'}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Header title={title} />

      {/* Connection Status */}
      {!isConnected && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>Đang kết nối...</Text>
          <TouchableOpacity onPress={reconnect}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      )}

      {wsError && (
        <View style={[styles.statusBar, styles.errorBar]}>
          <Text style={styles.statusText}>{wsError}</Text>
        </View>
      )}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={allMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.message_id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={!isLoadingHistory ? <EmptyState /> : null}
      />

      {/* Typing Indicator */}
      {otherUserIsTyping && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>Người khác đang nhập...</Text>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={handleTextChange}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor={COLORS.gray}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || !isConnected}
        >
          <Ionicons name="send" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  loadingText: {
    marginTop: 12,
    fontSize: SIZES.body3,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
  },
  statusBar: {
    backgroundColor: COLORS.warning || '#FFA500',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorBar: {
    backgroundColor: COLORS.error || '#F44336',
  },
  statusText: {
    color: COLORS.white,
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body4,
  },
  retryText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: SIZES.body4,
    textDecorationLine: 'underline',
  },
  messagesList: {
    padding: SIZES.padding,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  myMessageBubble: {
    backgroundColor: COLORS.primary,
  },
  otherMessageBubble: {
    backgroundColor: COLORS.white,
  },
  messageText: {
    fontSize: SIZES.body3,
    fontFamily: FONTS.regular,
    color: COLORS.black,
    marginBottom: 4,
  },
  myMessageText: {
    color: COLORS.white,
  },
  messageTime: {
    fontSize: SIZES.body5 || 10,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
  },
  myMessageTime: {
    color: COLORS.white,
    opacity: 0.8,
  },
  typingContainer: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: SIZES.body4,
    fontFamily: FONTS.italic || FONTS.regular,
    color: COLORS.gray,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontFamily: FONTS.regular,
    fontSize: SIZES.body3,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: SIZES.h3,
    fontFamily: FONTS.bold,
    color: COLORS.black,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: SIZES.body,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ConversationScreen;
