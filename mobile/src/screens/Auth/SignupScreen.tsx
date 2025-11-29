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
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import CustomButton from '../../components/CustomButton';
import { COLORS, SIZES, FONTS, LOGO_PATH, GOOGLE_LOGO_PATH } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons';
import { signup, verifyOTP, resendOTP } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import PasswordRequirements from '../../components/PasswordRequirements';

const { width } = Dimensions.get('window');

// --- Validation Utility ---
const validateField = (field: string, value: string, password?: string) => {
  switch (field) {
    case 'fullName':
      if (value.trim().length < 2) return 'Họ và Tên phải có ít nhất 2 ký tự.';
      return '';
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return 'Định dạng email không hợp lệ.';
      return '';
    case 'phoneNumber':
      const phoneRegex = /^0[0-9]{9}$/;
      if (!phoneRegex.test(value)) return 'Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0.';
      return '';
    case 'password':
      if (value.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
      if (!/[A-Z]/.test(value)) return 'Mật khẩu phải chứa ít nhất 1 chữ hoa.';
      if (!/[a-z]/.test(value)) return 'Mật khẩu phải chứa ít nhất 1 chữ thường.';
      if (!/[0-9]/.test(value)) return 'Mật khẩu phải chứa ít nhất 1 chữ số.';
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.';
      return '';
    case 'confirmPassword':
      if (value !== password) return 'Mật khẩu không khớp.';
      return '';
    default:
      return '';
  }
};

// --- Standalone InputField Component ---
const InputField = ({ icon, placeholder, value, onChange, onBlur, error, keyboardType = 'default', secureTextEntry = false, prefix, suffix }: any) => (
  <View style={styles.inputContainerWrapper}>
    <View style={[styles.inputOuterContainer, error ? styles.errorBorder : null]}>
      <Ionicons name={icon} size={22} color={COLORS.gray} style={styles.inputIcon} />
      {prefix}
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.gray}
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        keyboardType={keyboardType}
        autoCapitalize="none"
        secureTextEntry={secureTextEntry}
      />
      {suffix}
    </View>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const SignupScreen = ({ navigation }: { navigation: any }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState({
    fullName: '', email: '', phoneNumber: '', password: '', confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const { showOtpModal, handleOtpVerified } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    if (field === 'fullName') setFullName(value);
    else if (field === 'email') setEmail(value);
    else if (field === 'phoneNumber') setPhoneNumber(value.replace(/[^0-9]/g, ''));
    else if (field === 'password') setPassword(value);
    else if (field === 'confirmPassword') setConfirmPassword(value);
  };

  const handleBlur = (field: string) => {
    let value = '';
    let associatedPassword = '';
    if (field === 'fullName') value = fullName;
    else if (field === 'email') value = email;
    else if (field === 'phoneNumber') value = phoneNumber;
    else if (field === 'password') value = password;
    else if (field === 'confirmPassword') {
      value = confirmPassword;
      associatedPassword = password;
    }

    const error = validateField(field, value, associatedPassword);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleSignup = async () => {
    Keyboard.dismiss();
    const fullNameError = validateField('fullName', fullName);
    const emailError = validateField('email', email);
    const phoneError = validateField('phoneNumber', phoneNumber);
    const passwordError = validateField('password', password);
    const confirmPasswordError = validateField('confirmPassword', confirmPassword, password);

    const newErrors = {
      fullName: fullNameError, email: emailError, phoneNumber: phoneError, password: passwordError, confirmPassword: confirmPasswordError
    };
    setErrors(newErrors);

    if (Object.values(newErrors).some(e => e !== '')) return;

    setIsLoading(true);
    try {
      const payload = {
        full_name: fullName,
        email: email,
        phone: `+84${phoneNumber.substring(1)}`,
        pwd: password,
        confirm_pwd: confirmPassword,
      };

      const data = await signup(payload);

      if (data.message) {
        showOtpModal(
          email,
          (otp) => verifyOTP(email, otp),
          () => resendOTP(email),
          handleOtpVerified
        );
      }
    } catch (err: any) {
      let message = 'Đăng ký thất bại. Vui lòng thử lại.';
      if (err.response?.data?.detail && Array.isArray(err.response.data.detail)) {
        message = err.response.data.detail[0].msg;
      } else if (err.response?.data?.detail) {
        message = err.response.data.detail;
      } else if (err.message) {
        message = err.message;
      }
      Alert.alert('Lỗi Đăng Ký', message);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientMiddle1, COLORS.gradientMiddle2, COLORS.gradientEnd]}
        locations={[0, 0.44, 0.67, 1]}
        style={styles.container}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <View style={styles.innerContainer}>
                <Image source={LOGO_PATH} style={styles.logo} resizeMode="contain" />
                <Text style={styles.title}>Tạo tài khoản</Text>

                <InputField
                  icon="person-outline"
                  placeholder="Họ và Tên"
                  value={fullName}
                  onChange={(text: string) => handleInputChange('fullName', text)}
                  onBlur={() => handleBlur('fullName')}
                  error={errors.fullName}
                />

                <InputField
                  icon="mail-outline"
                  placeholder="Email"
                  value={email}
                  onChange={(text: string) => handleInputChange('email', text)}
                  onBlur={() => handleBlur('email')}
                  error={errors.email}
                  keyboardType="email-address"
                />

                <InputField
                  icon="call-outline"
                  placeholder="Số điện thoại"
                  value={phoneNumber}
                  onChange={(text: string) => handleInputChange('phoneNumber', text)}
                  onBlur={() => handleBlur('phoneNumber')}
                  error={errors.phoneNumber}
                  keyboardType="numeric"
                  prefix={<>
                    <Text style={styles.phonePrefix}>+84</Text>
                    <View style={styles.separator} />
                  </>}
                />

                <View style={styles.inputContainerWrapper}>
                  <View style={[styles.inputOuterContainer, errors.password ? styles.errorBorder : null]}>
                    <Ionicons name="lock-closed-outline" size={22} color={COLORS.gray} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Mật khẩu"
                      placeholderTextColor={COLORS.gray}
                      value={password}
                      onChangeText={(text: string) => handleInputChange('password', text)}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => {
                        setPasswordFocused(false);
                        handleBlur('password');
                      }}
                      autoCapitalize="none"
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIconTouchable}>
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={24} color={COLORS.gray} />
                    </TouchableOpacity>
                  </View>
                  {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                </View>

                {/* Password Requirements Component */}
                {(passwordFocused || password.length > 0) && (
                  <PasswordRequirements password={password} showRequirements={true} />
                )}
                
                <InputField
                  icon="lock-closed-outline"
                  placeholder="Xác nhận mật khẩu"
                  value={confirmPassword}
                  onChange={(text: string) => handleInputChange('confirmPassword', text)}
                  onBlur={() => handleBlur('confirmPassword')}
                  error={errors.confirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  suffix={<TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIconTouchable}>
                    <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={24} color={COLORS.gray} />
                  </TouchableOpacity>}
                />

                <Text style={styles.termsText}>
                  Bằng cách tiếp tục, bạn đồng ý với {' '}
                  <Text style={styles.linkText} onPress={() => {/* Handle Terms of Service press */ }}>
                      Điều khoản Dịch vụ
                  </Text>
                  {' '}
                  của chúng tôi.
                </Text>

                <CustomButton
                  title="Đăng ký"
                  onPress={handleSignup}
                  buttonStyle={styles.signupButton}
                  textStyle={styles.signupButtonText}
                  isLoading={isLoading}
                />

                <Text style={styles.orText}>hoặc</Text>

                <TouchableOpacity style={styles.googleButton} onPress={() => {/* Handle Google Sign-in */ }}>
                  <Image source={GOOGLE_LOGO_PATH} style={styles.googleLogo} resizeMode="contain" />
                  <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={navigateToLogin} style={styles.loginLink}>
                  <Text style={styles.loginLinkText}>Đăng nhập</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  innerContainer: { 
    width: '95%', 
    alignSelf: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 8,
    paddingVertical: 20,
  },
  logo: { width: width * 0.25, height: width * 0.25, marginBottom: 10 },
  title: { fontFamily: FONTS.bold, fontSize: SIZES.heading1, color: COLORS.black, marginBottom: 20, textAlign: 'center' },
  inputContainerWrapper: {
    width: '100%',
    marginBottom: 12,
  },
  inputOuterContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.buttonLight, 
    borderRadius: 8, 
    paddingHorizontal: 16, 
    width: '100%', 
    height: 55, 
    borderWidth: 1, 
    borderColor: '#E0E0E0' 
  },
  errorBorder: {
    borderColor: COLORS.red,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.red,
    marginTop: 4,
    marginLeft: 8,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: '100%', fontFamily: FONTS.regular, fontSize: SIZES.body, color: COLORS.black },
  eyeIconTouchable: { padding: 8 },
  termsText: { fontFamily: FONTS.regular, fontSize: SIZES.small, color: COLORS.black, textAlign: 'center', lineHeight: SIZES.small * 1.5, paddingHorizontal: 8, marginVertical: 10 },
  linkText: { fontFamily: FONTS.regular, color: COLORS.primary, textDecorationLine: 'underline' },
  signupButton: { backgroundColor: COLORS.primary, height: 55, marginTop: 15, width: '100%' },
  signupButtonText: { fontFamily: FONTS.bold, fontSize: SIZES.body, color: COLORS.white },
  orText: { fontFamily: FONTS.regular, fontSize: SIZES.small, color: COLORS.black, marginVertical: 12 },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.buttonLight, paddingVertical: 8, borderRadius: 8, width: '100%', height: 55, borderWidth: 1, borderColor: '#D3D3D3', marginBottom: 12 },
  googleLogo: { width: 24, height: 24, marginRight: 16 },
  googleButtonText: { fontFamily: FONTS.bold, fontSize: SIZES.body, color: COLORS.black },
  loginLink: { padding: 10 },
  loginLinkText: { fontFamily: FONTS.semiBold, fontSize: SIZES.body, color: COLORS.primary },
  phonePrefix: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.black,
    marginRight: 8,
  },
  separator: {
    width: 1,
    height: '60%',
    backgroundColor: COLORS.border,
    marginRight: 12,
  },
});

export default SignupScreen;
