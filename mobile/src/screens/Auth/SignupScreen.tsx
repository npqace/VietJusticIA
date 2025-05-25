import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import CustomButton from '../../components/CustomButton';
import { COLORS, SIZES, FONTS, LOGO_PATH, GOOGLE_LOGO_PATH } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons'; 

const { width } = Dimensions.get('window');

const SignupScreen = ({ navigation }: { navigation: any }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignup = () => {
    // Add actual signup logic here
    // Example: Validate inputs, then call API
    console.log('Signup attempt:', { fullName, email, phoneNumber, password, confirmPassword });
    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }
    navigation.navigate('Login'); // Navigate on successful signup
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientMiddle1, COLORS.gradientMiddle2, COLORS.gradientEnd]}
        locations={[0, 0.44, 0.67, 1]} 
        style={styles.container}
    >
      <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.innerContainer}>
          <Image
              source={LOGO_PATH}
              style={styles.logo}
              resizeMode="contain"
          />

            <Text style={styles.title}>Tạo tài khoản</Text>

            {/* Input Fields */}
            <View style={styles.inputOuterContainer}>
              <Ionicons name="person-outline" size={22} color={COLORS.black} style={styles.inputIcon} />
              <TextInput
                  style={styles.input}
                  placeholder="Họ và Tên"
                  placeholderTextColor={COLORS.black} 
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
              />
            </View>

            <View style={styles.inputOuterContainer}>
              <Ionicons name="mail-outline" size={22} color={COLORS.black} style={styles.inputIcon} />
              <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={COLORS.black}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
              />
            </View>

            <View style={styles.inputOuterContainer}>
              <Ionicons name="call-outline" size={22} color={COLORS.black} style={styles.inputIcon} />
              <TextInput
                  style={styles.input}
                  placeholder="Số điện thoại"
                  placeholderTextColor={COLORS.black}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputOuterContainer}>
              <Ionicons name="lock-closed-outline" size={22} color={COLORS.black} style={styles.inputIcon} />
              <TextInput
                  style={styles.input}
                  placeholder="Mật khẩu"
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

            <View style={styles.inputOuterContainer}>
              <Ionicons name="lock-closed-outline" size={22} color={COLORS.black} style={styles.inputIcon} />
              <TextInput
                  style={styles.input}
                  placeholder="Xác nhận mật khẩu"
                  placeholderTextColor={COLORS.black}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIconTouchable}>
                  <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={24} color={COLORS.black} />
              </TouchableOpacity>
            </View>

            <Text style={styles.termsText}>
              Bằng cách tiếp tục, bạn đồng ý với {' '}
              <Text style={styles.linkText} onPress={() => {/* Handle Terms of Service press */ }}>
                  Điều khoản Dịch vụ
              </Text>
              {' '}của chúng tôi.
            </Text>

            <CustomButton
              title="Đăng ký"
              onPress={handleSignup}
              buttonStyle={styles.signupButton}
              textStyle={styles.signupButtonText}
            />

            <Text style={styles.orText}>hoặc</Text>

            <TouchableOpacity style={styles.googleButton} onPress={() => {/* Handle Google Sign-in */ }}>
              <Image
                source={GOOGLE_LOGO_PATH}
                style={styles.googleLogo}
                resizeMode="contain"
              />
              <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={navigateToLogin} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidView: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerContainer: {
    // width: responsiveScreenWidth(90),
    // height: responsiveScreenHeight(90),
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
    marginBottom: 10, 
    textAlign: 'center',
  },
  inputOuterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.buttonLight,
    borderRadius: 8,
    marginBottom: 12,
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
  termsText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.black,
    textAlign: 'justify',
    lineHeight: SIZES.small * 1.5, 
    paddingHorizontal: 8, 
  },
  linkText: {
    fontFamily: FONTS.semiBold,
    color: COLORS.primary, 
    textDecorationLine: 'underline',
  },
  signupButton: {
    backgroundColor: COLORS.primary, 
    height: 55, 
    marginTop: 15, 
    width: '100%', 
  },
  signupButtonText: {
    fontFamily: FONTS.bold, 
    fontSize: SIZES.body, 
    color: COLORS.white,
  },
  orText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.black, 
    marginVertical: 12, 
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.buttonLight,
    paddingVertical: 8,
    borderRadius: 8,
    width: '100%',
    height: 55, 
    borderWidth: 1,
    borderColor: '#D3D3D3', 
    marginBottom: 12,
  },
  googleLogo: {
    width: 24,
    height: 24,
    marginRight: 16,
  },
  googleButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body,
    color: COLORS.black,
  },
  loginLink: {
    padding: 10,
  },
  loginLinkText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body,
    color: "#2A4BA0",
  },
});

export default SignupScreen;