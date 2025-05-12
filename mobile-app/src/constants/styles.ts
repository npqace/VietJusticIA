// App colors
export const COLORS = {
  // Primary brand colors
  primary: '#5492DA',
  secondary: '#3B5998',
  
  // Gradient colors
  gradientStart: '#FFFFFF',
  gradientMiddle1: '#AEC5DC',
  gradientMiddle2: '#99B9DB',
  gradientEnd: '#5492DA',
  
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