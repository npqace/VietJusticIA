  import React, { useState } from 'react';
  import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    TextInput
  } from 'react-native';
  import { COLORS, SIZES, FONTS } from '../../constants/styles';
  import { Ionicons } from '@expo/vector-icons';

  const LegalConsultantTab = () => {
    const [consultationForm, setConsultationForm] = useState({
      fullName: '',
      email: '',
      phoneNumber: '',
      province: '',
      district: '',
      content: ''
    });

    const handleSubmitConsultation = () => {
      console.log('Consultation form submitted:', consultationForm);
      // Reset form after submission
      setConsultationForm({
        fullName: '',
        email: '',
        phoneNumber: '',
        province: '',
        district: '',
        content: ''
      });
      // Show success message
      alert('Cảm ơn bạn đã gửi thông tin! Chúng tôi sẽ liên hệ lại trong thời gian sớm nhất.');
    };

    return (
      <View style={styles.formContainer}>
        <Text style={styles.formHeading}>Liên hệ luật sư</Text>
        <Text style={styles.formDescription}>
          Hãy để lại thông tin liên lạc và yêu cầu của bạn. Chúng tôi sẽ liên hệ ngay khi tìm được luật sư phù hợp và có giải đáp của bạn.
        </Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Họ và Tên"
            value={consultationForm.fullName}
            onChangeText={(text) => setConsultationForm({...consultationForm, fullName: text})}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            keyboardType="email-address"
            value={consultationForm.email}
            onChangeText={(text) => setConsultationForm({...consultationForm, email: text})}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Số điện thoại"
            keyboardType="phone-pad"
            value={consultationForm.phoneNumber}
            onChangeText={(text) => setConsultationForm({...consultationForm, phoneNumber: text})}
          />
        </View>

        <View style={styles.dropdownRow}>
          <View style={[styles.inputContainer, styles.dropdownContainer]}>
            <TouchableOpacity style={styles.dropdown}>
              <Text style={styles.dropdownText}>
                {consultationForm.province || 'Tỉnh/Thành phố'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="gray" />
            </TouchableOpacity>
          </View>

          <View style={[styles.inputContainer, styles.dropdownContainer]}>
            <TouchableOpacity style={styles.dropdown}>
              <Text style={styles.dropdownText}>
                {consultationForm.district || 'Quận/huyện'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="gray" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.contentInput}
            placeholder="Nội dung"
            multiline={true}
            numberOfLines={8}
            textAlignVertical="top"
            value={consultationForm.content}
            onChangeText={(text) => setConsultationForm({...consultationForm, content: text})}
          />
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmitConsultation}>
          <Text style={styles.submitButtonText}>Gửi thông tin</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const styles = StyleSheet.create({
    formContainer: {
      marginBottom: 24,
      overflow: 'hidden',
    },
    formHeading: {
      fontFamily: FONTS.bold,
      fontSize: SIZES.heading2,
      color: COLORS.black,
      textAlign: 'center',
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
      borderColor: '#e0e0e0',
      borderRadius: 8,
      paddingHorizontal: 16,
      fontFamily: FONTS.regular,
      backgroundColor: '#f9f9f9',
      fontSize: SIZES.body,
    },
    dropdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    dropdownContainer: {
      flex: 1,
      marginHorizontal: 4,
    },
    dropdown: {
      height: 50,
      borderWidth: 1,
      borderColor: '#e0e0e0',
      borderRadius: 8,
      paddingHorizontal: 16,
      backgroundColor: '#f9f9f9',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dropdownText: {
      fontFamily: FONTS.regular,
      fontSize: SIZES.body,
      color: COLORS.gray,
    },
    dropdownArrow: {
      fontFamily: FONTS.regular,
      fontSize: 12,
      color: COLORS.gray,
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
      fontSize: SIZES.body,
    },
    submitButton: {
      backgroundColor: COLORS.primary,
      paddingVertical: 16,
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

  export default LegalConsultantTab;
