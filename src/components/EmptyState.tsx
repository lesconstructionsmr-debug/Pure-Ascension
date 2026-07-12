/**
 * EmptyState — affiché quand aucun plan n'existe pour l'utilisatrice.
 * Jamais de données factices : on force vers le diagnostic.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ClipboardList } from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';

interface Props {
  title?:    string;
  message?:  string;
  ctaLabel?: string;
  onCta?:    () => void;
}

export const EmptyState: React.FC<Props> = ({
  title    = 'Aucun plan trouvé',
  message  = 'Complète ton diagnostic pour recevoir ton programme personnalisé.',
  ctaLabel = 'Compléter le diagnostic',
  onCta,
}) => (
  <View style={s.wrap}>
    <View style={s.iconWrap}>
      <ClipboardList size={28} color={colors.sage[500]} strokeWidth={1.6} />
    </View>
    <Text style={s.title}>{title}</Text>
    <Text style={s.message}>{message}</Text>
    {onCta && (
      <Pressable
        style={({ pressed }) => [s.cta, pressed && s.ctaPressed]}
        onPress={onCta}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
      >
        <Text style={s.ctaText}>{ctaLabel}</Text>
      </Pressable>
    )}
  </View>
);

const s = StyleSheet.create({
  wrap: {
    alignItems: 'center', justifyContent: 'center',
    padding: spacing[8], gap: spacing[3],
    backgroundColor: '#fff', borderRadius: radius.xl,
    ...shadows.sm,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.sage[50],
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing[1],
  },
  title: {
    fontFamily: fontFamily.spectral.medium,
    fontSize: fontSize.xl, color: colors.ink[900],
    textAlign: 'center',
  },
  message: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.sm, color: colors.ink[600],
    textAlign: 'center', lineHeight: fontSize.sm * lineHeight.relaxed,
  },
  cta: {
    marginTop: spacing[2],
    backgroundColor: colors.sage[500], borderRadius: radius.pill,
    paddingHorizontal: spacing[6], paddingVertical: spacing[3],
  },
  ctaPressed: { backgroundColor: colors.sage[600] },
  ctaText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.base, color: '#fff',
  },
});

export default EmptyState;
