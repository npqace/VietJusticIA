import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput
} from 'react-native';
import { COLORS, SIZES, FONTS } from '../../constants/styles';

const ContactUsTab = () => {
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

  return (
    <View style={styles.contactContainer}>
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
};

const styles = StyleSheet.create({
  contactContainer: {
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

export default ContactUsTab;