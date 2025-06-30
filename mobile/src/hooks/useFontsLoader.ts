import { useEffect} from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

const fontAssets = {
  'Montserrat-Black': require('../assets/fonts/Montserrat-Black.ttf'),
  'Montserrat-Black-Italic': require('../assets/fonts/Montserrat-BlackItalic.ttf'),
  'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.ttf'),
  'Montserrat-Bold-Italic': require('../assets/fonts/Montserrat-BoldItalic.ttf'),
  'Montserrat-Extra-Bold': require('../assets/fonts/Montserrat-ExtraBold.ttf'),
  'Montserrat-Extra-Bold-Italic': require('../assets/fonts/Montserrat-ExtraBoldItalic.ttf'),
  'Montserrat-Extra-Light': require('../assets/fonts/Montserrat-ExtraLight.ttf'),
  'Montserrat-Extra-Light-Italic': require('../assets/fonts/Montserrat-ExtraLightItalic.ttf'),
  'Montserrat-Italic': require('../assets/fonts/Montserrat-Italic.ttf'),
  'Montserrat-Light': require('../assets/fonts/Montserrat-Light.ttf'),
  'Montserrat-Light-Italic': require('../assets/fonts/Montserrat-LightItalic.ttf'),
  'Montserrat-Medium': require('../assets/fonts/Montserrat-Medium.ttf'),
  'Montserrat-Medium-Italic': require('../assets/fonts/Montserrat-MediumItalic.ttf'),
  'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),
  'Montserrat-Semi-Bold': require('../assets/fonts/Montserrat-SemiBold.ttf'),
  'Montserrat-Semi-Bold-Italic': require('../assets/fonts/Montserrat-SemiBoldItalic.ttf'),
  'Montserrat-Thin': require('../assets/fonts/Montserrat-Thin.ttf'),
  'Montserrat-Thin-Italic': require('../assets/fonts/Montserrat-ThinItalic.ttf'),
};

export default function useFontsLoader() {
  const [fontsLoaded] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  return fontsLoaded;
}