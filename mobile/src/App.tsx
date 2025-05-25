import React from 'react';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, SafeAreaView, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { COLORS, FONTS } from './constants/styles';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import ChatScreen from './screens/Main/ChatScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/Auth/LoginScreen';
import SignupScreen from './screens/Auth/SignupScreen';
import MenuScreen from './screens/Main/MenuScreen';
import FAQsScreen from './screens/Support/HelpScreen';

const Stack = createStackNavigator();

export default function App(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name='Chat' component={ChatScreen} />
            <Stack.Screen name='Menu' component={MenuScreen} />
            <Stack.Screen name='FAQs' component={FAQsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gradientStart,
    paddingTop: Constants.statusBarHeight,
  },
  content: {
    flex: 1,
  },
});