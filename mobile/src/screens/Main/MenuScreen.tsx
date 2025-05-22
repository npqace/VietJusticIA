import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SPACING, FONTS, RADIUS, LOGO_PATH } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';

const { width } = Dimensions.get('window');

const MenuScreen = ({ navigation }: { navigation: any }) => {
  // Menu options
  const menuOptions = [
    {
      id: 'documents',
      title: 'Tra cứu văn bản',
      icon: 'document-text-outline'
    },
    {
      id: 'procedures',
      title: 'Tra cứu thủ tục hành chính',
      icon: 'list-outline'
    },
    {
      id: 'lawyer',
      title: 'Liên hệ luật sư',
      icon: 'person-outline'
    },
    {
      id: 'help',
      title: 'Hỗ trợ',
      icon: 'help-circle-outline'
    }
  ];

  const handleMenuOption = (optionId: string) => {
    console.log(`Selected option: ${optionId}`);
    // Navigate to appropriate screen based on option
    // Example: navigation.navigate('DocumentSearch');
    if (optionId === 'help') {
      navigation.navigate('FAQs');
    }
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Image
            source={LOGO_PATH}
            style={styles.logo}
            resizeMode="contain"
          />
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={30} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          {/* User Profile */}
          <View style={styles.profileContainer}>
            <View style={styles.profileImageContainer}>
              <Image
                source={LOGO_PATH} // Use logo image as a placeholder
                style={styles.profileImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>Ace Nguyen</Text>
              <Text style={styles.profileEmail}>anhnpqgcd220190@fpt.edu.vn</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Ionicons name="log-out-outline" size={30} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          
          {/* Menu Options */}
          <View style={styles.menuContainer}>
            {menuOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.menuOption}
                onPress={() => handleMenuOption(option.id)}
              >
                <Ionicons name={option.icon as any} size={24} color={COLORS.textDark} style={styles.menuIcon} />
                <Text style={styles.menuText}>{option.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Chat History */}
          <View style={styles.chatHistoryContainer}>
            <Text style={styles.chatHistoryTitle}>Lịch sử trò chuyện</Text>
            <View style={styles.separator} />
            <ScrollView style={styles.chatHistory}>

            </ScrollView>
          </View>

        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    height: hp('7%'),
  },
  logo: {
    width: width * 0.15,
    height: width * 0.15,    
  },
  closeButton: {
    padding: SPACING.sm,
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
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body,
    color: COLORS.textDark,
    marginBottom: 4,
  },
  profileEmail: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: '#666',
  },
  logoutButton: {
    padding: SPACING.sm,
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
    color: COLORS.textDark,
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
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body,
    color: COLORS.textDark,
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
});

export default MenuScreen;