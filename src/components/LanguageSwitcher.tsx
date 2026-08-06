import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../context/LanguageContext';
import { colors, fontFamily, fontSize, radius, shadows, spacing } from '../theme/theme';

interface LanguageSwitcherProps {
  variant?: 'pill' | 'full';
  style?: any;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = 'pill', style }) => {
  const { language, setLanguage, toggleLanguage } = useLanguage();

  const handlePress = (lang?: 'fr' | 'en') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    if (lang) {
      setLanguage(lang);
    } else {
      toggleLanguage();
    }
  };

  if (variant === 'full') {
    return (
      <View style={[st.fullContainer, style]}>
        <Pressable
          onPress={() => handlePress('fr')}
          style={[st.fullBtn, language === 'fr' && st.fullBtnActive]}
          accessibilityRole="button"
        >
          <Text style={[st.fullText, language === 'fr' && st.fullTextActive]}>🇫🇷 Français (FR)</Text>
        </Pressable>
        <Pressable
          onPress={() => handlePress('en')}
          style={[st.fullBtn, language === 'en' && st.fullBtnActive]}
          accessibilityRole="button"
        >
          <Text style={[st.fullText, language === 'en' && st.fullTextActive]}>🇬🇧 English (EN)</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => handlePress()}
      style={[st.pillContainer, style]}
      accessibilityRole="button"
      accessibilityLabel="Changer de langue / Change language"
    >
      <Text style={[st.pillText, language === 'fr' && st.pillTextActive]}>FR</Text>
      <Text style={st.pillDivider}>|</Text>
      <Text style={[st.pillText, language === 'en' && st.pillTextActive]}>EN</Text>
    </Pressable>
  );
};

const st = StyleSheet.create({
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.sage[200],
    gap: 4,
    ...shadows.sm,
  },
  pillText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.xs,
    color: colors.ink[500],
  },
  pillTextActive: {
    fontFamily: fontFamily.hanken.bold,
    color: colors.sage[700],
  },
  pillDivider: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.xs,
    color: colors.ink[300],
  },
  fullContainer: {
    flexDirection: 'row',
    gap: spacing[2],
    backgroundColor: colors.sand[100],
    padding: 4,
    borderRadius: radius.lg,
  },
  fullBtn: {
    flex: 1,
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    alignItems: 'center',
  },
  fullBtnActive: {
    backgroundColor: '#ffffff',
    ...shadows.sm,
  },
  fullText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.xs,
    color: colors.ink[600],
  },
  fullTextActive: {
    fontFamily: fontFamily.hanken.bold,
    color: colors.ink[900],
  },
});

export default LanguageSwitcher;
