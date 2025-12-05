import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Keyboard, Alert } from 'react-native';
import CustomButton from '../CustomButton';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../../constants/styles';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { requestContactUpdate, verifyContactUpdate } from '../../services/authService';
import { getErrorMessage, isNetworkError } from '../../utils/errorMessages';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  fullName: string;
  email: string;
  phoneNumber: string;
  setFullName: (text: string) => void;
  setEmail: (text: string) => void;
  setPhoneNumber: (text: string) => void;
}

/**
 * EditProfileModal Component
 *
 * Modal for editing user profile information (full name, email, phone).
 * Integrates with OTP verification for email/phone changes.
 *
 * User Flows:
 * 1. Name only changed → Direct API call → Success
 * 2. Email/Phone changed → Request OTP → Show OTP modal → Verify → Success
 * 3. No changes → Alert "Không có thay đổi"
 *
 * @component
 */
const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  fullName,
  email,
  phoneNumber,
  setFullName,
  setEmail,
  setPhoneNumber,
}) => {
  const { user, updateUser, showOtpModal, refreshUserData, hideOtpModal } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateSuccess = async () => {
    hideOtpModal();
    await refreshUserData();
    Alert.alert('Thành công', 'Thông tin của bạn đã được cập nhật.');
  };

  const updateFullNameOnly = async (name: string) => {
    const payload = { full_name: name };
    const response = await api.patch('/api/v1/users/me', payload);
    updateUser(response.data);
    onClose();
    Alert.alert('Thành công', 'Thông tin của bạn đã được cập nhật.');
  };

  const updateContactInfo = async (payload: { email?: string; phone?: string }) => {
    await requestContactUpdate(payload);
    onClose(); // Close edit modal

    // Show OTP modal
    const emailChanged = !!payload.email;
    showOtpModal(
      emailChanged ? payload.email! : user.email,
      (otp) => verifyContactUpdate({ ...payload, otp }),
      () => requestContactUpdate(payload),
      handleUpdateSuccess
    );
  };

  const handleSaveChanges = async () => {
    Keyboard.dismiss();

    const name = fullName.trim();
    const mail = email.trim();
    const phone = phoneNumber.replace(/[\s-]/g, '');

    // Validate full name
    if (!name) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ và tên.');
      return;
    }

    if (name.length < 2) {
      Alert.alert('Lỗi', 'Họ và tên phải có ít nhất 2 ký tự.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mail)) {
      Alert.alert('Lỗi', 'Email không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }

    // Validate phone format (10-11 digits)
    const phoneRegex = /^\d{10,11}$/;
    if (!phoneRegex.test(phone)) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ (10-11 số).');
      return;
    }

    const emailChanged = mail !== user.email;
    const phoneChanged = phone !== user.phone;
    const nameChanged = name !== user.full_name;

    if (!emailChanged && !phoneChanged && !nameChanged) {
      onClose();
      Alert.alert('Thông báo', 'Không có thay đổi nào để lưu.');
      return;
    }

    setIsLoading(true);
    try {
      if (emailChanged || phoneChanged) {
        // Contact info changed → OTP flow
        const payload: { email?: string; phone?: string } = {};
        if (emailChanged) payload.email = mail;
        if (phoneChanged) payload.phone = phone;
        await updateContactInfo(payload);
      } else if (nameChanged) {
        // Only name changed → direct update
        await updateFullNameOnly(name);
      }
    } catch (error: any) {
      if (isNetworkError(error)) {
        Alert.alert('Lỗi Kết Nối', 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
        return;
      }

      const errorMessage = getErrorMessage(error, 'Không thể cập nhật thông tin.');
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalView}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={28} color={COLORS.gray} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Thay đổi thông tin</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Họ và Tên</Text>
                <View style={styles.inputOuterContainer}>
                  <TextInput
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Họ và Tên"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputOuterContainer}>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    placeholder="Email"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Số điện thoại</Text>
                <View style={styles.inputOuterContainer}>
                  <TextInput
                    style={styles.input}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    placeholder="Số điện thoại"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
              </View>

              <CustomButton
                title="Lưu thay đổi"
                onPress={handleSaveChanges}
                buttonStyle={styles.saveButton}
                textStyle={styles.saveButtonText}
                isLoading={isLoading}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.modalBackdrop || 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    width: '90%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading3,
    color: COLORS.black,
    marginBottom: 25,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.medium,
    color: COLORS.gray,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  inputOuterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    height: 55,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.black,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    height: 55,
    width: '100%',
    marginTop: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    color: COLORS.white,
  },
});

export default EditProfileModal;