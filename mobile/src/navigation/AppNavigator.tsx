import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { useAuth } from '../context/AuthContext'; // Import the useAuth hook

import ChatScreen from '../screens/Main/ChatScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import SignupScreen from '../screens/Auth/SignupScreen';
import MenuScreen from '../screens/Main/MenuScreen';
import HelpScreen from '../screens/Support/HelpScreen';
import LawyerScreen from '../screens/Support/LawyerScreen';
import DocumentLookupScreen from '../screens/Lookup/DocumentLookupScreen';
import ProcedureLookupScreen from '../screens/Lookup/ProcedureLookupScreen';
import DocumentDetailScreen from '../screens/Lookup/DocumentDetailScreen';
import { COLORS } from '../constants/styles';

const Stack = createStackNavigator();

// A simple loading screen, can be replaced with the splash screen logic later
const LoadingScreen = () => (
  <View style={styles.splashContainer}>
    <ActivityIndicator size="large" color={COLORS.primary} />
  </View>
);

// Screens accessible before logging in
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);

// Screens accessible after logging in
const MainStack = () => (
  <Stack.Navigator initialRouteName="Chat" screenOptions={{ headerShown: false }}>
    <Stack.Screen name='Chat' component={ChatScreen} />
    <Stack.Screen name='Menu' component={MenuScreen} />
    <Stack.Screen name='FAQs' component={HelpScreen} />
    <Stack.Screen name='Lawyer' component={LawyerScreen} />
    <Stack.Screen name="DocumentLookup" component={DocumentLookupScreen} />
    <Stack.Screen name="ProcedureLookup" component={ProcedureLookupScreen} />
    <Stack.Screen name="DocumentDetail" component={DocumentDetailScreen} />
  </Stack.Navigator>
);

const AppNavigator = () => {
  // Get state from the context instead of local state
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
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