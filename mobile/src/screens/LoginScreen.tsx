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
import CustomButton from '../components/CustomButton';
import { COLORS, SIZES, SPACING, FONTS, RADIUS } from '../constants/styles';
import { Ionicons } from '@expo/vector-icons'; // Import icons

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = () => {
    console.log('Login attempt:', { emailOrPhone, password, rememberMe });
    // Add actual login logic here
    // if (successful) navigation.navigate('HomeScreen');
    navigation.navigate('Chat');
  };

  const navigateToSignup = () => {
    navigation.navigate('Signup'); // Navigate to SignupScreen
  };

  const handleForgotPassword = () => {
    console.log('Forgot password pressed');
    // navigation.navigate('ForgotPasswordScreen'); // Navigate to Forgot Password screen
  };

  // No back button to WelcomeScreen in this new design, so removing handleBackToWelcome

  return (
    <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientMiddle1, COLORS.gradientMiddle2, COLORS.gradientEnd]}
        locations={[0, 0.3, 0.6, 1]} // Consistent gradient
        style={styles.container}
    >
      <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidView}
      >
        <View style={styles.innerContainer}>
          <Image
              source={require('../assets/images/lawsphere-logo.png')} // Using the same logo
              style={styles.logo}
              resizeMode="contain"
          />

          <Text style={styles.title}>Đăng nhập</Text>

          {/* Input Fields */}
          <Text style={styles.inputLabel}>Email / Số điện thoại</Text>
          <View style={styles.inputOuterContainer}>
              {/* Icon can be added here if desired, though not in image for this field */}
            <TextInput
                style={styles.input}
                placeholder="hello@example.com"
                placeholderTextColor={COLORS.textDark} // Adjusted placeholder color
                value={emailOrPhone}
                onChangeText={setEmailOrPhone}
                keyboardType="email-address" // Or default, if phone number logic is complex
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
                placeholder="••••••••••••" // Placeholder as dots
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

          <TouchableOpacity style={styles.googleButton} onPress={() => {/* Handle Google Sign-in */ }}>
              <Image
                  source={require('../assets/images/google-logo.png')} // Ensure you have this asset
                  style={styles.googleLogo}
                  resizeMode="contain"
              />
              <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={navigateToSignup} style={styles.signupLink}>
              {/* <Text style={styles.signInText}>
                Bạn chưa có tài khoản? {' '}
                <Text style={styles.signupLinkText}>Tạo tài khoản</Text>
              </Text> */}
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
      justifyContent: 'center',
  },
  scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: SPACING.lg,
      paddingHorizontal: SPACING.lg,
  },
  innerContainer: {
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
      paddingVertical: SPACING.lg,
      paddingHorizontal: SPACING.lg,
  },
  logo: {
      width: 100,
      height: 100,
      marginBottom: SPACING.lg,
  },
  title: {
      fontFamily: FONTS.bold,
      fontSize: SIZES.heading1,
      color: COLORS.textDark,
      marginBottom: SPACING.xl,
      textAlign: 'center',
  },
  inputLabel: {
      fontFamily: FONTS.semiBold, // Bolder label as per image
      fontSize: SIZES.body, // Slightly larger label
      color: COLORS.textDark,
      marginBottom: SPACING.sm,
      alignSelf: 'flex-start', // Align label to the left
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
      color: COLORS.primary, // Link color
  },
  inputOuterContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.buttonLight,
      borderRadius: RADIUS.medium,
      marginBottom: SPACING.md, // Standard margin
      paddingHorizontal: SPACING.md,
      width: '100%',
      height: 55,
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
      marginBottom: SPACING.lg, // Space before login button
      marginTop: SPACING.xs, // Small space after password
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
      backgroundColor: COLORS.primary, // Dark blue button
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