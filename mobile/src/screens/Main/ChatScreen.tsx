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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS, LOGO_PATH } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api'; // Import the api instance

const { width } = Dimensions.get('window');
const height = Dimensions.get('window').height;

const ChatScreen = ({ navigation }: { navigation: any }) => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ id: number; text: string; sender: 'user' | 'bot' }>>([
    { id: 1, text: 'LawSphere có thể giúp gì cho bạn?', sender: 'bot' }
  ]);
  const [isTyping, setIsTyping] = useState(false); // For the typing indicator
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when chat history changes
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [chatHistory, isTyping]);

  const sendMessage = async () => {
    if (message.trim() === '') return;

    const userMessage = message;
    
    // Add user message to chat
    setChatHistory(prev => [...prev, {
        id: prev.length + 1,
        text: userMessage,
        sender: 'user' as const
    }]);
    setMessage('');
    setIsTyping(true);

    try {
      // Call the real API endpoint
      const response = await api.post('/chat/query', { message: userMessage });
      const botResponseText = response.data.response;

      setChatHistory(prev => [...prev, {
        id: prev.length + 1,
        text: botResponseText,
        sender: 'bot' as const
      }]);

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
      <View style={styles.header}>
        <Image
          source={LOGO_PATH}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="add-circle-outline" size={30} color={COLORS.gray} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Menu')}>
            <Ionicons name="menu" size={30} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? height * 0.07 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {chatHistory.map((chat) => (
            <View 
              key={chat.id} 
              style={[
                styles.messageContainer, 
                { 
                  alignSelf: chat.sender === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: chat.sender === 'user' ? COLORS.primary : COLORS.buttonLight,
                }
              ]}
            >
              <Text 
                style={[
                  styles.messageText, 
                  { color: chat.sender === 'user' ? COLORS.white : COLORS.black }
                ]}
              >
                {chat.text}
              </Text>
            </View>
          ))}
          {isTyping && (
            <View style={[styles.messageContainer, { alignSelf: 'flex-start', backgroundColor: COLORS.buttonLight }]}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          )}
        </ScrollView>
        <View style={styles.inputWrapper}>
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
    height: height * 0.07,
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
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  messageContainer: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    maxWidth: width * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  messageText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    textAlign: 'left',
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
