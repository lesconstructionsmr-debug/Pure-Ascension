import React from 'react';
import { ActivityIndicator, View, Text, Pressable } from 'react-native';
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

import { LanguageProvider } from './src/context/LanguageContext';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#fbf8f3', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2D3A2E', marginBottom: 10 }}>Pure Ascension</Text>
          <Text style={{ fontSize: 14, color: '#6B7F5E', textAlign: 'center', marginBottom: 20 }}>
            Session réinitialisée avec succès. Veuillez cliquer ci-dessous pour continuer.
          </Text>
          <Pressable
            style={{ backgroundColor: '#C87D55', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
            onPress={() => { if (typeof window !== 'undefined') window.location.reload(); }}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Recharger l'Application</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
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
    <ErrorBoundary>
      <LanguageProvider>
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
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default Platform.OS === 'web' ? App : Sentry.wrap(App);

