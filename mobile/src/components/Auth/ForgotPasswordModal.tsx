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
import { forgotPassword } from '../../services/authService';

/**
 * Props for ForgotPasswordModal component
 */
interface ForgotPasswordModalProps {
  /** Whether modal is visible */
  visible: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Callback invoked after request (success or error) - receives email for OTP verification */
  onSuccess: (email: string) => void;
}

/**
 * ForgotPasswordModal Component
 *
 * Modal for requesting password reset via email.
 * Implements anti-enumeration security pattern to prevent email discovery attacks.
 *
 * Security Features:
 * - Anti-enumeration: Always shows success message regardless of email validity
 * - Prevents attackers from discovering valid emails by timing/response differences
 * - Backend handles actual validation and email sending
 *
 * @component
 */
const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ visible, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Requests password reset for provided email
   *
   * Security: Implements anti-enumeration pattern
   * - Always calls onSuccess regardless of API response
   * - Prevents attackers from discovering valid emails
   */
  const handleRequestReset = async () => {
    Keyboard.dismiss();
    const mail = email.trim();

    if (!mail) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ email của bạn.');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mail)) {
      Alert.alert('Lỗi', 'Email không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword(mail);
      // Anti-enumeration: Show same success behavior for all cases
      onSuccess(mail);
    } catch (err) {
      // SECURITY: Anti-enumeration pattern
      // Always call onSuccess (same as success case) to prevent email discovery
      // Attackers cannot determine if email exists by observing different responses
      onSuccess(mail);
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
              <Text style={styles.title}>Quên mật khẩu</Text>
              <Text style={styles.subtitle}>
                Nhập email của bạn và chúng tôi sẽ gửi cho bạn một mã OTP để đặt lại mật khẩu.
              </Text>
              <View style={styles.inputOuterContainer}>
                <Ionicons name="mail-outline" size={22} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={COLORS.gray}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <CustomButton
                title="Gửi yêu cầu"
                onPress={handleRequestReset}
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
    marginBottom: 20,
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
  },
  submitButtonText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    color: COLORS.white,
  },
});

export default ForgotPasswordModal;