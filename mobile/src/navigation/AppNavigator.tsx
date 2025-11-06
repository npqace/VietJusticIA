import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { useAuth } from '../context/AuthContext';
import OtpVerificationModal from '../components/Auth/OtpVerificationModal';

import ChatScreen from '../screens/Main/ChatScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import SignupScreen from '../screens/Auth/SignupScreen';
import MenuScreen from '../screens/Main/MenuScreen';
import UserProfile from '../screens/Main/ProfileScreen';
import HelpScreen from '../screens/Support/HelpScreen';
import LawyerScreen from '../screens/Support/LawyerScreen';
import LawyerDetailScreen from '../screens/Support/LawyerDetailScreen';
import DocumentLookupScreen from '../screens/Lookup/DocumentLookupScreen';
import ProcedureLookupScreen from '../screens/Lookup/ProcedureLookupScreen';
import DocumentDetailScreen from '../screens/Lookup/DocumentDetailScreen';
import ResetPasswordScreen from '../screens/Auth/ResetPasswordScreen';
import { COLORS } from '../constants/styles';
import MyRequestsScreen from '../screens/Main/MyRequestsScreen';

const Stack = createStackNavigator();

const linking = {
  prefixes: ['vietjusticia://'],
  config: {
    screens: {
      ResetPassword: 'reset-password',
    },
  },
};

const LoadingScreen = () => (
  <View style={styles.splashContainer}>
    <ActivityIndicator size="large" color={COLORS.primary} />
  </View>
);

const AuthStack = () => (
  <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
  </Stack.Navigator>
);

const MainStack = () => (
  <Stack.Navigator initialRouteName="Chat" screenOptions={{ headerShown: false }}>
    <Stack.Screen name='UserProfile' component={UserProfile} />
    <Stack.Screen name='Chat' component={ChatScreen} />
    <Stack.Screen name='Menu' component={MenuScreen} />
    <Stack.Screen name='FAQs' component={HelpScreen} />
    <Stack.Screen name='Lawyer' component={LawyerScreen} />
    <Stack.Screen name='LawyerDetail' component={LawyerDetailScreen} />
    <Stack.Screen name="DocumentLookup" component={DocumentLookupScreen} />
    <Stack.Screen name="ProcedureLookup" component={ProcedureLookupScreen} />
    <Stack.Screen name="DocumentDetail" component={DocumentDetailScreen} />
    <Stack.Screen name="MyRequests" component={MyRequestsScreen} />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { 
    isAuthenticated, 
    isLoading, 
    isOtpModalVisible, 
    otpEmail, 
    hideOtpModal, 
    onVerify,
    onResend,
    onSuccess
  } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer linking={linking} fallback={<LoadingScreen />}>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
      {isOtpModalVisible && otpEmail && onVerify && onResend && onSuccess && (
        <OtpVerificationModal
          visible={isOtpModalVisible}
          onClose={hideOtpModal}
          email={otpEmail}
          onVerify={onVerify}
          onResend={onResend}
          onSuccess={onSuccess}
        />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
});

export default AppNavigator;