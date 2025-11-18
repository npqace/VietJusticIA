// logo path
export const LOGO_PATH = require('../../assets/images/logo.png');
export const GOOGLE_LOGO_PATH = require('../../assets/images/google-logo.png');

// App colors
export const COLORS = {
  // Primary brand colors
  primary: '#2854A8',
  secondary: '#82ACDB',
  black: '#000000',
  white: '#FFFFFF',
  gray: '#5E5E5E',

  // Neutral colors
  lightGray: '#F5F5F5',
  border: '#E0E0E0',
  text: '#333333',
  darkGray: '#A9A9A9',

  // Semantic colors
  green: '#28A745',
  success: '#28A745',  // Alias for green
  red: '#DC3545',
  error: '#DC3545',  // Alias for red

  
  // Gradient colors
  gradientStart: 'rgba(255, 255, 255, 1)',
  gradientMiddle1: 'rgba(174, 197, 220, 0.9)',
  gradientMiddle2: 'rgba(153, 185, 219, 1)',
  gradientEnd: 'rgba(84, 146, 218, 0.9)',

  // Profile Screen Gradient
  profileGradientStart: '#FFFFFF',
  profileGradientMid: '#E6F0F9',
  profileGradientEnd: '#B0CBE2',
  
  // Button colors
  buttonLight: '#FFFFFF',
  buttonDark: '#3B5998',
};

// Font sizes
export const SIZES = {
  heading1: 36,
  heading2: 28,
  heading3: 25,
  heading4: 20,
  body: 18,
  medium: 15,
  small: 14,

  // App-specific sizes
  padding: 16,
  radius: 12,
};

export const FONTS = {
  black: 'Montserrat-Black',
  blackItalic: 'Montserrat-Black-Italic',
  bold: 'Montserrat-Bold',
  boldItalic: 'Montserrat-Bold-Italic',
  extraBold: 'Montserrat-Extra-Bold',
  extraBoldItalic: 'Montserrat-Extra-Bold-Italic',
  extraLight: 'Montserrat-Extra-Light',
  extraLightItalic: 'Montserrat-Extra-Light-Italic',
  italic: 'Montserrat-Italic',
  light: 'Montserrat-Light',
  lightItalic: 'Montserrat-Light-Italic',
  medium: 'Montserrat-Medium',
  mediumItalic: 'Montserrat-Medium-Italic',
  regular: 'Montserrat-Regular',
  semiBold: 'Montserrat-Semi-Bold',
  semiBoldItalic: 'Montserrat-Semi-Bold-Italic',
  thin: 'Montserrat-Thin',
  thinItalic: 'Montserrat-Thin-Italic',
  mono: 'RobotoMono-Regular',
};


// Export
export type ColorType = typeof COLORS;
export type SizeType = typeof SIZES;
export type FontType = typeof FONTS;
