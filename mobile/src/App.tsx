import React, { useEffect} from 'react';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, SafeAreaView, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as SplashScreen from 'expo-splash-screen';
import { COLORS, FONTS } from './constants/styles';
import ChatScreen from './screens/Main/ChatScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/Auth/LoginScreen';
import SignupScreen from './screens/Auth/SignupScreen';
import MenuScreen from './screens/Main/MenuScreen';
import FAQsScreen from './screens/Support/HelpScreen';
import DocumentLookupScreen from './screens/Lookup/DocumentLookup';
import ProcedureLookupScreen from './screens/Lookup/ProcedureLookup';
import { useFonts } from 'expo-font';

const Stack = createStackNavigator();

// Keep the splash screen visible until the fonts are loaded
SplashScreen.preventAutoHideAsync();

export default function App(): React.JSX.Element | null {
  let [fontsLoaded] = useFonts({
    'Montserrat-Black': require('./assets/fonts/Montserrat-Black.ttf'),
    'Montserrat-Black-Italic': require('./assets/fonts/Montserrat-BlackItalic.ttf'),
    'Montserrat-Bold': require('./assets/fonts/Montserrat-Bold.ttf'),
    'Montserrat-Bold-Italic': require('./assets/fonts/Montserrat-BoldItalic.ttf'),
    'Montserrat-Extra-Bold': require('./assets/fonts/Montserrat-ExtraBold.ttf'),
    'Montserrat-Extra-Bold-Italic': require('./assets/fonts/Montserrat-ExtraBoldItalic.ttf'),
    'Montserrat-Extra-Light': require('./assets/fonts/Montserrat-ExtraLight.ttf'),
    'Montserrat-Extra-Light-Italic': require('./assets/fonts/Montserrat-ExtraLightItalic.ttf'),
    'Montserrat-Italic': require('./assets/fonts/Montserrat-Italic.ttf'),
    'Montserrat-Light': require('./assets/fonts/Montserrat-Light.ttf'),
    'Montserrat-Light-Italic': require('./assets/fonts/Montserrat-LightItalic.ttf'),
    'Montserrat-Medium': require('./assets/fonts/Montserrat-Medium.ttf'),
    'Montserrat-Medium-Italic': require('./assets/fonts/Montserrat-MediumItalic.ttf'),
    'Montserrat-Regular': require('./assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Semi-Bold': require('./assets/fonts/Montserrat-SemiBold.ttf'),
    'Montserrat-Semi-Bold-Italic': require('./assets/fonts/Montserrat-SemiBoldItalic.ttf'),
    'Montserrat-Thin': require('./assets/fonts/Montserrat-Thin.ttf'),
    'Montserrat-Thin-Italic': require('./assets/fonts/Montserrat-ThinItalic.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

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
            <Stack.Screen name="DocumentLookup" component={DocumentLookupScreen} />
            <Stack.Screen name="ProcedureLookup" component={ProcedureLookupScreen} />
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