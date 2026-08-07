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

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
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
      const msg = this.state.error?.message
        ? String(this.state.error.message).slice(0, 180)
        : 'Erreur au démarrage';
      return (
        <View style={{ flex: 1, backgroundColor: '#2D4029', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 }}>
            Pure Ascension
          </Text>
          <Text style={{ fontSize: 14, color: '#C5D4B8', textAlign: 'center', marginBottom: 12 }}>
            Impossible d'ouvrir l'écran principal.
          </Text>
          <Text style={{ fontSize: 12, color: '#9BB08A', textAlign: 'center', marginBottom: 20 }}>
            {msg}
          </Text>
          <Pressable
            style={{ backgroundColor: '#C87D55', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Réessayer</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

function BootSplash({ label }: { label?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#2D4029', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 16 }}>
        Pure Ascension
      </Text>
      <ActivityIndicator color="#C5D4B8" size="large" />
      {!!label && (
        <Text style={{ marginTop: 12, fontSize: 13, color: '#9BB08A', textAlign: 'center' }}>
          {label}
        </Text>
      )}
    </View>
  );
}

function AppContent() {
  // iOS: ne JAMAIS bloquer le rendu sur les polices Google (cause fréquente d'écran vide)
  const skipFontGate = Platform.OS === 'ios';
  const [forceReady, setForceReady] = React.useState(skipFontGate);
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
    if (skipFontGate) return;
    const timer = setTimeout(() => setForceReady(true), 800);
    return () => clearTimeout(timer);
  }, [skipFontGate]);

  if (!skipFontGate && !fontsLoaded && !fontError && !forceReady) {
    return <BootSplash label="Chargement…" />;
  }

  return (
    <LanguageProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" />
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
