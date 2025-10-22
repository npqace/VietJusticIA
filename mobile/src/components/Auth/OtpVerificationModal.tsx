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
} from 'react-native';
import CustomButton from '../CustomButton';
import { COLORS, SIZES, FONTS } from '../../constants/styles';
import { verifyOTP, resendOTP } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

interface OtpVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  email: string;
}

const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({ visible, onClose, email }) => {
  const { handleOtpVerified } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState(new Array(6).fill(''));
  const [resendDisabled, setResendDisabled] = useState(true);
  const [countdown, setCountdown] = useState(60);

  const otpInputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (visible && resendDisabled) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === 1) {
            clearInterval(timer);
            setResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [visible, resendDisabled]);

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập đủ 6 số OTP.');
      return;
    }
    setIsLoading(true);
    try {
      await verifyOTP(email, otpCode);
      handleOtpVerified();
    } catch (error: any) {
      Alert.alert('Xác thực thất bại', error.response?.data?.detail || 'Đã có lỗi xảy ra.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      await resendOTP(email);
      Alert.alert('Đã gửi lại OTP', 'Một mã OTP mới đã được gửi tới email của bạn.');
      setResendDisabled(true);
      setCountdown(60);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.detail || 'Không thể gửi lại OTP.');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleOtpBackspace = (event: any, index: number) => {
    if (event.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

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
              <Text style={styles.modalTitle}>Xác nhận mã OTP</Text>
              <Text style={styles.modalSubtitle}>
                Mã xác nhận OTP đã được gửi về email của bạn: <Text style={{fontWeight: 'bold'}}>{maskEmail(email)}</Text>
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
