import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import ResetPasswordModal from '../../components/Auth/ResetPasswordModal';
import { COLORS } from '../../constants/styles';

type RootStackParamList = {
  ResetPassword: { token?: string };
};

type ResetPasswordScreenRouteProp = RouteProp<RootStackParamList, 'ResetPassword'>;

const ResetPasswordScreen = ({ navigation }: { navigation: any }) => {
  const route = useRoute<ResetPasswordScreenRouteProp>();
  const token = route.params?.token || null;

  const handleSuccess = () => {
    Alert.alert(
      'Thành công',
      'Mật khẩu của bạn đã được đặt lại thành công. Vui lòng đăng nhập bằng mật khẩu mới.',
      [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
    );
  };

  return (
    <View style={styles.container}>
      <ResetPasswordModal
        visible={true}
        onClose={() => navigation.navigate('Login')}
        onSuccess={handleSuccess}
        token={token}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
});

export default ResetPasswordScreen;
