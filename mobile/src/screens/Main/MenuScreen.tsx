import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS, LOGO_PATH } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api';
import { getFullAvatarUrl } from '../../utils/avatarHelper';

const { width } = Dimensions.get('window');

interface ChatSession {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

const MenuScreen = ({ navigation }: { navigation: any }) => {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const menuOptions = [
    // { id: 'chat', title: 'Chat', icon: 'chatbox-ellipses-outline' },
    { id: 'documents', title: 'Tra cứu văn bản', icon: 'document-text-outline' },
    { id: 'procedures', title: 'Tra cứu thủ tục hành chính', icon: 'list-outline' },
    { id: 'lawyer', title: 'Liên hệ luật sư', icon: 'person-outline' },
    { id: 'help', title: 'Hỗ trợ', icon: 'help-circle-outline' },
    { id: 'myRequests', title: 'Yêu cầu của tôi', icon: 'file-tray-full-outline' }
  ];

  // Fetch chat sessions when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchChatSessions();
    }, [])
  );

  const fetchChatSessions = async () => {
    try {
      console.log('Fetching chat sessions');
      const response = await api.get('/api/v1/chat/sessions?limit=10');
      setChatSessions(response.data);
      console.log(`Fetched ${response.data.length} sessions`);
    } catch (error) {
      console.error('Failed to fetch chat sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Hôm nay';
    } else if (diffDays === 1) {
      return 'Hôm qua';
    } else if (diffDays < 7) {
      return `${diffDays} ngày trước`;
    } else {
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  const handleLoadSession = (sessionId: string) => {
    console.log('Loading session:', sessionId);
    navigation.navigate('Chat', { sessionId });
  };

  const handleDeleteSession = (sessionId: string, title: string) => {
    Alert.alert(
      'Xóa cuộc trò chuyện',
      `Bạn có chắc chắn muốn xóa "${title}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/v1/chat/sessions/${sessionId}`);
              setChatSessions(chatSessions.filter(s => s.session_id !== sessionId));
              console.log(`Deleted session ${sessionId}`);
              // Notify ChatScreen that a session was deleted
              DeviceEventEmitter.emit('chatSessionDeleted', { sessionId });
            } catch (error) {
              console.error('Failed to delete session:', error);
              Alert.alert('Lỗi', 'Không thể xóa cuộc trò chuyện. Vui lòng thử lại.');
            }
          }
        }
      ]
    );
  };

  const handleProfile = () => {
    navigation.navigate('UserProfile');
  };

  const handleMenuOption = (optionId: string) => {
    if (optionId === 'chat') navigation.navigate('Chat');
    if (optionId === 'help') navigation.navigate('FAQs');
    if (optionId === 'documents') navigation.navigate('DocumentLookup');
    if (optionId === 'procedures') navigation.navigate('ProcedureLookup');
    if (optionId === 'lawyer') navigation.navigate('Lawyer');
    if (optionId === 'myRequests') navigation.navigate('MyRequests');
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientMiddle1, COLORS.gradientMiddle2, COLORS.gradientEnd]}
      locations={[0, 0.44, 0.67, 1]}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top, paddingBottom: 8 }]}>
        <Image
          source={LOGO_PATH}
          style={styles.logo}
          resizeMode="contain"
        />
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={30} color={COLORS.gray} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* User Profile */}
        <TouchableOpacity
          onPress={handleProfile}
        >
          <View style={styles.profileContainer}>
            <View style={styles.profileImageContainer}>
              <Image
                source={
                  getFullAvatarUrl(user?.avatar_url)
                    ? { uri: getFullAvatarUrl(user?.avatar_url)! }
                    : LOGO_PATH
                }
                style={styles.profileImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.full_name || 'User'}</Text>
              <Text style={styles.profileEmail}>{user?.email || ''}</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={30} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Menu Options */}
        <View style={styles.menuContainer}>
          {menuOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.menuOption}
              onPress={() => handleMenuOption(option.id)}
            >
              <Ionicons name={option.icon as any} size={24} color={COLORS.black} style={styles.menuIcon} />
              <Text style={styles.menuText}>{option.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chat History */}
        <View style={styles.chatHistoryContainer}>
          <Text style={styles.chatHistoryTitle}>Lịch sử trò chuyện</Text>
          <View style={styles.separator} />
          <ScrollView style={styles.chatHistory}>
            {loadingSessions ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : chatSessions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>
              </View>
            ) : (
              chatSessions.map((session, index) => (
                <TouchableOpacity
                  key={session.session_id || `session-${index}`}
                  style={styles.chatItem}
                  onPress={() => handleLoadSession(session.session_id)}
                  onLongPress={() => handleDeleteSession(session.session_id, session.title)}
                >
                  <View style={styles.chatItemContent}>
                    <Ionicons name="chatbubbles-outline" size={20} color={COLORS.primary} />
                    <View style={styles.chatItemTextContainer}>
                      <Text style={styles.chatItemTitle} numberOfLines={1} ellipsizeMode="tail">
                        {session.title}
                      </Text>
                      <View style={styles.chatItemMetadata}>
                        <Text style={styles.chatItemDate}>{formatDate(session.updated_at)}</Text>
                        <Text style={styles.chatItemDivider}>•</Text>
                        <Text style={styles.chatItemCount}>{session.message_count} tin nhắn</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.chatItemDeleteButton}
                      onPress={() => handleDeleteSession(session.session_id, session.title)}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>
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
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 50,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.buttonLight,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  profileImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 100,
    overflow: 'hidden',
    marginRight: 16,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    color: COLORS.black,
    marginBottom: 4,
  },
  profileEmail: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: '#666',
  },
  logoutButton: {
    padding: 8,
  },
  menuContainer: {
    backgroundColor: COLORS.buttonLight,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  menuIcon: {
    marginRight: 16,
    width: 24,
  },
  menuText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.black,
  },
  chatHistoryContainer: {
    flex: 1,
    backgroundColor: COLORS.buttonLight,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  chatHistoryTitle: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.black,
    marginBottom: 5,
  },
  chatHistory: {
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginBottom: 10,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    textAlign: 'center',
  },
  chatItem: {
    marginBottom: 12,
  },
  chatItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chatItemTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  chatItemTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.small,
    color: COLORS.black,
    marginBottom: 4,
  },
  chatItemMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatItemDate: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.gray,
  },
  chatItemDivider: {
    marginHorizontal: 4,
    color: COLORS.lightGray,
    fontSize: 11,
  },
  chatItemCount: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.gray,
  },
  chatItemDeleteButton: {
    padding: 6,
  },
});

export default MenuScreen;
