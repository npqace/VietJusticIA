import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { COLORS } from '../../constants/styles';
import HelpItem from '../HelpItem';

// List of FAQs
const faqData = [
  {
    title: 'How do I create an account?',
    content: 'To create an account, click on the Sign Up button on the login screen and follow the instructions to complete your registration.'
  },
  {
    title: 'How do I reset my password?',
    content: 'Click on the "Forgot Password" link on the login screen and follow the instructions to reset your password.'
  },
  {
    title: 'Is my data secure?',
    content: 'Yes, we use industry-standard encryption and security practices to ensure your data is protected at all times.'
  },
  {
    title: 'How can I update my profile information?',
    content: 'Go to your account settings to update your profile information, including contact details and preferences.'
  },
  {
    title: 'What payment methods do you accept?',
    content: 'We accept credit/debit cards, bank transfers, and various digital payment methods for your convenience.'
  },
  {
    title: 'How can I contact customer support?',
    content: 'You can reach our customer support team through the Contact tab in this Help Center, or by emailing support@lawsphere.com.'
  },
  {
    title: 'Is there a mobile app available?',
    content: 'Yes, our mobile app is available for both iOS and Android devices. You can download it from the App Store or Google Play Store.'
  },
];

const FAQsTab = () => {
  return (
    <View style={styles.helpItemContainer}>
      {faqData.map((item, index) => (
        <HelpItem
          key={index}
          title={item.title}
          content={item.content}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  helpItemContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
});

export default FAQsTab;