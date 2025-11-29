import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Modal,
} from 'react-native';
import CustomButton from '../CustomButton';
import { COLORS, SIZES, FONTS } from '../../constants/styles';
import { Ionicons } from '@expo/vector-icons';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ visible, onClose, onConfirm }) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = () => {
    if (confirmationText !== 'DELETE') {
      Alert.alert('Lỗi', 'Vui lòng gõ "DELETE" để xác nhận.');
      return;
    }
    setIsLoading(true);
    onConfirm();
    // The parent component will handle closing the modal and logging out
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
            <View style={styles.modalContainer}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color={COLORS.gray} />
              </TouchableOpacity>
              <Text style={styles.title}>Xóa tài khoản</Text>
              <Text style={styles.subtitle}>
                Hành động này không thể hoàn tác. Tất cả dữ liệu của bạn sẽ bị xóa vĩnh viễn.
              </Text>
              <Text style={styles.confirmationLabel}>
                Vui lòng gõ "DELETE" vào ô bên dưới để xác nhận.
              </Text>
              <View style={styles.inputOuterContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="DELETE"
                  placeholderTextColor={COLORS.gray}
                  value={confirmationText}
                  onChangeText={setConfirmationText}
                  autoCapitalize="characters"
                />
              </View>
              <CustomButton
                title="Xóa tài khoản vĩnh viễn"
                onPress={handleDelete}
                buttonStyle={styles.submitButton}
                textStyle={styles.submitButtonText}
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
  modalContainer: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.heading2,
    color: COLORS.danger,
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: SIZES.medium,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmationLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: SIZES.medium,
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: 10,
  },
  inputOuterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 16,
    width: '100%',
    height: 55,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: FONTS.regular,
    fontSize: SIZES.body,
    color: COLORS.black,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: COLORS.red,
    height: 55,
    width: '100%',
  },
  submitButtonText: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    color: COLORS.white,
  },
});

export default DeleteAccountModal;
