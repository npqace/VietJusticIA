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
import CustomButton from '../components/CustomButton'; // Import CustomButton
import { COLORS, SIZES, SPACING, FONTS, RADIUS } from '../constants/styles';
import { Ionicons } from '@expo/vector-icons'; // Import icons
import { Colors } from 'react-native/Libraries/NewAppScreen';

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
    // navigation.navigate('HomeScreen'); // Navigate on successful signup
  };

  const navigateToLogin = () => {
    navigation.navigate('Login'); // Ensure 'LoginScreen' is your route name for Login
  };

  return (
    <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientMiddle1, COLORS.gradientMiddle2, COLORS.gradientEnd]}
        locations={[0, 0.3, 0.6, 1]} // Adjusted locations for a smoother gradient like the image
        style={styles.container}
    >
      <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidView}
      >
        <View style={styles.innerContainer}>
          <Image
              source={require('../assets/images/lawsphere-logo.png')} // Replace with your actual logo for this screen if different
              style={styles.logo}
              resizeMode="contain"
          />

            <Text style={styles.title}>Tạo tài khoản</Text>

            {/* Input Fields */}
            <View style={styles.inputOuterContainer}>
              <Ionicons name="person-outline" size={22} color={COLORS.textDark} style={styles.inputIcon} />
              <TextInput
                  style={styles.input}
                  placeholder="Họ và Tên"
                  placeholderTextColor={COLORS.textDark} // Adjusted placeholder color
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
              />
            </View>

            <View style={styles.inputOuterContainer}>
              <Ionicons name="mail-outline" size={22} color={COLORS.textDark} style={styles.inputIcon} />
              <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={COLORS.textDark}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
              />
            </View>

            <View style={styles.inputOuterContainer}>
              <Ionicons name="call-outline" size={22} color={COLORS.textDark} style={styles.inputIcon} />
              <TextInput
                  style={styles.input}
                  placeholder="Số điện thoại"
                  placeholderTextColor={COLORS.textDark}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputOuterContainer}>
              <Ionicons name="lock-closed-outline" size={22} color={COLORS.textDark} style={styles.inputIcon} />
              <TextInput
                  style={styles.input}
                  placeholder="Mật khẩu"
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

            <View style={styles.inputOuterContainer}>
              <Ionicons name="lock-closed-outline" size={22} color={COLORS.textDark} style={styles.inputIcon} />
              <TextInput
                  style={styles.input}
                  placeholder="Xác nhận mật khẩu"
                  placeholderTextColor={COLORS.textDark}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIconTouchable}>
                  <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={24} color={COLORS.textDark} />
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
                source={require('../assets/images/google-logo.png')} // Ensure you have this asset
                style={styles.googleLogo}
                resizeMode="contain"
              />
              <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={navigateToLogin} style={styles.loginLink}>
              {/* <Text style={styles.signUpText}>
                Bạn đã có tài khoản? {' '}
                <Text style={styles.loginLinkText}>Đăng nhập</Text>
              </Text> */}
            <Text style={styles.loginLinkText}>Đăng nhập</Text>
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
  innerContainer: {
    width: '100%',
    maxWidth: 400, // Max width for larger screens
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  logo: {
    width: 100, // Adjust as per your logo's aspect ratio
    height: 100, // Adjust as per your logo's aspect ratio
    marginBottom: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading1, // Using SIZES constant
    color: COLORS.textDark, // Using textDark for title from image
    marginBottom: SPACING.md, // Increased margin
    textAlign: 'center',
  },
  inputOuterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.buttonLight, // White background for inputs
    borderRadius: RADIUS.medium,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    width: '100%',
    height: 55, // Fixed height for inputs like image
    borderWidth: 1,
    borderColor: '#E0E0E0', // Light border for inputs
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
    padding: SPACING.sm, // Make eye icon easier to press
  },
  termsText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.textDark, // Adjusted color to be more readable
    textAlign: 'justify',
    lineHeight: SIZES.small * 1.5, // Improved readability
    paddingHorizontal: SPACING.sm, // Padding if text is long
  },
  linkText: {
    fontFamily: FONTS.semiBold,
    color: COLORS.primary, // Use primary color for link
    textDecorationLine: 'underline',
  },
  signupButton: {
    backgroundColor: COLORS.primary, // Main action button color
    height: 55, // Match input height
    marginTop: SPACING.sm, // Spacing from terms text
    width: '100%', // Full width
  },
  signupButtonText: {
    fontFamily: FONTS.bold, // Bold text for button
    fontSize: SIZES.body, // Standard body size
    color: COLORS.textLight,
  },
  orText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.textDark, 
    marginVertical: SPACING.md, // Generous spacing
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.buttonLight, // White background
    paddingVertical: SPACING.sm, // Adjust padding
    borderRadius: RADIUS.medium,
    width: '100%',
    height: 55, // Match input height
    borderWidth: 1,
    borderColor: '#D3D3D3', // Light gray border
    marginBottom: SPACING.md,
  },
  googleLogo: {
    width: 24,
    height: 24,
    marginRight: SPACING.md,
  },
  googleButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body,
    color: COLORS.textDark, // Dark text for Google button
  },
  loginLink: {
    padding: SPACING.sm, // Make it easier to tap
  },
  // signUpText: {
  //   fontFamily: FONTS.regular,
  //   fontSize: SIZES.body,
  //   // fontWeight: '300',
  //   // color: "#ffffff",
  // },
  loginLinkText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body,
    color: "#2A4BA0",
  },
});

export default SignupScreen;