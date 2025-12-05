import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  ScrollView
} from 'react-native';
import { COLORS, SIZES, FONTS } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import { VIETNAM_PROVINCES, Province, District } from '../../constants/vietnamLocations';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  detail?: string;
  message?: string;
}

/**
 * LegalConsultantTab Component
 *
 * Form for users to submit legal consultation requests.
 * Auto-populates user info if logged in (full name, email, phone).
 * Includes comprehensive validation and modal-based location selection.
 *
 * Features:
 * - Auto-fill user info from AuthContext
 * - Real-time validation with error display
 * - Province/District cascading selection
 * - Form reset after successful submission
 * - Loading state during API call
 *
 * Validation Rules:
 * - Full name: min 2 characters
 * - Email: valid email regex
 * - Phone: min 10 characters, digits only
 * - Province/District: required
 * - Content: min 10 characters
 *
 * @component
 */
const LegalConsultantTab = () => {
  const { user } = useAuth();

  const [consultationForm, setConsultationForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    province: '',
    district: '',
    content: ''
  });

  const [loading, setLoading] = useState(false);
  const [provinceModalVisible, setProvinceModalVisible] = useState(false);
  const [districtModalVisible, setDistrictModalVisible] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-populate user info if logged in
  useEffect(() => {
    if (user) {
      setConsultationForm(prev => ({
        ...prev,
        fullName: user.full_name || '',
        email: user.email || '',
        phoneNumber: user.phone || ''
      }));
    }
  }, [user]);

  /**
   * Handles province selection from modal
   * Resets district when province changes
   *
   * @param {Province} province - Selected province with districts
   */
  const handleProvinceSelect = (province: Province) => {
    setSelectedProvince(province);
    setConsultationForm({ ...consultationForm, province: province.label, district: '' });
    setProvinceModalVisible(false);
    setErrors({ ...errors, province: '', district: '' });
  };

  /**
   * Handles district selection from modal
   *
   * @param {District} district - Selected district
   */
  const handleDistrictSelect = (district: District) => {
    setConsultationForm({ ...consultationForm, district: district.label });
    setDistrictModalVisible(false);
    setErrors({ ...errors, district: '' });
  };

  /**
   * Validates all form fields
   *
   * @returns {boolean} True if form is valid, false otherwise
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!consultationForm.fullName.trim() || consultationForm.fullName.length < 2) {
      newErrors.fullName = 'Vui lòng nhập họ và tên (tối thiểu 2 ký tự)';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!consultationForm.email.trim() || !emailRegex.test(consultationForm.email)) {
      newErrors.email = 'Vui lòng nhập email hợp lệ';
    }

    // Strip spaces/dashes before validation
    const cleanPhone = consultationForm.phoneNumber.replace(/[\s-]/g, '');
    const phoneRegex = /^\d{10,11}$/;  // Vietnamese phones: 10-11 digits

    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      newErrors.phoneNumber = 'Vui lòng nhập số điện thoại hợp lệ (10-11 số)';
    }

    if (!consultationForm.province.trim()) {
      newErrors.province = 'Vui lòng chọn tỉnh/thành phố';
    }

    if (!consultationForm.district.trim()) {
      newErrors.district = 'Vui lòng chọn quận/huyện';
    }

    if (!consultationForm.content.trim() || consultationForm.content.length < 10) {
      newErrors.content = 'Vui lòng nhập nội dung (tối thiểu 10 ký tự)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Submits consultation request to backend
   * Validates form, shows loading state, resets on success
   *
   * @async
   */
  const handleSubmitConsultation = async () => {
    if (!validateForm()) {
      Alert.alert('Lỗi', 'Vui lòng kiểm tra lại thông tin');
      return;
    }

    setLoading(true);

    try {
      // Use clean phone number for submission
      const cleanPhone = consultationForm.phoneNumber.replace(/[\s-]/g, '');

      await api.post('/api/v1/consultations', {
        full_name: consultationForm.fullName,
        email: consultationForm.email,
        phone: cleanPhone,
        province: consultationForm.province,
        district: consultationForm.district,
        content: consultationForm.content
      });

      // Reset form after successful submission
      setConsultationForm({
        fullName: user?.full_name || '',
        email: user?.email || '',
        phoneNumber: user?.phone || '',
        province: '',
        district: '',
        content: ''
      });
      setSelectedProvince(null);

      Alert.alert(
        'Thành công',
        'Cảm ơn bạn đã gửi thông tin! Chúng tôi sẽ liên hệ lại trong thời gian sớm nhất.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      Alert.alert(
        'Lỗi',
        axiosError.response?.data?.detail ||
        axiosError.response?.data?.message ||
        'Không thể gửi yêu cầu. Vui lòng thử lại sau.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.formDescription}>
        Hãy để lại thông tin liên lạc và yêu cầu của bạn. Chúng tôi sẽ liên hệ ngay khi tìm được luật sư phù hợp và có giải đáp cho bạn.
      </Text>

      {/* Full Name */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, errors.fullName ? styles.inputError : null]}
          placeholder="Họ và Tên *"
          value={consultationForm.fullName}
          onChangeText={(text) => {
            setConsultationForm({ ...consultationForm, fullName: text });
            setErrors({ ...errors, fullName: '' });
          }}
        />
        {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
      </View>

      {/* Email */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, errors.email ? styles.inputError : null]}
          placeholder="Email *"
          keyboardType="email-address"
          autoCapitalize="none"
          value={consultationForm.email}
          onChangeText={(text) => {
            setConsultationForm({ ...consultationForm, email: text });
            setErrors({ ...errors, email: '' });
          }}
        />
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
      </View>

      {/* Phone Number */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, errors.phoneNumber ? styles.inputError : null]}
          placeholder="Số điện thoại *"
          keyboardType="phone-pad"
          value={consultationForm.phoneNumber}
          onChangeText={(text) => {
            setConsultationForm({ ...consultationForm, phoneNumber: text });
            setErrors({ ...errors, phoneNumber: '' });
          }}
        />
        {errors.phoneNumber ? <Text style={styles.errorText}>{errors.phoneNumber}</Text> : null}
      </View>

      {/* Province and District Row */}
      <View style={styles.dropdownRow}>
        {/* Province */}
        <View style={[styles.inputContainer, styles.dropdownContainer]}>
          <TouchableOpacity
            style={[styles.dropdown, errors.province ? styles.inputError : null]}
            onPress={() => setProvinceModalVisible(true)}
          >
            <Text style={[styles.dropdownText, !consultationForm.province && styles.placeholderText]}>
              {consultationForm.province || 'Tỉnh/Thành phố *'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
          </TouchableOpacity>
          {errors.province ? <Text style={styles.errorText}>{errors.province}</Text> : null}
        </View>

        {/* District */}
        <View style={[styles.inputContainer, styles.dropdownContainer]}>
          <TouchableOpacity
            style={[styles.dropdown, errors.district ? styles.inputError : null]}
            onPress={() => {
              if (selectedProvince) {
                setDistrictModalVisible(true);
              } else {
                Alert.alert('Thông báo', 'Vui lòng chọn tỉnh/thành phố trước');
              }
            }}
            disabled={!selectedProvince}
          >
            <Text style={[styles.dropdownText, !consultationForm.district && styles.placeholderText]}>
              {consultationForm.district || 'Quận/Huyện *'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={selectedProvince ? COLORS.gray : COLORS.disabled} />
          </TouchableOpacity>
          {errors.district ? <Text style={styles.errorText}>{errors.district}</Text> : null}
        </View>
      </View>

      {/* Content */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.contentInput, errors.content ? styles.inputError : null]}
          placeholder="Nội dung *"
          multiline={true}
          numberOfLines={8}
          textAlignVertical="top"
          value={consultationForm.content}
          onChangeText={(text) => {
            setConsultationForm({ ...consultationForm, content: text });
            setErrors({ ...errors, content: '' });
          }}
        />
        {errors.content ? <Text style={styles.errorText}>{errors.content}</Text> : null}
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmitConsultation}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.submitButtonText}>Gửi thông tin</Text>
        )}
      </TouchableOpacity>

      {/* Province Selection Modal */}
      <Modal
        visible={provinceModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setProvinceModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn Tỉnh/Thành phố</Text>
              <TouchableOpacity onPress={() => setProvinceModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.black} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={VIETNAM_PROVINCES}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleProvinceSelect(item)}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
                  {consultationForm.province === item.label && (
                    <Ionicons name="checkmark" size={24} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* District Selection Modal */}
      <Modal
        visible={districtModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDistrictModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn Quận/Huyện</Text>
              <TouchableOpacity onPress={() => setDistrictModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.black} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={selectedProvince?.districts || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleDistrictSelect(item)}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
                  {consultationForm.district === item.label && (
                    <Ionicons name="checkmark" size={24} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
    paddingBottom: 24,
  },
  formDescription: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontFamily: FONTS.regular,
    backgroundColor: COLORS.inputBackground,
    fontSize: SIZES.body,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.small,
    color: COLORS.error,
    marginTop: 4,
    marginLeft: 4,
  },
  dropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dropdownContainer: {
    flex: 1,
  },
  dropdown: {
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.inputBackground,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.black,
  },
  placeholderText: {
    color: COLORS.gray,
  },
  contentInput: {
    height: 200,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    fontFamily: FONTS.regular,
    backgroundColor: COLORS.inputBackground,
    textAlignVertical: 'top',
    fontSize: SIZES.body,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
    fontSize: SIZES.body,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.modalBackdrop,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.body,
    color: COLORS.black,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalItemText: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.black,
  },
});

export default LegalConsultantTab;
