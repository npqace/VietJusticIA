import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/styles';

interface PasswordRequirement {
  text: string;
  met: boolean;
}

interface PasswordRequirementsProps {
  password: string;
  showRequirements?: boolean; // Only show when password field is focused or has value
}

const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ 
  password, 
  showRequirements = true 
}) => {
  if (!showRequirements) return null;

  const requirements: PasswordRequirement[] = [
    {
      text: 'Ít nhất 8 ký tự',
      met: password.length >= 8,
    },
    {
      text: 'Ít nhất 1 chữ hoa (A-Z)',
      met: /[A-Z]/.test(password),
    },
    {
      text: 'Ít nhất 1 chữ thường (a-z)',
      met: /[a-z]/.test(password),
    },
    {
      text: 'Ít nhất 1 chữ số (0-9)',
      met: /[0-9]/.test(password),
    },
    {
      text: 'Ít nhất 1 ký tự đặc biệt (!@#$%...)',
      met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
  ];

  const allMet = requirements.every((req) => req.met);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Yêu cầu mật khẩu:</Text>
      {requirements.map((requirement, index) => (
        <View key={index} style={styles.requirementRow}>
          <Ionicons
            name={requirement.met ? 'checkmark-circle' : 'close-circle-outline'}
            size={18}
            color={requirement.met ? COLORS.success : COLORS.gray}
            style={styles.icon}
          />
          <Text
            style={[
              styles.requirementText,
              requirement.met && styles.requirementTextMet,
            ]}
          >
            {requirement.text}
          </Text>
        </View>
      ))}
      {allMet && password.length > 0 && (
        <View style={styles.successBanner}>
          <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
          <Text style={styles.successText}>Mật khẩu mạnh!</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.small,
    color: COLORS.black,
    marginBottom: 8,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: {
    marginRight: 8,
  },
  requirementText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    flex: 1,
  },
  requirementTextMet: {
    color: COLORS.success,
    fontFamily: FONTS.medium,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  successText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.small,
    color: COLORS.success,
    marginLeft: 6,
  },
});

export default PasswordRequirements;

