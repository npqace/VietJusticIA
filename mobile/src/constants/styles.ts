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
  
  // Text colors
  textDark: '#000000',
  textLight: '#FFFFFF',
  
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

// Font weights
export const WEIGHTS = {
  bold: 'bold' as const,
  semiBold: '600' as FontWeight,
  medium: '500' as FontWeight,
  regular: '400' as FontWeight,
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

// Border radius
export const RADIUS = {
  small: 4,
  medium: 8,
  large: 16,
  circle: 999,
};

// Font families
export const FONTS = {
  regular: 'Montserrat-Regular',
  medium: 'Montserrat-Medium',
  semiBold: 'Montserrat-SemiBold',
  bold: 'Montserrat-Bold',
};

// Type definitions
export type ColorType = typeof COLORS;
export type SizeType = typeof SIZES;
export type WeightType = typeof WEIGHTS;
export type SpacingType = typeof SPACING;
export type RadiusType = typeof RADIUS;

// FontWeight type to match React Native's expected values
type FontWeight = 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'; 