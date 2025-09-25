import React from "react";
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import ChatScreen from '../screens/Main/ChatScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import SignupScreen from '../screens/Auth/SignupScreen';
import MenuScreen from '../screens/Main/MenuScreen';
import HelpScreen from '../screens/Support/HelpScreen';
import LawyerScreen from '../screens/Support/LawyerScreen';
import DocumentLookupScreen from '../screens/Lookup/DocumentLookup';
import ProcedureLookupScreen from '../screens/Lookup/ProcedureLookup';

import DocumentDetailScreen from '../screens/Lookup/DocumentDetailScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name='Chat' component={ChatScreen} />
        <Stack.Screen name='Menu' component={MenuScreen} />
        <Stack.Screen name='FAQs' component={HelpScreen} />
        <Stack.Screen name='Lawyer' component={LawyerScreen} /> 
        <Stack.Screen name="DocumentLookup" component={DocumentLookupScreen} />
        <Stack.Screen name="ProcedureLookup" component={ProcedureLookupScreen} />
        <Stack.Screen name="DocumentDetail" component={DocumentDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default AppNavigator;