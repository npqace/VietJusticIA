import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS, LOGO_PATH } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api';
import Markdown from 'react-native-markdown-display';

// --- Type Definitions ---
interface Source {
  document_id?: string;  // Optional for backward compatibility
  title: string;
  document_number: string;
  source_url: string;
  page_content_preview: string;
}

interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  sources?: Source[];
}

const { width } = Dimensions.get('window');
const height = Dimensions.get('window').height;

const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const animateDot = (dot: Animated.Value, delay: number) => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(dot, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(dot, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(600 - delay),
      ]),
    ).start();
  };

  useEffect(() => {
    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);
  }, []);

  return (
    <View style={typingIndicatorStyles.container}>
      <Animated.View style={[typingIndicatorStyles.dot, { opacity: dot1 }]} />
      <Animated.View style={[typingIndicatorStyles.dot, { opacity: dot2 }]} />
      <Animated.View style={[typingIndicatorStyles.dot, { opacity: dot3 }]} />
    </View>
  );
};

const typingIndicatorStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginHorizontal: 2,
  },
});

const ChatScreen = ({ navigation, route }: { navigation: any; route: any }) => {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { id: 1, text: 'LawSphere có thể giúp gì cho bạn?', sender: 'bot' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load existing session if navigated from history
  useEffect(() => {
    if (route.params?.sessionId) {
      loadSession(route.params.sessionId);
    }
  }, [route.params?.sessionId]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [chatHistory, isTyping, isKeyboardVisible]);

  const loadSession = async (sessionId: string) => {
    try {
      console.log("Loading session:", sessionId);
      const response = await api.get(`/api/v1/chat/sessions/${sessionId}`);
      const sessionData = response.data;

      // Convert messages to ChatMessage format
      const messages: ChatMessage[] = sessionData.messages.map((msg: any, index: number) => ({
        id: index + 1,
        text: msg.text,
        sender: msg.sender,
        sources: msg.sources || undefined,
      }));

      setChatHistory(messages);
      setCurrentSessionId(sessionId);
      console.log("Session loaded successfully");
    } catch (error) {
      console.error("Failed to load session:", error);
    }
  };

  const startNewChat = () => {
    setChatHistory([{ id: 1, text: 'LawSphere có thể giúp gì cho bạn?', sender: 'bot' }]);
    setCurrentSessionId(null);
    setMessage('');
  };

  const handleSourcePress = (source: Source) => {
    if (!source.document_id) {
      console.log("Source has no document_id (legacy source):", source.title);
      return;
    }
    console.log("Navigating to document:", source.document_id, source.title);
    navigation.navigate('DocumentDetail', { documentId: source.document_id });
  };

  const sendMessage = async () => {
    if (message.trim() === '') return;
    const userMessage = message;
    console.log("User Query:", userMessage);

    // Add user message to UI immediately
    setChatHistory(prev => [...prev, { id: prev.length + 1, text: userMessage, sender: 'user' as const }]);
    setMessage('');
    setIsTyping(true);

    try {
      if (!currentSessionId) {
        // First message - create new session
        console.log("Creating new chat session");
        const response = await api.post('/api/v1/chat/sessions', {
          first_message: userMessage
        });
        const sessionData = response.data;

        // Convert messages to ChatMessage format
        const messages: ChatMessage[] = sessionData.messages.map((msg: any, index: number) => ({
          id: index + 1,
          text: msg.text,
          sender: msg.sender,
          sources: msg.sources || undefined,
        }));

        setChatHistory(messages);
        setCurrentSessionId(sessionData.session_id);
        console.log("New session created:", sessionData.session_id);
      } else {
        // Subsequent messages - add to existing session
        console.log("Adding message to session:", currentSessionId);
        const response = await api.post(`/api/v1/chat/sessions/${currentSessionId}/messages`, {
          message: userMessage
        });
        const botResponseData = response.data;
        console.log("Bot Response:", JSON.stringify(botResponseData, null, 2));

        setChatHistory(prev => [...prev, {
          id: prev.length + 1,
          text: botResponseData.response,
          sender: 'bot' as const,
          sources: botResponseData.sources,
        }]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setChatHistory(prev => [...prev, {
        id: prev.length + 1,
        text: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.',
        sender: 'bot' as const
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientMiddle1, COLORS.gradientMiddle2, COLORS.gradientEnd]}
      locations={[0, 0.44, 0.67, 1]}
      style={styles.container}
    >
      <View 
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <Image
          source={LOGO_PATH}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={startNewChat}>
            <Ionicons name="add-circle-outline" size={30} color={COLORS.gray} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Menu')}>
            <Ionicons name="menu" size={30} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.flexGrowContainer}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={Keyboard.dismiss}
        >
          {chatHistory.map((chat) => {
            const markdownStyle = {
              body: {
                color: chat.sender === 'user' ? COLORS.white : COLORS.black,
                fontFamily: FONTS.regular,
                fontSize: SIZES.body,
              },
              strong: {
                fontFamily: FONTS.bold,
              },
              bullet_list: {
                marginBottom: 8,
              },
              list_item: {
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 4,
              },
            };

            return (
              <View key={chat.id}>
                <View 
                  style={[
                    styles.messageContainer, 
                    { 
                      alignSelf: chat.sender === 'user' ? 'flex-end' : 'flex-start',
                      backgroundColor: chat.sender === 'user' ? COLORS.primary : COLORS.buttonLight,
                    }
                  ]}
                >
                  <Markdown style={markdownStyle}>
                    {chat.text}
                  </Markdown>
                </View>

                {/* Render sources if they exist for a bot message */}
                {chat.sender === 'bot' && chat.sources && chat.sources.length > 0 && (
                  <View style={styles.sourcesContainer}>
                    <Text style={styles.sourcesTitle}>Nguồn tham khảo:</Text>
                    {chat.sources.map((source, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.sourceItem, !source.document_id && styles.sourceItemDisabled]}
                        onPress={() => handleSourcePress(source)}
                        disabled={!source.document_id}
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={16}
                          color={source.document_id ? COLORS.primary : COLORS.gray}
                        />
                        <Text style={[styles.sourceText, !source.document_id && styles.sourceTextDisabled]} numberOfLines={1} ellipsizeMode="tail">
                          {source.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )
          })}
          {isTyping && (
            <View style={[styles.messageContainer, { alignSelf: 'flex-start', backgroundColor: COLORS.buttonLight }]}>
              <TypingIndicator />
            </View>
          )}
        </ScrollView>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? -25 : 0}
      >
        <View style={[styles.inputWrapper, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nhập câu hỏi của bạn tại đây..."
              placeholderTextColor={COLORS.black}
              value={message}
              onChangeText={setMessage}
              multiline
            />
            <TouchableOpacity 
                style={styles.sendButton} 
                onPress={sendMessage} 
                disabled={message.trim() === '' || isTyping}
            >
              <Ionicons name="send" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

// Styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 8,
    height: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  logo: {
    width: width * 0.15,
    height: width * 0.15,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  keyboardAvoidView: {
      flex: 1,
  },
  flexGrowContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  messageContainer: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginVertical: 8,
    maxWidth: width * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  sourcesContainer: {
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 16,
    alignSelf: 'flex-start',
    maxWidth: width * 0.8,
  },
  sourcesTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.small,
    color: COLORS.black,
    marginBottom: 6,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderColor: COLORS.lightGray,
    borderWidth: 1,
  },
  sourceText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.black,
    marginLeft: 8,
    flexShrink: 1,
  },
  sourceItemDisabled: {
    opacity: 0.5,
    backgroundColor: COLORS.lightGray,
  },
  sourceTextDisabled: {
    color: COLORS.gray,
  },
  inputWrapper: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.buttonLight,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.black,
    maxHeight: 100,
    padding: 8,
  },
  sendButton: {
    padding: 8,
  },
});

export default ChatScreen;
