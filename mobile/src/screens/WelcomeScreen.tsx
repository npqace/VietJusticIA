import React from 'react';
import { StyleSheet, Text, View, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import CustomButton from '../components/CustomButton';
import { COLORS, SIZES, FONTS, LOGO_PATH } from '../constants/styles';
import { useIsFocused } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }: { navigation: any }) => {
  const isFocused = useIsFocused();

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientMiddle1, COLORS.gradientMiddle2, COLORS.gradientEnd]}
      locations={[0, 0.44, 0.67, 1]}
      style={styles.container}
    >
      <View style={styles.logoContainer}>
        <Image 
          source={LOGO_PATH} 
          style={styles.logo as any}
          resizeMode="contain"
        />
      </View>
      
      <View 
        key={`welcome-${isFocused}`} 
        style={styles.contentContainer}
      >
        <Text style={styles.titleText}>Welcome to</Text>
        <Text style={styles.appNameText}>LawSphere</Text>
        
        <Text style={styles.descriptionText}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed sodales fringilla diam eget ornare.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <CustomButton 
          title="Đăng nhập" 
          onPress={() => navigation.navigate('Login')}
          buttonStyle={styles.loginButton}
          textStyle={styles.loginButtonText}
        />
        
        <CustomButton 
          title="Đăng ký" 
          onPress={() => navigation.navigate('Signup')}
          buttonStyle={styles.registerButton}
          textStyle={styles.registerButtonText}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 64,
  },
  logo: {
    width: width * 0.5,
    height: width * 0.5,
    
  },
  contentContainer: {
    alignItems: 'center',
  },
  titleText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.heading2,
    textAlign: 'center',
    color: COLORS.black,
  },
  appNameText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading1,
    color: COLORS.black,
    marginBottom: 24,
    textAlign: 'center',
  },
  descriptionText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    lineHeight: 24,
    color: COLORS.black,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  buttonContainer: {
    marginTop: 'auto',
    marginBottom: 40,
    width: '100%',
  },
  loginButton: {
    backgroundColor: COLORS.buttonLight,
    marginBottom: 16,
  },
  loginButtonText: {
    fontFamily: FONTS.bold,
    color: COLORS.black,
  },
  registerButton: {
    backgroundColor: COLORS.primary,
  },
  registerButtonText: {
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
});

export default WelcomeScreen; 