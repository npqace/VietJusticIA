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
import api from '../../api';
import ChangePasswordModal from '../../components/Profile/ChangePasswordModal';
import DeleteAccountModal from '../../components/Profile/DeleteAccountModal';
import { changePassword, forgotPassword, deactivateAccount, deleteAccount } from '../../services/authService';
import { getFullAvatarUrl } from '../../utils/avatarHelper';
import { useNavigation } from '@react-navigation/native';
import { ProfileScreenNavigationProp } from '../../types/navigation';
import logger from '../../utils/logger';
import { getAccountErrorMessage, getErrorStatus, isNetworkError } from '../../utils/errorMessages';
import { SCREEN_NAMES } from '../../constants/screens';

/**
 * User profile management screen.
 *
 * Features:
 * - View and edit profile information (name, email, phone)
 * - Upload/change avatar image
 * - Change password
 * - Deactivate account (can reactivate by logging in)
 * - Delete account (permanent)
 */
const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
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

  /**
   * Handle avatar image upload.
   * Requests media library permission, allows user to select image,
   * validates and uploads to backend.
   */
  const handleChangeAvatar = async () => {
    setIsUploading(true);
    try {
      // Request permission to access media library
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Quyền truy cập bị từ chối", "Bạn cần cho phép truy cập vào ảnh để thay đổi ảnh đại diện.");
        setIsUploading(false);
        return;
      }

      // Launch image picker
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (pickerResult.canceled) {
        setIsUploading(false);
        return;
      }

      const asset = pickerResult.assets[0];
      const imageUri = asset.uri;

      // Validate file size (5MB limit)
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert("Ảnh quá lớn", "Vui lòng chọn ảnh nhỏ hơn 5MB.");
        setIsUploading(false);
        return;
      }

      // Create FormData for multipart upload
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: imageUri,
        name: filename,
        type: type,
      } as unknown as Blob);

      // Upload to backend
      await api.post('/api/v1/users/me/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Refresh user data to show the new avatar
      await refreshUserData();

      Alert.alert("Thành công", "Ảnh đại diện của bạn đã được cập nhật.");

    } catch (error: unknown) {
      logger.error("Avatar upload error:", error);

      const status = getErrorStatus(error);
      if (status === 413) {
        Alert.alert("Tải lên thất bại", "Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB.");
      } else if (isNetworkError(error)) {
        Alert.alert("Lỗi Kết Nối", "Không thể kết nối đến máy chủ. Vui lòng thử lại.");
      } else {
        const errorMessage = (error as any).response?.data?.detail || 'Không thể cập nhật ảnh đại diện. Vui lòng thử lại.';
        Alert.alert("Tải lên thất bại", errorMessage);
      }
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

  /**
   * Handle forgot password from change password modal.
   * Sends password reset OTP to user's email and navigates to reset screen.
   */
  const handleForgotPasswordFromModal = async () => {
    closeChangePasswordModal();

    if (!user?.email) {
      Alert.alert('Lỗi', 'Không thể xác định email của bạn. Vui lòng đăng nhập lại.');
      return;
    }

    try {
      await forgotPassword(user.email);
      Alert.alert(
        'Kiểm tra Email của bạn',
        'Nếu tài khoản tồn tại, một mã OTP để đặt lại mật khẩu đã được gửi đến email của bạn.',
        [{ text: 'OK', onPress: () => navigation.navigate(SCREEN_NAMES.RESET_PASSWORD, { email: user.email! }) }]
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.detail || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    }
  };

  /**
   * Handle account deactivation.
   * Shows confirmation alert, deactivates account on backend, and logs out user.
   */
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
              Alert.alert("Thành công", "Tài khoản của bạn đã được vô hiệu hóa.");
              await logout();
            } catch (error) {
              logger.error("Deactivate account error", error);
              Alert.alert("Lỗi", getAccountErrorMessage(error, 'deactivate'));
            }
          },
        },
      ]
    );
  };

  /**
   * Handle account deletion.
   * Permanently deletes account from backend and logs out user.
   */
  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      Alert.alert("Thành công", "Tài khoản của bạn đã được xóa.");
      await logout();
    } catch (error) {
      logger.error("Delete account error", error);
      Alert.alert("Lỗi", getAccountErrorMessage(error, 'delete'));
    }
  };

  // Get avatar URL using shared helper, with Gravatar fallback
  const profileImageUrl = getFullAvatarUrl(user?.avatar_url) || 'https://www.gravatar.com/avatar/?d=mp';

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
              <Text style={styles.avatarHint}>Định dạng hình ảnh JPEG, PNG, WEBP, tối đa 5MB.</Text>
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
    marginBottom: SIZES.padding,
    paddingBottom: SIZES.padding,
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