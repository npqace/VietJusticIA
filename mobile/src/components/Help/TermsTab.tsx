import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { COLORS } from '../../constants/styles';
import HelpItem from '../HelpItem';

// Terms and conditions
const termsData = [
  {
    title: 'User Agreement',
    content: 'By accessing or using our service, you agree to be bound by these Terms and Conditions and all applicable laws and regulations.'
  },
  {
    title: 'Intellectual Property',
    content: 'All content on this platform, including text, graphics, logos, and software, is the property of LawSphere and is protected by intellectual property laws.'
  },
  {
    title: 'User Conduct',
    content: 'You agree not to use our service for any unlawful purposes or in any way that could damage, disable, or impair the service.'
  },
  {
    title: 'Limitation of Liability',
    content: 'We shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your access to or use of our service.'
  },
  {
    title: 'Termination',
    content: 'We may terminate or suspend your account and access to our service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users.'
  }
];

const TermsTab = () => {
  return (
    <View style={styles.helpItemContainer}>
      {termsData.map((item, index) => (
        <HelpItem
          key={index}
          title={item.title}
          content={item.content}
        />
      ))}
    </View>
  )
};

const styles = StyleSheet.create({
  helpItemContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
});

export default TermsTab;