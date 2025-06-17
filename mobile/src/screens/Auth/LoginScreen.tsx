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
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import CustomButton from '../../components/CustomButton';
import { COLORS, SIZES, FONTS, LOGO_PATH, GOOGLE_LOGO_PATH } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api';

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation }: { navigation: any }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async () => {
    // console.log('Login attempt:', { identifier, password, rememberMe });
    // navigation.navigate('Chat');
    try {
      console.log('Login attempt:', { identifier, password, rememberMe });
      const response = await api.post('/login', { identifier, pwd: password });
      const { access_token } = response.data as any;
      if (access_token) {
        await AsyncStorage.setItem('access_token', access_token);
        navigation.navigate('Chat');
      } else {
        Alert.alert('Lỗi', 'Tài khoản hoặc mật khẩu không chính xác');
      }
    }
      catch (err: any) {
        let message = 'Tài khoản hoặc mật khẩu không chính xác';
        if (err?.response?.data?.detail) {
          message = err.response.data.detail as string;
        }
        Alert.alert('Lỗi', message);
      }
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
              placeholderTextColor={COLORS.black}
              value={identifier}
              onChangeText={setIdentifier}
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

          <TouchableOpacity style={styles.rememberMeContainer} onPress={() => setRememberMe(!rememberMe)}>
              <Ionicons
                name={rememberMe ? "checkbox" : "square-outline"}
                size={24}
                color={rememberMe ? COLORS.primary : COLORS.black}
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
    // marginTop: 20,
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
  forgotPasswordText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.small,
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
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
    marginTop: 4,
  },
  checkboxIcon: {
    marginRight: 8,
  },
  rememberMeText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.black,
  },
  loginButton: {
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