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
import ChangePasswordModal from '../../components/Profile/ChangePasswordModal';
import DeleteAccountModal from '../../components/Profile/DeleteAccountModal';
import { changePassword, forgotPassword, deactivateAccount, deleteAccount } from '../../services/authService';

const ProfileScreen = ({ navigation }: { navigation: any }) => {
  const { user, refreshUserData, logout } = useAuth();
  const [isModalVisible, setModalVisible] = useState(false);
  const [isChangePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form state for the modal
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phone || '');
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

  const openChangePasswordModal = () => setChangePasswordModalVisible(true);
  const closeChangePasswordModal = () => setChangePasswordModalVisible(false);

  const openDeleteModal = () => setDeleteModalVisible(true);
  const closeDeleteModal = () => setDeleteModalVisible(false);

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    await changePassword({ current_password: currentPassword, new_password: newPassword, confirm_new_password: newPassword });
    closeChangePasswordModal();
    Alert.alert("Thành công", "Mật khẩu của bạn đã được thay đổi.");
  };

  const handleForgotPasswordFromModal = async () => {
    closeChangePasswordModal();
    try {
      await forgotPassword(user.email);
      Alert.alert(
        'Kiểm tra Email của bạn',
        'Nếu tài khoản tồn tại, một mã OTP để đặt lại mật khẩu đã được gửi đến email của bạn.',
        [{ text: 'OK', onPress: () => navigation.navigate('ResetPassword', { email: user.email }) }]
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.detail || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    }
  };

  const handleDeactivate = () => {
    Alert.alert(
      "Vô hiệu hóa tài khoản",
      "Bạn có chắc chắn muốn vô hiệu hóa tài khoản của mình không? Bạn có thể kích hoạt lại bằng cách đăng nhập lại.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Vô hiệu hóa",
          style: "destructive",
          onPress: async () => {
            try {
              await deactivateAccount();
              await logout();
            } catch (error) {
              Alert.alert("Lỗi", "Không thể vô hiệu hóa tài khoản. Vui lòng thử lại.");
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      await logout();
    } catch (error) {
      Alert.alert("Lỗi", "Không thể xóa tài khoản. Vui lòng thử lại.");
    }
  };

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
          </View>

          <TouchableOpacity style={styles.mainButton} onPress={openModal}>
            <Text style={styles.mainButtonText}>Thay đổi thông tin</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mainButton, styles.secondaryButton]} onPress={openChangePasswordModal}>
            <Text style={[styles.mainButtonText, styles.secondaryButtonText]}>Đổi mật khẩu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mainButton, styles.secondaryButton]} onPress={() => navigation.navigate('MyRequests')}>
            <Text style={[styles.mainButtonText, styles.secondaryButtonText]}>My Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mainButton, styles.destructiveButton]} onPress={handleDeactivate}>
            <Text style={[styles.mainButtonText, styles.destructiveButtonText]}>Vô hiệu hóa tài khoản</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mainButton, styles.deleteButton]} onPress={openDeleteModal}>
            <Text style={[styles.mainButtonText, styles.deleteButtonText]}>Xóa tài khoản</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <EditProfileModal
        visible={isModalVisible}
        onClose={closeModal}
        fullName={fullName}
        email={email}
        phoneNumber={phoneNumber}
        setFullName={setFullName}
        setEmail={setEmail}
        setPhoneNumber={setPhoneNumber}
      />
      <ChangePasswordModal
        visible={isChangePasswordModalVisible}
        onClose={closeChangePasswordModal}
        onChangePassword={handleChangePassword}
        onForgotPassword={handleForgotPasswordFromModal}
      />
      <DeleteAccountModal
        visible={isDeleteModalVisible}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteAccount}
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
    marginVertical: SIZES.padding * 1.5,
  },
  infoRow: {
    marginBottom: SIZES.padding,
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
  secondaryButton: {
    backgroundColor: COLORS.lightGray,
    marginTop: SIZES.padding / 2,
  },
  secondaryButtonText: {
    color: COLORS.primary,
  },
  destructiveButton: {
    backgroundColor: 'transparent',
    borderColor: COLORS.red,
    borderWidth: 1,
  },
  destructiveButtonText: {
    color: COLORS.red,
  },
  deleteButton: {
    backgroundColor: COLORS.red,
  },
  deleteButtonText: {
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