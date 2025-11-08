import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useConversationWebSocket } from '../../hooks/useConversationWebSocket';
import api from '../../api';
import { COLORS, FONTS, SIZES } from '../../constants/styles';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';

interface Message {
  message_id: string;
  sender_id: number;
  sender_type: 'user' | 'lawyer';
  text: string;
  timestamp: string;
  read_by_user: boolean;
  read_by_lawyer: boolean;
}

interface ConversationScreenProps {
  route: {
    params: {
      conversationId?: string;
      serviceRequestId: number;
      title: string;
    };
  };
  navigation: any;
}

const ConversationScreen: React.FC<ConversationScreenProps> = ({ route, navigation }) => {
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

  // Fetch conversation history
  useEffect(() => {
    if (conversationId) {
      fetchConversationHistory();
    } else {
      // Try to get or create conversation
      getOrCreateConversation();
    }
  }, [conversationId]);

  const getOrCreateConversation = async () => {
    try {
      setIsCreatingConversation(true);
      // Try to get existing conversation
      const response = await api.get(`/api/v1/conversations/service-request/${serviceRequestId}`);

      if (response.data && response.data.conversation_id) {
        setConversationId(response.data.conversation_id);
      }
    } catch (error: any) {
      // Conversation doesn't exist yet
      if (error.response?.status === 404) {
        Alert.alert(
          'No Conversation',
          'The lawyer needs to accept your request before starting a conversation.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        console.error('Failed to get conversation:', error);
        Alert.alert('Error', 'Failed to load conversation');
      }
    } finally {
      setIsCreatingConversation(false);
      setIsLoadingHistory(false);
    }
  };

  const fetchConversationHistory = async () => {
    if (!conversationId) return;

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
      }, 100);
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
      }, 2000);
    } else {
      sendTypingIndicator(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = user && item.sender_type === (user.role === 'LAWYER' ? 'lawyer' : 'user');
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

  if (isCreatingConversation || isLoadingHistory) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {isCreatingConversation ? 'Loading conversation...' : 'Loading messages...'}
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
          <Text style={styles.statusText}>Connecting...</Text>
          <TouchableOpacity onPress={reconnect}>
            <Text style={styles.retryText}>Retry</Text>
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
      />

      {/* Typing Indicator */}
      {otherUserIsTyping && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>Other person is typing...</Text>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
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
});

export default ConversationScreen;
