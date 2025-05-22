import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { responsiveScreenWidth } from 'react-native-responsive-dimensions';
import { LinearGradient } from 'expo-linear-gradient';
import CustomButton from '../components/CustomButton';
import { COLORS, SIZES, SPACING, FONTS, LOGO_PATH } from '../constants/styles';
import { useIsFocused } from '@react-navigation/native';

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
    paddingHorizontal: SPACING.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: SPACING.xxl + SPACING.lg,
  },
  logo: {
    width: responsiveScreenWidth(45),
    height: responsiveScreenWidth(45),
  },
  contentContainer: {
    alignItems: 'center',
  },
  titleText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.heading2,
    textAlign: 'center',
    fontWeight: '400',
    color: COLORS.textDark,
  },
  appNameText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading1,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  descriptionText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    lineHeight: 24,
    color: COLORS.textDark,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  buttonContainer: {
    marginTop: 'auto',
    marginBottom: SPACING.xxl,
    width: '100%',
  },
  loginButton: {
    backgroundColor: COLORS.buttonLight,
    marginBottom: SPACING.md,
  },
  loginButtonText: {
    fontFamily: FONTS.regular,
    color: COLORS.textDark,
    fontWeight: 'bold',
  },
  registerButton: {
    backgroundColor: COLORS.primary,
  },
  registerButtonText: {
    fontFamily: FONTS.regular,
    color: COLORS.textLight,
    fontWeight: 'bold',
  },
});

export default WelcomeScreen; 