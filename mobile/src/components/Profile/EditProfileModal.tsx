import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, TouchableWithoutFeedback, Keyboard, Alert } from 'react-native';
import CustomButton from '../CustomButton';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../../constants/styles';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { requestContactUpdate, verifyContactUpdate } from '../../services/authService';

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

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      const emailChanged = email !== user.email;
      const phoneChanged = phoneNumber !== user.phone;

      if (emailChanged || phoneChanged) {
        const payload: { email?: string; phone?: string } = {};
        if (emailChanged) payload.email = email;
        if (phoneChanged) payload.phone = phoneNumber;

        await requestContactUpdate(payload);
        onClose(); // Close the edit modal first

        showOtpModal(
          emailChanged ? email : user.email,
          (otp) => verifyContactUpdate({ ...payload, otp }),
          () => requestContactUpdate(payload), // Resend by calling update-contact again
          handleUpdateSuccess
        );

      } else {
        // Update full name if changed
        if (fullName !== user.full_name) {
          const payload = {
            full_name: fullName,
          };
          const response = await api.patch('/api/v1/users/me', payload);
          updateUser(response.data);
          onClose();
          Alert.alert('Thành công', 'Thông tin của bạn đã được cập nhật.');
        } else {
          onClose();
          Alert.alert('Thông báo', 'Không có thay đổi nào để lưu.');
        }
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.detail || 'Không thể cập nhật thông tin.');
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    width: '90%',
    backgroundColor: 'white',
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
    backgroundColor: '#3b5998',
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