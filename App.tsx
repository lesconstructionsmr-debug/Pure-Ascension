import React from 'react';
import { ActivityIndicator, View, Text, Pressable, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
            onPress={() => {
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                window.location.reload();
              } else {
                this.setState({ hasError: false, error: null });
              }
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Recharger l'Application</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

/** Écran boot sans polices custom — évite crash iOS (fontFamily non chargé / clé inexistante). */
function BootSplash() {
  return (
    <View style={{ flex: 1, backgroundColor: '#FBF8F3', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', color: '#2D3A2E', marginBottom: 16 }}>
        Pure Ascension
      </Text>
      <ActivityIndicator color="#6B7F5E" size="large" />
    </View>
  );
}

function AppContent() {
  const [forceReady, setForceReady] = React.useState(false);
  const [fontsLoaded, fontError] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    Spectral_400Regular,
    Spectral_500Medium,
    Spectral_400Regular_Italic,
    Spectral_500Medium_Italic,
  });

  React.useEffect(() => {
    // iOS release : ne jamais rester bloqué sur le chargement des polices
    const timer = setTimeout(() => setForceReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded && !fontError && !forceReady) {
    return <BootSplash />;
  }

  return (
    <LanguageProvider>
      <SafeAreaProvider>
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
      </SafeAreaProvider>
    </LanguageProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;

