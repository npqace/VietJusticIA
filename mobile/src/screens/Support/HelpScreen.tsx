import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput
} from 'react-native';
import { COLORS, SIZES, FONTS,  LOGO_PATH } from '../../constants/styles';
import { Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import HelpItem from '../../components/HelpItem';

const { width } = Dimensions.get('window');
const height = Dimensions.get('window').height;

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

// Tab names
const tabs = [
  { id: 'faqs', name: 'FAQs' },
  { id: 'contact', name: 'Liên hệ' },
  { id: 'policy', name: 'Chính sách' },
  { id: 'terms', name: 'Điều khoản' }
];

const HelpScreen = ({ navigation }: { navigation: any }) => {
  const [activeTab, setActiveTab] = useState('faqs');
  const [contactForm, setContactForm] = useState({
    fullName: '',
    email: '',
    subject: '',
    content: ''
  });

  const handleSubmitContact = () => {
    // Template for sending email
    console.log('Form submitted:', contactForm);
    // Reset form after submission
    setContactForm({
      fullName: '',
      email: '',
      subject: '',
      content: ''
    });
    // Show success message
    alert('Cảm ơn bạn đã liên hệ với chúng tôi!');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'faqs':
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
      case 'contact':
        return (
          <View style={styles.contactContainer}>
            <Text style={styles.contactHeading}>Liên hệ</Text>
            <Text style={styles.contactDescription}>
              Nếu bạn có bất kỳ thắc mắc nào hoặc cần hỗ trợ về dịch vụ, vui lòng liên hệ với chúng tôi bằng cách điền vào nội dung bên dưới.
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Họ và Tên"
                value={contactForm.fullName}
                onChangeText={(text) => setContactForm({...contactForm, fullName: text})}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                keyboardType="email-address"
                value={contactForm.email}
                onChangeText={(text) => setContactForm({...contactForm, email: text})}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Tiêu đề"
                value={contactForm.subject}
                onChangeText={(text) => setContactForm({...contactForm, subject: text})}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.contentInput}
                placeholder="Nội dung"
                multiline={true}
                numberOfLines={8}
                textAlignVertical="top"
                value={contactForm.content}
                onChangeText={(text) => setContactForm({...contactForm, content: text})}
              />
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmitContact}>
              <Text style={styles.submitButtonText}>Gửi liên hệ</Text>
            </TouchableOpacity>
          </View>
        );
      case 'policy':
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
        );
      case 'terms':
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
        );
      default:
        return null;
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientMiddle1, COLORS.gradientMiddle2, COLORS.gradientEnd]}
      locations={[0, 0.44, 0.67, 1]}
      style={styles.container}
    >
      <View style={styles.header}>
        <Image
          source={LOGO_PATH}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="add-circle-outline" size={30} color={COLORS.gray} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Menu')}>
            <Ionicons name="menu" size={30} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabButton,
              activeTab === tab.id && styles.activeTabButton
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText
              ]}
            >
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.contentScrollView}>
        {renderTabContent()}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    marginBottom: 16,
    height: height * 0.07,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.15,
    height: width * 0.15,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#a4caf7',
    borderRadius: 8,
  },
  tabText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: '#5E5E5E',
  },
  activeTabText: {
    fontFamily: FONTS.regular,
    color: COLORS.primary,
  },
  contentScrollView: {
    flex: 1,
    padding: 8,
    paddingHorizontal: 16,
  },
  contentContainer: {
    padding: 16,
    alignItems: 'center',
  },
  contentText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: '#E5E5E5',
  },
  helpItemContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  contactContainer: {
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  contactHeading: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading2,
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  contactDescription: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontFamily: FONTS.regular,
    backgroundColor: '#f9f9f9',
  },
  contentInput: {
    height: 200,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    fontFamily: FONTS.regular,
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    marginHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
    fontSize: SIZES.body,
  },
});

export default HelpScreen;
