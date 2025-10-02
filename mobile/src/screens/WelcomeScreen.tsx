import React from 'react';
import { StyleSheet, Text, View, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import CustomButton from '../components/CustomButton';
import { COLORS, SIZES, FONTS, LOGO_PATH } from '../constants/styles';

const { width } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }: { navigation: any }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // backgroundColor: COLORS.white, // Set a background color for the safe area itself
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center', // Better centering
  },
  logoContainer: {
    alignItems: 'center',
    // Removed marginTop to allow flexbox to center vertically
  },
  logo: {
    width: width * 0.5,
    height: width * 0.5,
  },
  contentContainer: {
    alignItems: 'center',
    marginVertical: 48, // Add vertical margin
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