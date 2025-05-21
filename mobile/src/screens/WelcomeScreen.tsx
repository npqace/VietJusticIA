import React from 'react';
import { StyleSheet, Text, View, Image, ImageStyle } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { responsiveScreenHeight, responsiveScreenWidth, responsiveScreenFontSize } from 'react-native-responsive-dimensions';
import { LinearGradient } from 'expo-linear-gradient';
import CustomButton from '../components/CustomButton';
import { COLORS, SIZES, WEIGHTS, SPACING, FONTS } from '../constants/styles';

const WelcomeScreen = ({ navigation }: { navigation: any }) => {
  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientMiddle1, COLORS.gradientMiddle2, COLORS.gradientEnd]}
      locations={[0, 0.44, 0.67, 1]}
      style={styles.container}
    >
      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/images/lawsphere-logo.png')} 
          style={styles.logo as any}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.titleText}>Welcome to</Text>
        <Text style={styles.appNameText}>LawSphere</Text>
        
        <Text style={styles.descriptionText}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed sodales fringilla diam eget ornare.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <CustomButton 
          title="Đăng nhập" 
          // onPress={() => console.log('Login pressed')}
          onPress={() => navigation.navigate('Login')}
          buttonStyle={styles.loginButton}
          textStyle={styles.loginButtonText}
        />
        
        <CustomButton 
          title="Đăng ký" 
          // onPress={() => console.log('Register pressed')}
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
    width: wp('45%'),
    height: wp('45%'),
    // width: responsiveScreenWidth(45),
    // height: responsiveScreenHeight(45),
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