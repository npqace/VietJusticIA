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
  Dimensions
} from 'react-native';
import { responsiveScreenHeight, responsiveScreenWidth, responsiveScreenFontSize } from 'react-native-responsive-dimensions';
import { LinearGradient } from 'expo-linear-gradient';
import CustomButton from '../../components/CustomButton';
import { COLORS, SIZES, SPACING, FONTS, RADIUS, LOGO_PATH, GOOGLE_LOGO_PATH } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = () => {
    console.log('Login attempt:', { emailOrPhone, password, rememberMe });
    navigation.navigate('Chat');
  };

  const navigateToSignup = () => {
    navigation.navigate('Signup');
  };

  const handleForgotPassword = () => {
    console.log('Forgot password pressed');
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
              placeholderTextColor={COLORS.textDark}
              value={emailOrPhone}
              onChangeText={setEmailOrPhone}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>Mật khẩu</Text>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputOuterContainer}>
            <Ionicons name="lock-closed-outline" size={22} color={COLORS.textDark} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••••••" 
              placeholderTextColor={COLORS.textDark}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIconTouchable}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={24} color={COLORS.textDark} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.rememberMeContainer} onPress={() => setRememberMe(!rememberMe)}>
              <Ionicons
                name={rememberMe ? "checkbox" : "square-outline"}
                size={24}
                color={rememberMe ? COLORS.primary : COLORS.textDark}
                style={styles.checkboxIcon}
              />
              <Text style={styles.rememberMeText}>Ghi nhớ đăng nhập</Text>
          </TouchableOpacity>

          <CustomButton
            title="Đăng nhập"
            onPress={handleLogin}
            buttonStyle={styles.loginButton}
            textStyle={styles.loginButtonText}
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
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  
  innerContainer: {
    width: responsiveScreenWidth(90),
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  logo: {
    width: width * 0.25,
    height: width * 0.25,
    marginBottom: 10,
    marginTop: 20,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading1,
    color: COLORS.textDark,
    marginBottom: 25,
    textAlign: 'center',
  },
  inputLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body,
    color: COLORS.textDark,
    marginBottom: SPACING.sm,
    alignSelf: 'flex-start',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.sm,
  },
  forgotPasswordText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.small,
    color: COLORS.primary,
  },
  inputOuterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.buttonLight,
    borderRadius: RADIUS.medium,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    width: responsiveScreenWidth(90),
    height: responsiveScreenHeight(6),
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.textDark,
},
  eyeIconTouchable: {
    padding: SPACING.sm,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.lg,
    marginTop: SPACING.xs,
  },
  checkboxIcon: {
    marginRight: SPACING.sm,
  },
  rememberMeText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.textDark,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    height: 55,
    width: '100%',
  },
  loginButtonText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    color: COLORS.textLight,
  },
  orText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.textDark,
    marginVertical: SPACING.md,
},
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.buttonLight,
    borderRadius: RADIUS.medium,
    width: '100%',
    height: 55,
    borderWidth: 1,
    borderColor: '#D3D3D3',
    marginBottom: SPACING.md, // Consistent margin
  },
  googleLogo: {
    width: 24,
    height: 24,
    marginRight: SPACING.md,
  },
  googleButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body,
    color: COLORS.textDark,
  },
  signupLink: {
    marginTop: SPACING.sm, // Reduced margin from Google button
    padding: SPACING.sm,
  },
  // signInText: {
  //   fontFamily: FONTS.regular,
  //   fontSize: SIZES.body,
  //   // fontWeight: '300',
  //   // color: "#ffffff",
  // },
  signupLinkText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body, // Consistent link size
    color: COLORS.primary, // Consistent link color
  },
});

export default LoginScreen;