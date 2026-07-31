import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import {
  Spectral_400Regular,
  Spectral_500Medium,
  Spectral_400Regular_Italic,
  Spectral_500Medium_Italic,
} from '@expo-google-fonts/spectral';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme/theme';

import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

if (Platform.OS !== 'web') {
  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN || 'https://e6a3b35ebc70f4613d3a05d6a418e044@o4511616564002816.ingest.de.sentry.io/4511616583532624';
  try {
    Sentry.init({
      dsn: sentryDsn,
      debug: false,
      tracesSampleRate: 0.2,
    });
  } catch (err) {
    console.warn('Initialisation Sentry:', err);
  }
}

function App() {
  const [fontsLoaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    Spectral_400Regular,
    Spectral_500Medium,
    Spectral_400Regular_Italic,
    Spectral_500Medium_Italic,
  });

  const [forceReady, setForceReady] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setForceReady(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded && !forceReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.sand[50], alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.sage[500]} />
      </View>
    );
  }

  return (
    <NavigationContainer
      documentTitle={{
        formatter: (options, route) => {
          const title = options?.title ?? route?.name;
          if (title && title !== 'undefined') return `${title} | Pure Ascension`;
          return 'Pure Ascension';
        }
      }}
    >
      <StatusBar style="auto" />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default Platform.OS === 'web' ? App : Sentry.wrap(App);

