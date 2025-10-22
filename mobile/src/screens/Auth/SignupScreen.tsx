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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import CustomButton from '../../components/CustomButton';
import { COLORS, SIZES, FONTS, LOGO_PATH, GOOGLE_LOGO_PATH } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons';
import { signup } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const SignupScreen = ({ navigation }: { navigation: any }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { showOtpModal } = useAuth();

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu không khớp!");
      return;
    }
    setIsLoading(true);
    try {
      const formattedPhoneNumber = phoneNumber.startsWith('0') 
        ? phoneNumber.substring(1) 
        : phoneNumber;

      const payload = {
        full_name: fullName,
        email: email,
        phone: `+84${formattedPhoneNumber}`,
        pwd: password,
        confirm_pwd: confirmPassword,
      };

      const data = await signup(payload);

      if (data.message) {
        showOtpModal(email);
      }
    } catch (err: any) {
      let message = 'Đăng ký thất bại. Vui lòng thử lại.';
      if (err?.response?.data?.detail) {
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoidView}
          >
            <View style={styles.innerContainer}>
              <Image source={LOGO_PATH} style={styles.logo} resizeMode="contain" />
              <Text style={styles.title}>Tạo tài khoản</Text>
              <View style={styles.inputOuterContainer}>
                <Ionicons name="person-outline" size={22} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Họ và Tên"
                    placeholderTextColor={COLORS.gray}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                />
              </View>

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

              <View style={styles.inputOuterContainer}>
                <Ionicons name="call-outline" size={22} color={COLORS.gray} style={styles.inputIcon} />
                <Text style={styles.phonePrefix}>+84</Text>
                <View style={styles.separator} />
                <TextInput
                    style={styles.input}
                    placeholder="Số điện thoại"
                    placeholderTextColor={COLORS.gray}
                    value={phoneNumber}
                    onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                />
              </View>

              <View style={styles.inputOuterContainer}>
                <Ionicons name="lock-closed-outline" size={22} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Mật khẩu"
                    placeholderTextColor={COLORS.gray}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIconTouchable}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={24} color={COLORS.gray} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputOuterContainer}>
                <Ionicons name="lock-closed-outline" size={22} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Xác nhận mật khẩu"
                    placeholderTextColor={COLORS.gray}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIconTouchable}>
                    <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={24} color={COLORS.gray} />
                </TouchableOpacity>
              </View>

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
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  keyboardAvoidView: { flex: 1, justifyContent: 'center' },
  innerContainer: { width: '95%', alignSelf: 'center', alignItems: 'center', paddingHorizontal: 8 },
  logo: { width: width * 0.25, height: width * 0.25, marginBottom: 10 },
  title: { fontFamily: FONTS.bold, fontSize: SIZES.heading1, color: COLORS.black, marginBottom: 10, textAlign: 'center' },
  inputOuterContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.buttonLight, borderRadius: 8, marginBottom: 12, paddingHorizontal: 16, width: '100%', height: 55, borderWidth: 1, borderColor: '#E0E0E0' },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: '100%', fontFamily: FONTS.regular, fontSize: SIZES.body, color: COLORS.black },
  eyeIconTouchable: { padding: 8 },
  termsText: { fontFamily: FONTS.regular, fontSize: SIZES.small, color: COLORS.black, textAlign: 'justify', lineHeight: SIZES.small * 1.5, paddingHorizontal: 8 },
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