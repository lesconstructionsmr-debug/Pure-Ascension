import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { colors, fontFamily, fontSize, radius, spacing, shadows } from '../theme/theme';
import { getStrengthTierInfo, type StrengthTierKey } from '../services/strengthScoreService';

export interface MuscleActivationData {
  chest: number;     // 0 - 100
  back: number;      // 0 - 100
  shoulders: number; // 0 - 100
  legs: number;      // 0 - 100
  arms: number;      // 0 - 100
  core: number;      // 0 - 100
}

interface MuscleHeatmapProps {
  score?: number;
  activations?: MuscleActivationData;
  showLabels?: boolean;
}

export const MuscleHeatmap: React.FC<MuscleHeatmapProps> = ({
  score = 65,
  activations = { chest: 60, back: 75, shoulders: 55, legs: 70, arms: 45, core: 50 },
  showLabels = true,
}) => {
  const tier = getStrengthTierInfo(score);

  const getMuscleColor = (val: number) => {
    if (val >= 70) return colors.sage[600];
    if (val >= 45) return colors.clay[500];
    return colors.ink[300];
  };

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <View>
          <Text style={s.title}>Aperçu Musculaire & Niveau</Text>
          <Text style={s.subtitle}>Rendement de la Semaine</Text>
        </View>
        <View style={[s.badge, { backgroundColor: tier.bgColor, borderColor: tier.badgeBorder }]}>
          <Text style={[s.badgeText, { color: tier.color }]}>{tier.label} ({score})</Text>
        </View>
      </View>

      <View style={s.bodyContainer}>
        {/* Silhouette SVG du Corps Humain (Face & Dos) */}
        <Svg width={200} height={200} viewBox="0 0 200 200" fill="none">
          {/* Tête */}
          <Circle cx="70" cy="25" r="12" fill={colors.sand[300]} />
          <Circle cx="130" cy="25" r="12" fill={colors.sand[300]} />

          {/* Épaules (Face & Dos) */}
          <Rect x="42" y="40" width="16" height="16" rx="8" fill={getMuscleColor(activations.shoulders)} />
          <Rect x="82" y="40" width="16" height="16" rx="8" fill={getMuscleColor(activations.shoulders)} />
          <Rect x="102" y="40" width="16" height="16" rx="8" fill={getMuscleColor(activations.shoulders)} />
          <Rect x="142" y="40" width="16" height="16" rx="8" fill={getMuscleColor(activations.shoulders)} />

          {/* Pectoraux (Face) */}
          <Rect x="52" y="58" width="36" height="20" rx="6" fill={getMuscleColor(activations.chest)} />

          {/* Grand Dorsal (Dos) */}
          <Rect x="112" y="58" width="36" height="24" rx="6" fill={getMuscleColor(activations.back)} />

          {/* Bras / Biceps / Triceps */}
          <Rect x="38" y="60" width="10" height="30" rx="4" fill={getMuscleColor(activations.arms)} />
          <Rect x="92" y="60" width="10" height="30" rx="4" fill={getMuscleColor(activations.arms)} />
          <Rect x="98" y="60" width="10" height="30" rx="4" fill={getMuscleColor(activations.arms)} />
          <Rect x="152" y="60" width="10" height="30" rx="4" fill={getMuscleColor(activations.arms)} />

          {/* Abdominaux (Face) */}
          <Rect x="56" y="82" width="28" height="24" rx="4" fill={getMuscleColor(activations.core)} />

          {/* Quadriceps & Fessiers (Jambes Face & Dos) */}
          <Rect x="50" y="110" width="18" height="50" rx="8" fill={getMuscleColor(activations.legs)} />
          <Rect x="72" y="110" width="18" height="50" rx="8" fill={getMuscleColor(activations.legs)} />
          <Rect x="110" y="110" width="18" height="50" rx="8" fill={getMuscleColor(activations.legs)} />
          <Rect x="132" y="110" width="18" height="50" rx="8" fill={getMuscleColor(activations.legs)} />
        </Svg>

        {/* Légende par Muscle */}
        {showLabels && (
          <View style={s.legendCol}>
            <View style={s.legendItem}>
              <View style={[s.dot, { backgroundColor: getMuscleColor(activations.chest) }]} />
              <Text style={s.legendText}>Pectoraux : {activations.chest}%</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.dot, { backgroundColor: getMuscleColor(activations.back) }]} />
              <Text style={s.legendText}>Dorsaux : {activations.back}%</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.dot, { backgroundColor: getMuscleColor(activations.shoulders) }]} />
              <Text style={s.legendText}>Épaules : {activations.shoulders}%</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.dot, { backgroundColor: getMuscleColor(activations.legs) }]} />
              <Text style={s.legendText}>Jambes : {activations.legs}%</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.dot, { backgroundColor: getMuscleColor(activations.arms) }]} />
              <Text style={s.legendText}>Bras : {activations.arms}%</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.dot, { backgroundColor: getMuscleColor(activations.core) }]} />
              <Text style={s.legendText}>Core & Abdo : {activations.core}%</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.sand[300],
    ...shadows.sm,
    marginBottom: spacing[3],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  title: {
    fontFamily: fontFamily.spectral.bold,
    fontSize: fontSize.base,
    color: colors.ink[900],
  },
  subtitle: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.xs,
    color: colors.ink[600],
  },
  badge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.xs,
  },
  bodyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  legendCol: {
    gap: spacing[1.5],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.xs,
    color: colors.ink[800],
  },
});
