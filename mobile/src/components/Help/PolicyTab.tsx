import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { COLORS } from '../../constants/styles';
import HelpItem from '../HelpItem';

// Policy information
const policyData = [
  {
    title: 'Privacy Policy',
    content: 'We respect your privacy and are committed to protecting your personal data. Our privacy policy explains how we collect, use, and safeguard your information when you use our services.'
  },
  {
    title: 'Data Collection',
    content: 'We collect personal information that you provide to us, such as your name, email address, and payment information. We also collect information about how you use our services.'
  },
  {
    title: 'Data Usage',
    content: 'We use your data to provide and improve our services, communicate with you, and comply with legal obligations. We do not sell your personal information to third parties.'
  },
  {
    title: 'Cookies Policy',
    content: 'We use cookies and similar technologies to enhance your experience on our platform, analyze usage, and assist in our marketing efforts.'
  }
];

const PolicyTab = () => {
  return (
    <View style={styles.helpItemContainer}>
            {policyData.map((item, index) => (
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

export default PolicyTab;