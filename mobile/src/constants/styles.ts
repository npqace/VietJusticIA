// logo path
export const LOGO_PATH = require('../assets/images/lawsphere-logo.png');
export const GOOGLE_LOGO_PATH = require('../assets/images/google-logo.png');

// App colors
export const COLORS = {
  // Primary brand colors
  primary: '#2854A8',
  secondary: '#82ACDB',
  black: '#000000',
  white: '#FFFFFF',
  gray: '#5E5E5E',

  // Neutral colors

  
  // Gradient colors
  gradientStart: 'rgba(255, 255, 255, 1)',
  gradientMiddle1: 'rgba(174, 197, 220, 0.9)',
  gradientMiddle2: 'rgba(153, 185, 219, 1)',
  gradientEnd: 'rgba(84, 146, 218, 0.9)',
  
  // Button colors
  buttonLight: '#FFFFFF',
  buttonDark: '#3B5998',
};

// Font sizes
export const SIZES = {
  heading1: 36,
  heading2: 28,
  body: 16,
  small: 14,
  medium: 15,
};

// Font families
export const FONTS = {
  thin: 'Montserrat-Thin',
  extraLight: 'Montserrat-ExtraLight',
  light: 'Montserrat-Light',
  regular: 'Montserrat-Regular',
  medium: 'Montserrat-Medium',
  semiBold: 'Montserrat-SemiBold',
  bold: 'Montserrat-Bold',
  extraBold: 'Montserrat-ExtraBold',
  black: 'Montserrat-Black',
};

// Export
export type ColorType = typeof COLORS;
export type SizeType = typeof SIZES;
export type FontType = typeof FONTS;
