import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Modal,
} from 'react-native';
import CustomButton from '../CustomButton';
import { COLORS, SIZES, FONTS } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons';
import { resetPassword } from '../../services/authService';
import PasswordRequirements from '../PasswordRequirements';

interface ResetPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
}

const validatePassword = (password: string): string => {
  if (password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
  if (!/[A-Z]/.test(password)) return 'Mật khẩu phải chứa ít nhất 1 chữ hoa.';
  if (!/[a-z]/.test(password)) return 'Mật khẩu phải chứa ít nhất 1 chữ thường.';
  if (!/[0-9]/.test(password)) return 'Mật khẩu phải chứa ít nhất 1 chữ số.';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.';
  return '';
};

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ visible, onClose, onSuccess, token }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);

  const handleResetPassword = async () => {
    Keyboard.dismiss();
    if (!token) {
      Alert.alert('Lỗi', 'Không tìm thấy mã thông báo đặt lại mật khẩu.');
      return;
    }
    if (!newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ tất cả các trường.');
      return;
    }
    
    // Validate new password
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      Alert.alert('Lỗi', passwordError);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới không khớp.');
      return;
    }
    setIsLoading(true);
    try {
      await resetPassword({ token, new_password: newPassword });
      onSuccess();
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.detail || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContainer}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color={COLORS.gray} />
              </TouchableOpacity>
              <Text style={styles.title}>Đặt lại mật khẩu</Text>
              <Text style={styles.subtitle}>
                Nhập mật khẩu mới của bạn.
              </Text>
              
              <View style={styles.inputOuterContainer}>
                <Ionicons name="lock-closed-outline" size={22} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Mật khẩu mới"
                  placeholderTextColor={COLORS.gray}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  onFocus={() => setNewPasswordFocused(true)}
                  onBlur={() => setNewPasswordFocused(false)}
                  secureTextEntry
                />
              </View>

              {/* Password Requirements Component */}
              {(newPasswordFocused || newPassword.length > 0) && (
                <View style={{ width: '100%', marginBottom: 10 }}>
                  <PasswordRequirements password={newPassword} showRequirements={true} />
                </View>
              )}

              <View style={styles.inputOuterContainer}>
                <Ionicons name="lock-closed-outline" size={22} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Xác nhận mật khẩu mới"
                  placeholderTextColor={COLORS.gray}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>

              <CustomButton
                title="Đặt lại mật khẩu"
                onPress={handleResetPassword}
                buttonStyle={styles.submitButton}
                textStyle={styles.submitButtonText}
                isLoading={isLoading}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading2,
    color: COLORS.black,
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.medium,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 30,
  },
  inputOuterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 16,
    width: '100%',
    height: 55,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.black,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    height: 55,
    width: '100%',
    marginTop: 10,
  },
  submitButtonText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    color: COLORS.white,
  },
});

export default ResetPasswordModal;