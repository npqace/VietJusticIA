import React from 'react';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native'; // SafeAreaView removed from here
import { SafeAreaView } from 'react-native-safe-area-context'; // And imported from here
import { COLORS } from './src/constants/styles';
import useFontsLoader from './src/hooks/useFontsLoader';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';

// Keep the splash screen visible until the fonts are loaded
SplashScreen.preventAutoHideAsync();

export default function App(): React.JSX.Element | null {
  const fontsLoaded = useFontsLoader();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.content}>
          <AppNavigator />
        </View>
      </SafeAreaView>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gradientStart,
    // paddingTop is no longer needed as SafeAreaView handles it
  },
  content: {
    flex: 1,
  },
});