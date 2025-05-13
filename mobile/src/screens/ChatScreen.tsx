import React, { useState } from 'react';
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
import { COLORS, SIZES, SPACING, FONTS, RADIUS } from '../constants/styles';
import { Ionicons } from '@expo/vector-icons'; // Import icons

const { width } = Dimensions.get('window');

const ChatScreen = ({ navigation }: { navigation: any }) => {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<Array<{ id: number; text: string; sender: 'user' | 'bot' }>>([
        { id: 1, text: 'LawSphere có thể giúp gì cho bạn?', sender: 'bot' }
    ]);

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
        
        // Simulate bot response - in a real app, you'd call an API here
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
            locations={[0, 0.3, 0.6, 1]}
            style={styles.container}
        >
            <View style={styles.header}>
                <Image
                    source={require('../assets/images/lawsphere-logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <View style={styles.headerIcons}>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="add" size={24} color={COLORS.textDark} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="menu" size={24} color={COLORS.textDark} />
                    </TouchableOpacity>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidView}
            >
                <ScrollView
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
                                    { color: chat.sender === 'user' ? COLORS.textLight : COLORS.textDark }
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
                        placeholderTextColor={COLORS.textDark}
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
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.md,
        marginTop: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    logo: {
        width: 40,
        height: 40,
    },
    headerIcons: {
        flexDirection: 'row',
    },
    iconButton: {
        padding: SPACING.sm,
        marginLeft: SPACING.sm,
    },
    keyboardAvoidView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: SPACING.md,
    },
    messageContainer: {
        borderRadius: RADIUS.large,
        padding: SPACING.md,
        marginVertical: SPACING.sm,
        maxWidth: '80%',
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        marginBottom: SPACING.md,
        marginHorizontal: SPACING.md,
        backgroundColor: COLORS.buttonLight,
        borderRadius: RADIUS.large,
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
        color: COLORS.textDark,
        maxHeight: 100,
        padding: SPACING.sm,
    },
    sendButton: {
        padding: SPACING.sm,
    },
});

export default ChatScreen;