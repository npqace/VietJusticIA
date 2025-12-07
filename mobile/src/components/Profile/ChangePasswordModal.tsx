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
import PasswordRequirements from '../PasswordRequirements';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  detail?: string;
  message?: string;
}

/**
 * Props for ChangePasswordModal component
 */
interface ChangePasswordModalProps {
  /** Whether modal is visible */
  visible: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Callback to change password (requires current password verification) */
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Callback to trigger forgot password flow (shows ForgotPasswordModal) */
  onForgotPassword: () => void;
}

/**
 * Validates password against security requirements
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 number (0-9)
 * - At least 1 special character (!@#$%^&*(),.?":{}|<>)
 *
 * @param {string} password - Password to validate
 * @returns {string} Error message if invalid, empty string if valid
 */
const validatePassword = (password: string): string => {
  if (password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
  if (!/[A-Z]/.test(password)) return 'Mật khẩu phải chứa ít nhất 1 chữ hoa.';
  if (!/[a-z]/.test(password)) return 'Mật khẩu phải chứa ít nhất 1 chữ thường.';
  if (!/[0-9]/.test(password)) return 'Mật khẩu phải chứa ít nhất 1 chữ số.';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.';
  return '';
};

/**
 * ChangePasswordModal Component
 *
 * Modal for changing user password with current password verification.
 * Includes forgot password link for users who don't remember current password.
 *
 * User Flow:
 * 1. User enters current password
 * 2. User enters new password (PasswordRequirements shows real-time feedback)
 * 3. User confirms new password
 * 4. If user forgot current password: Click "Quên mật khẩu?" → ForgotPasswordModal
 * 5. Backend verifies current password before changing
 *
 * @component
 */
const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ visible, onClose, onChangePassword, onForgotPassword }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);

  /**
   * Handles password change with validation
   *
   * Validation Flow:
   * 1. Check all fields non-empty
   * 2. Validate new password against requirements (validatePassword)
   * 3. Check new password matches confirm password
   * 4. Call onChangePassword (parent handles API call + error handling)
   */
  const handleChangePassword = async () => {
    Keyboard.dismiss();

    const current = currentPassword.trim();
    const newPass = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!current || !newPass || !confirm) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ tất cả các trường.');
      return;
    }

    // Validate new password
    const passwordError = validatePassword(newPass);
    if (passwordError) {
      Alert.alert('Lỗi', passwordError);
      return;
    }

    if (newPass !== confirm) {
      Alert.alert('Lỗi', 'Mật khẩu mới không khớp.');
      return;
    }

    setIsLoading(true);
    try {
      await onChangePassword(current, newPass);
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      const errorMessage =
        axiosError.response?.data?.detail ||
        axiosError.response?.data?.message ||
        'Đã có lỗi xảy ra. Vui lòng thử lại.';

      Alert.alert('Lỗi', errorMessage);
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
              <Text style={styles.title}>Đổi mật khẩu</Text>

              <View style={styles.inputOuterContainer}>
                <Ionicons name="lock-closed-outline" size={22} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Mật khẩu hiện tại"
                  placeholderTextColor={COLORS.gray}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                />
              </View>

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
                <View style={styles.requirementsContainer}>
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

              <TouchableOpacity onPress={onForgotPassword} style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
              </TouchableOpacity>

              <CustomButton
                title="Đổi mật khẩu"
                onPress={handleChangePassword}
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
    backgroundColor: COLORS.modalBackdrop || 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: COLORS.white,
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
    marginBottom: 30,
    textAlign: 'center',
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
  requirementsContainer: {
    width: '100%',
    marginBottom: 10,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginVertical: 10,
  },
  forgotPasswordText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.medium,
    color: COLORS.primary,
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

export default ChangePasswordModal;
