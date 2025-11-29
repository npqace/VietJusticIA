import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  Alert,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import CustomButton from '../../components/CustomButton';
import { COLORS, SIZES, FONTS, LOGO_PATH, GOOGLE_LOGO_PATH } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import ForgotPasswordModal from '../../components/Auth/ForgotPasswordModal';
import OtpVerificationModal from '../../components/Auth/OtpVerificationModal';
import ResetPasswordModal from '../../components/Auth/ResetPasswordModal';
import { verifyResetOTP, resendPasswordResetOTP } from '../../services/authService';

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [isOtpModalVisible, setOtpModalVisible] = useState(false);
  const [isResetPasswordVisible, setResetPasswordVisible] = useState(false);
  const [emailForReset, setEmailForReset] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await login({ identifier, pwd: password });
    } catch (err: any) {
      let message = 'An unexpected error occurred.';
      if (err?.response?.data?.detail) {
        message = err.response.data.detail;
      } else if (err.message) {
        message = err.message;
      }
      Alert.alert('Lỗi Đăng Nhập', message);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToSignup = () => {
    navigation.navigate('Signup');
  };

  const handleForgotPasswordSuccess = (email: string) => {
    setForgotPasswordVisible(false);
    setEmailForReset(email);
    setOtpModalVisible(true);
  };

  const handleOtpSuccess = (data: any) => {
    if (data?.reset_token) {
      setOtpModalVisible(false);
      setResetToken(data.reset_token);
      setResetPasswordVisible(true);
    } else {
      Alert.alert("Lỗi", "Không nhận được mã thông báo đặt lại. Vui lòng thử lại.");
    }
  };

  const handleResetPasswordSuccess = () => {
    setResetPasswordVisible(false);
    Alert.alert(
      'Thành công',
      'Mật khẩu của bạn đã được đặt lại thành công. Vui lòng đăng nhập bằng mật khẩu mới.'
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientMiddle1, COLORS.gradientMiddle2, COLORS.gradientEnd]}
        locations={[0, 0.44, 0.67, 1]}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidView}
        >
          <View style={styles.innerContainer}>
            <Image
              source={LOGO_PATH}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.title}>Đăng nhập</Text>

            {/* Input Fields */}
            <Text style={styles.inputLabel}>Email / Số điện thoại</Text>
            <View style={styles.inputOuterContainer}>
              <TextInput
                style={styles.input}
                placeholder="hello@example.com"
                placeholderTextColor={COLORS.black}
                value={identifier}
                onChangeText={setIdentifier}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Mật khẩu</Text>
              <TouchableOpacity onPress={() => setForgotPasswordVisible(true)}>
                <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputOuterContainer}>
              <Ionicons name="lock-closed-outline" size={22} color={COLORS.black} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••••••"
                placeholderTextColor={COLORS.black}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIconTouchable}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={24} color={COLORS.black} />
              </TouchableOpacity>
            </View>

            <CustomButton
                            title="Đăng nhập"
                            onPress={handleLogin}
                            buttonStyle={styles.loginButton}
                            textStyle={styles.loginButtonText}
                            isLoading={isLoading}
                          />
            <Text style={styles.orText}>hoặc</Text>

            {/* Google Button */}
            <TouchableOpacity style={styles.googleButton} onPress={() => { }}>
                <Image
                  source={GOOGLE_LOGO_PATH}
                  style={styles.googleLogo}
                  resizeMode="contain"
                />
                <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={navigateToSignup} style={styles.signupLink}>
              <Text style={styles.signupLinkText}>Tạo tài khoản</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </LinearGradient>
      <ForgotPasswordModal
        visible={isForgotPasswordVisible}
        onClose={() => setForgotPasswordVisible(false)}
        onSuccess={handleForgotPasswordSuccess}
      />
      <OtpVerificationModal
        visible={isOtpModalVisible}
        email={emailForReset}
        onClose={() => setOtpModalVisible(false)}
        onVerify={(otp) => verifyResetOTP(emailForReset, otp)}
        onResend={() => resendPasswordResetOTP(emailForReset)}
        onSuccess={handleOtpSuccess}
        title="Đặt lại mật khẩu"
        subtitle="Một mã OTP đã được gửi đến email của bạn để đặt lại mật khẩu."
      />
      <ResetPasswordModal
        visible={isResetPasswordVisible}
        onClose={() => setResetPasswordVisible(false)}
        onSuccess={handleResetPasswordSuccess}
        token={resetToken}
      />
    </SafeAreaView>
  );
};

// Styles remain the same...
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
  },
  keyboardAvoidView: {
    flex: 1,
    justifyContent: 'center',
  },
  
  innerContainer: {
    width: '95%',
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  logo: {
    width: width * 0.25,
    height: width * 0.25,
    marginBottom: 10,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading1,
    color: COLORS.black,
    marginBottom: 25,
    textAlign: 'center',
  },
  inputLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body,
    color: COLORS.black,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.medium,
    color: COLORS.primary,
  },
  inputOuterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.buttonLight,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    width: '100%',
    height: 55,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
  eyeIconTouchable: {
    padding: 8,
  },
  loginButton: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    height: 55,
    width: '100%',
  },
  loginButtonText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    color: COLORS.white,
  },
  orText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.black,
    marginVertical: 16,
},
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.buttonLight,
    borderRadius: 8,
    width: '100%',
    height: 55,
    borderWidth: 1,
    borderColor: '#D3D3D3',
    marginBottom: 16, 
  },
  googleLogo: {
    width: 24,
    height: 24,
    marginRight: 16,
  },
  googleButtonText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    color: COLORS.black,
  },
  signupLink: {
    marginTop: 8,
    padding: 8,
  },
  signupLinkText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body,
    color: COLORS.primary,
  },
});

export default LoginScreen;
