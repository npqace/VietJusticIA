import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, LogBox } from 'react-native';
import useFontsLoader from './src/hooks/useFontsLoader';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import ErrorBoundary from './src/components/ErrorBoundary';

// Ignore specific log messages from appearing on the screen
LogBox.ignoreLogs([
  'Failed to fetch document details:',
  '[AxiosError: Request failed with status code 500]',
  'Possible Unhandled Promise Rejection',
  'Warning: Failed prop type',
  'VirtualizedLists should never be nested',
  'Setting a timer for a long period of time',
  'componentWillReceiveProps has been renamed',
  'componentWillMount has been renamed',
  'Require cycle:',
  'Remote debugger',
  'Task orphaned',
  'Module RCTImageLoader requires',
  'ViewPropTypes will be removed',
  'AsyncStorage has been extracted',
  'Non-serializable values were found in the navigation state',
  // Auth/Token related errors (handled gracefully by AuthContext)
  'Failed to refresh token',
  'Auth check failed',
  'Network error: Server is unreachable',
  'No refresh token',
  'Could not validate credentials',
  'Request failed with status code 401',
  'Request failed with status code 403',
]);

// Global error handlers to prevent crashes
// UNCOMMENT the line below to hide ALL errors in development too
// LogBox.ignoreAllLogs(true);

if (!__DEV__) {
  // In production, suppress all error overlays
  LogBox.ignoreAllLogs(true);
}

// Handle unhandled promise rejections
const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  console.log('Unhandled promise rejection:', event.reason);
  // Prevent the error from being thrown
  event.preventDefault();
};

// Handle global errors
const handleGlobalError = (error: Error) => {
  console.log('Global error caught:', error);
  // Log but don't crash
  return true;
};

// Register global error handlers
if (typeof global !== 'undefined') {
  global.ErrorUtils?.setGlobalHandler(handleGlobalError);
}

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
    <ErrorBoundary>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // A neutral background color
  },
});
