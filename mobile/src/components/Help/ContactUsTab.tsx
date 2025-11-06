import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { COLORS, SIZES, FONTS } from '../../constants/styles';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

const ContactUsTab = () => {
  const { user } = useAuth();
  const [contactForm, setContactForm] = useState({
    fullName: '',
    email: '',
    subject: '',
    content: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-populate user info if logged in
  useEffect(() => {
    if (user) {
      setContactForm(prev => ({
        ...prev,
        fullName: user.full_name || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!contactForm.fullName.trim() || contactForm.fullName.length < 2) {
      newErrors.fullName = 'Vui lòng nhập họ và tên (tối thiểu 2 ký tự)';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!contactForm.email.trim() || !emailRegex.test(contactForm.email)) {
      newErrors.email = 'Vui lòng nhập email hợp lệ';
    }

    if (!contactForm.subject.trim() || contactForm.subject.length < 3) {
      newErrors.subject = 'Vui lòng nhập tiêu đề (tối thiểu 3 ký tự)';
    }

    if (!contactForm.content.trim() || contactForm.content.length < 10) {
      newErrors.content = 'Vui lòng nhập nội dung (tối thiểu 10 ký tự)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitContact = async () => {
    if (!validateForm()) {
      Alert.alert('Lỗi', 'Vui lòng kiểm tra lại thông tin');
      return;
    }

    setLoading(true);

    try {
      await api.post('/api/v1/help-requests', {
        full_name: contactForm.fullName,
        email: contactForm.email,
        subject: contactForm.subject,
        content: contactForm.content
      });

      // Reset form after successful submission
      setContactForm({
        fullName: user?.full_name || '',
        email: user?.email || '',
        subject: '',
        content: ''
      });

      Alert.alert(
        'Thành công',
        'Cảm ơn bạn đã liên hệ với chúng tôi! Chúng tôi sẽ phản hồi trong thời gian sớm nhất.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Failed to submit help request:', error);
      Alert.alert(
        'Lỗi',
        error.response?.data?.detail || 'Không thể gửi yêu cầu. Vui lòng thử lại sau.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.contactContainer}>
      <Text style={styles.contactDescription}>
        Nếu bạn có bất kỳ thắc mắc nào hoặc cần hỗ trợ về dịch vụ, vui lòng liên hệ với chúng tôi bằng cách điền vào nội dung bên dưới.
      </Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, errors.fullName && styles.inputError]}
          placeholder="Họ và Tên"
          value={contactForm.fullName}
          onChangeText={(text) => {
            setContactForm({...contactForm, fullName: text});
            setErrors({...errors, fullName: ''});
          }}
        />
        {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={contactForm.email}
          onChangeText={(text) => {
            setContactForm({...contactForm, email: text});
            setErrors({...errors, email: ''});
          }}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, errors.subject && styles.inputError]}
          placeholder="Tiêu đề"
          value={contactForm.subject}
          onChangeText={(text) => {
            setContactForm({...contactForm, subject: text});
            setErrors({...errors, subject: ''});
          }}
        />
        {errors.subject && <Text style={styles.errorText}>{errors.subject}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.contentInput, errors.content && styles.inputError]}
          placeholder="Nội dung"
          multiline={true}
          numberOfLines={8}
          textAlignVertical="top"
          value={contactForm.content}
          onChangeText={(text) => {
            setContactForm({...contactForm, content: text});
            setErrors({...errors, content: ''});
          }}
        />
        {errors.content && <Text style={styles.errorText}>{errors.content}</Text>}
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmitContact}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.submitButtonText}>Gửi liên hệ</Text>
        )}
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
  inputError: {
    borderColor: COLORS.error || '#ff0000',
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small || 12,
    color: COLORS.error || '#ff0000',
    marginTop: 4,
    marginLeft: 4,
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
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
    fontSize: SIZES.body,
  },
});

export default ContactUsTab;