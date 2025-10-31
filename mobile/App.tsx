import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, LogBox } from 'react-native';
import useFontsLoader from './src/hooks/useFontsLoader';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Ignore specific log messages from appearing on the screen
LogBox.ignoreLogs([
  'Failed to fetch document details:',
  '[AxiosError: Request failed with status code 500]',
]);

// Keep the splash screen visible while the app loads
SplashScreen.preventAutoHideAsync();

const Layout = () => {
  const fontsLoaded = useFontsLoader();
  const { isLoading } = useAuth(); // Get loading state from AuthContext

  useEffect(() => {
    // Hide the splash screen once fonts are loaded AND the auth check is complete
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  // Render nothing until both fonts and auth status are loaded
  // This prevents a flash of the wrong screen
  if (!fontsLoaded || isLoading) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <AppNavigator />
    </View>
  );
};

export default function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <Layout />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // A neutral background color
  },
});
