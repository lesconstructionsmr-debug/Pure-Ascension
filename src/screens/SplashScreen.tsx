/**
 * SplashScreen — Étape 0 du tunnel.
 * Logo + tagline + CTA unique. Zéro friction : le client entre
 * directement dans le tunnel de quiz de profil fitness, sans signup.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius } from '../theme/theme';
import { PureAscensionLogo } from '../components/PureAscensionLogo';

interface Props {
  onStart: () => void;
  onLogin: () => void;
}

export const SplashScreen: React.FC<Props> = ({ onStart, onLogin }) => {
  // opacity 1 dès le 1er frame — éviter écran "vide" pendant le fade-in
  const fade  = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <SafeAreaView style={st.safe}>
      <Animated.View style={[st.container, { opacity: fade }]}>

        {/* Logo */}
        <View style={st.centerArea}>
          <Animated.View style={[st.logoWrap, { transform: [{ scale: pulse }] }]}>
            <View style={st.logoInner}>
              <PureAscensionLogo size={280} color="#D2C4A7" strokeWidth={2.8} />
            </View>
          </Animated.View>
          <Text style={st.brand}>Pure Ascension</Text>
          <Text style={st.tagline}>
            Ton programme. <Text style={st.taglineItalic}>Ta transformation.</Text>
          </Text>
        </View>

        {/* CTA */}
        <View style={st.bottomArea}>
          <Pressable
            style={({ pressed }) => [st.cta, pressed && st.ctaPressed]}
            onPress={onStart}
            accessibilityRole="button"
            accessibilityLabel="Commencer"
          >
            <Text style={st.ctaText}>Commencer</Text>
            <ArrowRight size={20} color={colors.sage[800]} strokeWidth={2.2} />
          </Pressable>
          <Pressable onPress={onLogin} style={st.loginLink} accessibilityRole="button">
            <Text style={st.loginText}>
              J'ai déjà un compte · <Text style={st.loginTextBold}>Se connecter</Text>
            </Text>
          </Pressable>
        </View>

      </Animated.View>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.sage[800] },
  container: { flex: 1, justifyContent: 'space-between', paddingHorizontal: spacing[6], paddingTop: spacing[16], paddingBottom: spacing[10] },

  centerArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[4] },
  logoWrap: {
    width: 340, height: 340,
    alignItems: 'center', justifyContent: 'center',
  },
  logoInner: {
    width: 300, height: 300,
    alignItems: 'center', justifyContent: 'center',
  },
  brand: {
    fontFamily: fontFamily.spectral.regular,
    fontSize: fontSize['3xl'], color: '#fff',
    letterSpacing: 0.5, marginTop: spacing[2],
  },
  tagline: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.md, color: colors.sage[300],
    textAlign: 'center',
  },
  taglineItalic: {
    fontFamily: fontFamily.spectral.mediumItalic,
    color: colors.sage[200],
  },

  bottomArea: { gap: spacing[4] },
  cta: {
    backgroundColor: colors.sage[200], borderRadius: radius.pill,
    paddingVertical: spacing[5],
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[3],
  },
  ctaPressed: { backgroundColor: colors.sage[300], transform: [{ scale: 0.98 }] },
  ctaText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.lg, color: colors.sage[800],
  },
  loginLink: { alignItems: 'center', paddingVertical: spacing[2] },
  loginText: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.sm, color: colors.sage[400],
    lineHeight: fontSize.sm * lineHeight.relaxed,
  },
  loginTextBold: { fontFamily: fontFamily.hanken.semiBold, color: colors.sage[200] },
});

export default SplashScreen;
