import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '../theme/theme';

export type BadgeVariant = 'neutral'|'sage'|'clay'|'success'|'warning'|'danger'|'info'|'solid';
export interface BadgeProps { label: string; variant?: BadgeVariant; dot?: boolean; style?: ViewStyle; }

const bg:  Record<BadgeVariant, string> = { neutral: colors.ink[200], sage: colors.sage[100], clay: colors.clay[100], success: colors.status.successSoft, warning: colors.status.warningSoft, danger: colors.status.dangerSoft, info: colors.status.infoSoft, solid: colors.sage[500] };
const fg:  Record<BadgeVariant, string> = { neutral: colors.ink[600], sage: colors.sage[700], clay: colors.clay[600], success: colors.status.success, warning: colors.status.warning, danger: colors.status.danger, info: colors.status.info, solid: colors.white };
const dot: Record<BadgeVariant, string> = { neutral: colors.ink[500], sage: colors.sage[500], clay: colors.clay[500], success: colors.status.success, warning: colors.status.warning, danger: colors.status.danger, info: colors.status.info, solid: colors.white };

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'sage', dot: showDot = false, style }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: spacing[2.5], paddingVertical: spacing[1], borderRadius: radius.pill, backgroundColor: bg[variant] }, style]} accessibilityRole="text">
    {showDot && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot[variant], marginRight: spacing[1.5] }} />}
    <Text style={{ fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.xs, letterSpacing: 0.2, textTransform: 'uppercase', color: fg[variant] }}>{label}</Text>
  </View>
);
export default Badge;
