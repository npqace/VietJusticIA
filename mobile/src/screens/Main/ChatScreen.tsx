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
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS, LOGO_PATH } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const height = Dimensions.get('window').height;

const ChatScreen = ({ navigation }: { navigation: any }) => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ id: number; text: string; sender: 'user' | 'bot' }>>([
    { id: 1, text: 'LawSphere có thể giúp gì cho bạn?', sender: 'bot' }
  ]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when chat history changes
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [chatHistory]);

  const sendMessage = () => {
    if (message.trim() === '') return;
      
    // Add user message to chat
    const newUserMessage = {
        id: chatHistory.length + 1,
        text: message,
        sender: 'user' as const
    };
        
    setChatHistory(prev => [...prev, newUserMessage]);
    setMessage('');
    
    // Simulate bot response (should call API here)
    setTimeout(() => {
      const botResponse = {
        id: chatHistory.length + 2,
        text: 'Tôi đang xử lý câu hỏi của bạn. Vui lòng đợi trong giây lát...',
        sender: 'bot' as const
      };
      setChatHistory(prev => [...prev, botResponse]);
    }, 1000);
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
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        style={styles.keyboardAvoidView}
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
        </ScrollView>
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
              disabled={message.trim() === ''}
          >
            <Ionicons name="send" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

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
    paddingBottom: 80,
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
  inputContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.buttonLight,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
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