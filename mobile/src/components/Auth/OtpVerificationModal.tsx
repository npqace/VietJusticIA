import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import CustomButton from '../CustomButton';
import { COLORS, SIZES, FONTS } from '../../constants/styles';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  detail?: string;
  message?: string;
}

/**
 * Props for OtpVerificationModal component
 */
interface OtpVerificationModalProps {
  /** Whether modal is visible */
  visible: boolean;
  /** User's email address (will be masked in display) */
  email: string;
  /** Callback to close modal */
  onClose: () => void;
  /** Callback to verify OTP code - returns API response */
  onVerify: (otp: string) => Promise<any>;
  /** Callback to resend OTP - returns API response */
  onResend: () => Promise<any>;
  /** Callback invoked on successful verification - receives API response data */
  onSuccess: (data?: any) => void;
  /** Optional modal title (default: "Xác nhận mã OTP") */
  title?: string;
  /** Optional subtitle text (default: "Mã xác nhận...") */
  subtitle?: string;
}

/**
 * OtpVerificationModal Component
 *
 * Modal for entering and verifying 6-digit OTP codes sent via email.
 * Includes auto-focus navigation, countdown timer, and email masking.
 *
 * Features:
 * - 6 individual digit inputs with auto-focus
 * - Backspace navigation between inputs
 * - 60-second countdown before resend allowed
 * - Email masking (shows first 3 chars + ***)
 * - Digit-only validation (regex)
 * - Timer cleanup on unmount
 *
 * @component
 */
const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  visible,
  email,
  onClose,
  onVerify,
  onResend,
  onSuccess,
  title = "Xác nhận mã OTP",
  subtitle = "Mã xác nhận OTP đã được gửi về email của bạn:",
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState(new Array(6).fill(''));
  const [resendDisabled, setResendDisabled] = useState(true);
  const [countdown, setCountdown] = useState(60);

  const otpInputs = useRef<Array<TextInput | null>>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Function to start countdown timer
  const startCountdownTimer = () => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setResendDisabled(true);
    setCountdown(60);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (visible) {
      setOtp(new Array(6).fill(''));
      startCountdownTimer();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible]);

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập đủ 6 số OTP.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await onVerify(otpCode);
      onSuccess(response); // Pass the whole response back
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Đã có lỗi xảy ra.';

      Alert.alert('Xác thực thất bại', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      await onResend();
      Alert.alert('Đã gửi lại OTP', 'Một mã OTP mới đã được gửi tới email của bạn.');
      // Restart the countdown timer
      startCountdownTimer();
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      const errorMessage =
        axiosError.response?.data?.detail ||
        axiosError.response?.data?.message ||
        'Không thể gửi lại OTP.';

      Alert.alert('Lỗi', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles OTP input change for a specific digit
   * Auto-focuses next input after digit entry
   */
  const handleOtpChange = (text: string, index: number) => {
    if (/^[0-9]$/.test(text) || text === '') {
      const newOtp = [...otp];
      newOtp[index] = text;
      setOtp(newOtp);

      if (text !== '' && index < 5) {
        otpInputs.current[index + 1]?.focus();
      }
    }
  };

  /**
   * Handles backspace key press on OTP inputs
   * Focuses previous input when backspace pressed on empty field
   */
  const handleOtpBackspace = (event: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (event.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  /**
   * Masks email for privacy (shows first 3 chars + ***)
   */
  const maskEmail = (email: string) => {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return email;
    const maskedLocalPart = localPart.length > 3 ? `${localPart.substring(0, 3)}***` : '***';
    return `${maskedLocalPart}@${domain}`;
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.modalSubtitle}>
                {subtitle} <Text style={styles.boldText}>{maskEmail(email)}</Text>
              </Text>
              <View style={styles.otpInputContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    style={styles.otpInput}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    onKeyPress={(e) => handleOtpBackspace(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    ref={(ref) => (otpInputs.current[index] = ref)}
                  />
                ))}
              </View>
              <CustomButton
                title="Xác nhận"
                onPress={handleVerify}
                buttonStyle={styles.modalButton}
                textStyle={styles.signupButtonText}
                isLoading={isLoading}
              />
              <TouchableOpacity onPress={handleResendOtp} disabled={resendDisabled}>
                <Text style={[styles.resendText, resendDisabled && styles.resendTextDisabled]}>
                  {resendDisabled ? `Gửi lại mã trong ${countdown}s` : 'Gửi lại mã'}
                </Text>
              </TouchableOpacity>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading3,
    color: COLORS.black,
    marginBottom: 15,
  },
  modalSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.medium,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: SIZES.medium * 1.4,
  },
  boldText: {
    fontFamily: FONTS.bold,
  },
  otpInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 25,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    textAlign: 'center',
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading4,
    color: COLORS.primary,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    height: 55,
    width: '100%',
  },
  resendText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.medium,
    color: COLORS.primary,
    marginTop: 20,
  },
  resendTextDisabled: {
    color: COLORS.gray,
  },
  signupButtonText: { // Re-using style from SignupScreen for consistency
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    color: COLORS.white,
  },
});

export default OtpVerificationModal;
