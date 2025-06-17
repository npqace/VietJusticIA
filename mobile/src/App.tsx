import React from 'react';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, SafeAreaView, View } from 'react-native';
import { COLORS, FONTS } from './constants/styles';
import useFontsLoader from './hooks/useFontsLoader';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from './navigation/AppNavigator';

// Keep the splash screen visible until the fonts are loaded
SplashScreen.preventAutoHideAsync();

export default function App(): React.JSX.Element | null {
  const fontsLoaded = useFontsLoader();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <AppNavigator />
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