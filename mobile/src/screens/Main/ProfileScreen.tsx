import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SIZES } from '../../constants/styles';
import Header from '../../components/Header';
import EditProfileModal from '../../components/Profile/EditProfileModal';
import * as ImagePicker from 'expo-image-picker';
import { storage } from '../../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import api from '../../api';

const ProfileScreen = ({ navigation }: { navigation: any }) => {
  const { user, refreshUserData } = useAuth();
  const [isModalVisible, setModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form state for the modal
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phone || '');
      setAddress('');
    }
  }, [user]);

  const handleChangeAvatar = async () => {
    setIsUploading(true);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Denied", "You need to allow access to your photos to change your avatar.");
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (pickerResult.canceled) {
        return;
      }

      const imageUri = pickerResult.assets[0].uri;
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Create a unique path for the image
      const storageRef = ref(storage, `avatars/${user.id}/${Date.now()}`);
      
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update the backend with the new avatar URL
      await api.patch('/api/v1/users/me', { avatar_url: downloadURL });

      // Refresh user data to show the new avatar
      await refreshUserData();

      Alert.alert("Success", "Your avatar has been updated.");

    } catch (error) {
      console.error("Avatar upload error:", error);
      Alert.alert("Upload Failed", "Sorry, we couldn't update your avatar. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const openModal = () => setModalVisible(true);
  const closeModal = () => setModalVisible(false);

  const profileImageUrl = user?.avatar_url || 'https://www.gravatar.com/avatar/?d=mp';

  if (!user) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  const InfoRow = ({ label, value }: { label: string, value: string | null }) => (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || '---'}</Text>
    </View>
  );

  return (
    <LinearGradient colors={[COLORS.profileGradientStart, COLORS.profileGradientMid, COLORS.profileGradientEnd]} style={styles.container}>
      <Header title="Thông tin cá nhân" showAddChat={true} />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          <View style={styles.avatarSection}>
            <Image source={{ uri: profileImageUrl }} style={styles.avatar} />
            <View style={styles.avatarTextContainer}>
                <TouchableOpacity style={styles.changeAvatarButtonContainer} onPress={handleChangeAvatar} disabled={isUploading}>
                  {isUploading ? (
                    <ActivityIndicator color={COLORS.primary} />
                  ) : (
                    <Text style={styles.changeAvatarButton}>Thay đổi ảnh đại diện</Text>
                  )}
                </TouchableOpacity>
                <Text style={styles.avatarHint}>Định dạng hình ảnh JPEG, PNG, tối đa 2MB.</Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <InfoRow label="Họ và Tên" value={user.full_name} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Số điện thoại" value={user.phone} />
            <InfoRow label="Địa chỉ" value={null} />
          </View>

          <TouchableOpacity style={styles.mainButton} onPress={openModal}>
            <Text style={styles.mainButtonText}>Thay đổi thông tin</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <EditProfileModal
        visible={isModalVisible}
        onClose={closeModal}
        fullName={fullName}
        email={email}
        phoneNumber={phoneNumber}
        address={address}
        setFullName={setFullName}
        setEmail={setEmail}
        setPhoneNumber={setPhoneNumber}
        setAddress={setAddress}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: SIZES.padding,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginHorizontal: SIZES.padding,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.padding * 1.5,
    paddingBottom: SIZES.padding * 1.5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: SIZES.padding,
  },
  avatarTextContainer: {
    flex: 1,
  },
  changeAvatarButtonContainer: {
    backgroundColor: '#F4F4F4',
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.padding / 2,
    paddingHorizontal: SIZES.padding,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  changeAvatarButton: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.medium,
    color: COLORS.primary,
  },
  avatarHint: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
  },
  infoSection: {
    marginBottom: SIZES.padding,
  },
  infoRow: {
    marginBottom: SIZES.padding * 1.5,
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginBottom: 4,
  },
  value: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body,
    color: COLORS.black,
  },
  mainButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.padding,
    alignItems: 'center',
    marginTop: SIZES.padding,
  },
mainButtonText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    color: COLORS.white,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E6F0F9',
  },
});

export default ProfileScreen;