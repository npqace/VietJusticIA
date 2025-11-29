import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../../constants/styles';
import api from '../../api';

interface ServiceRequestModalProps {
  visible: boolean;
  onClose: () => void;
  lawyerId: number;
  lawyerName: string;
  onSuccess: () => void;
}

const ServiceRequestModal: React.FC<ServiceRequestModalProps> = ({
  visible,
  onClose,
  lawyerId,
  lawyerName,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    title: '',
    description: ''
  });

  const validateForm = () => {
    let isValid = true;
    const newErrors = { title: '', description: '' };

    if (!title.trim()) {
      newErrors.title = 'Vui lòng nhập tiêu đề';
      isValid = false;
    } else if (title.trim().length < 5) {
      newErrors.title = 'Tiêu đề phải có ít nhất 5 ký tự';
      isValid = false;
    } else if (title.trim().length > 255) {
      newErrors.title = 'Tiêu đề không được quá 255 ký tự';
      isValid = false;
    }

    if (!description.trim()) {
      newErrors.description = 'Vui lòng nhập mô tả chi tiết';
      isValid = false;
    } else if (description.trim().length < 10) {
      newErrors.description = 'Mô tả phải có ít nhất 10 ký tự';
      isValid = false;
    }

    setErrors(newErrors);

    // Show validation error alert if validation failed
    if (!isValid) {
      const errorMessages = [];
      if (newErrors.title) errorMessages.push(newErrors.title);
      if (newErrors.description) errorMessages.push(newErrors.description);

      Alert.alert(
        'Thông tin chưa đầy đủ',
        'Vui lòng kiểm tra lại thông tin:\n' + errorMessages.map(msg => `• ${msg}`).join('\n'),
        [{ text: 'OK' }]
      );
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/v1/lawyers/requests', {
        lawyer_id: lawyerId,
        title: title.trim(),
        description: description.trim()
      });

      setTitle('');
      setDescription('');
      setErrors({ title: '', description: '' });
      onSuccess();
    } catch (error: any) {
      console.error('Failed to create service request:', error);
      const errorMessage = error.response?.data?.detail || 'Không thể gửi yêu cầu. Vui lòng thử lại.';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setTitle('');
      setDescription('');
      setErrors({ title: '', description: '' });
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Ionicons name="paper-plane" size={24} color={COLORS.primary} />
              <Text style={styles.modalTitle}>Yêu cầu tư vấn</Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <Ionicons name="close" size={24} color={COLORS.black} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Lawyer Info */}
            <View style={styles.lawyerInfo}>
              <Text style={styles.lawyerLabel}>Gửi đến luật sư:</Text>
              <Text style={styles.lawyerName}>{lawyerName}</Text>
            </View>

            {/* Title Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>
                Tiêu đề <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  errors.title && styles.inputError
                ]}
                placeholder="VD: Tư vấn về hợp đồng lao động"
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (errors.title) setErrors({ ...errors, title: '' });
                }}
                maxLength={255}
                editable={!loading}
              />
              {errors.title ? (
                <Text style={styles.errorText}>{errors.title}</Text>
              ) : null}
              <Text style={styles.charCount}>{title.length}/255</Text>
            </View>

            {/* Description Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>
                Mô tả chi tiết <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  errors.description && styles.inputError
                ]}
                placeholder="Vui lòng mô tả chi tiết vấn đề pháp lý của bạn. Bao gồm các thông tin liên quan như: hoàn cảnh, thời gian, địa điểm, các bên liên quan..."
                value={description}
                onChangeText={(text) => {
                  setDescription(text);
                  if (errors.description) setErrors({ ...errors, description: '' });
                }}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
                editable={!loading}
              />
              {errors.description ? (
                <Text style={styles.errorText}>{errors.description}</Text>
              ) : null}
              <Text style={styles.charCount}>{description.length} ký tự</Text>
            </View>

            {/* Info Note */}
            <View style={styles.infoNote}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>
                Luật sư sẽ xem xét yêu cầu của bạn và phản hồi trong thời gian sớm nhất.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="send" size={18} color={COLORS.white} />
                  <Text style={styles.submitButtonText}>Gửi yêu cầu</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading2,
    color: COLORS.black,
  },
  scrollView: {
    paddingHorizontal: 20,
  },
  lawyerInfo: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  lawyerLabel: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    marginBottom: 4,
  },
  lawyerName: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    color: COLORS.primary,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body,
    color: COLORS.black,
    marginBottom: 8,
  },
  required: {
    color: COLORS.error,
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 150,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: COLORS.error,
    borderWidth: 1.5,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.error,
    marginTop: 4,
  },
  charCount: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    textAlign: 'right',
    marginTop: 4,
  },
  infoNote: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: '#92400E',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.gray,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body,
    color: COLORS.gray,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body,
    color: COLORS.white,
  },
});

export default ServiceRequestModal;
