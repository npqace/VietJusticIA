import React from 'react';
import { StyleSheet, Text, TouchableOpacity, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { FONTS } from '../constants/styles';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  buttonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const CustomButton = ({ 
  title, 
  onPress, 
  buttonStyle, 
  textStyle 
}: CustomButtonProps) => {
  return (
    <TouchableOpacity
      style={[styles.button, buttonStyle]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  text: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CustomButton; 