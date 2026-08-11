import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing, shadows } from '../theme/theme';
import { getStrengthTierInfo } from '../services/strengthScoreService';
import { Sparkles, Trophy } from 'lucide-react-native';

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
}

export const MuscleHeatmap: React.FC<MuscleHeatmapProps> = ({
  // Pas de score magique fixe : le parent doit injecter le score dynamique.
  // Fallback neutre (milieu de palier Cuivre) si oubli de props — évite le 68 Sauge pour tous.
  score = 40,
  activations = { chest: 40, back: 40, shoulders: 40, legs: 40, arms: 40, core: 40 },
}) => {
  const tier = getStrengthTierInfo(score);

  const muscleItems = [
    { label: 'Dorsaux & Dos', val: activations.back, color: colors.sage[600] },
    { label: 'Quadriceps & Fessiers', val: activations.legs, color: colors.sage[500] },
    { label: 'Pectoraux', val: activations.chest, color: colors.clay[500] },
    { label: 'Deltoïdes & Épaules', val: activations.shoulders, color: colors.clay[400] },
    { label: 'Biceps & Triceps', val: activations.arms, color: colors.ink[600] },
    { label: 'Sangle Abdominale', val: activations.core, color: colors.ink[500] },
  ];

  return (
    <View style={s.container}>
      {/* En-tête de carte Pure Ascension : Titre Spectral Serif + Score de Force */}
      <View style={s.topRow}>
        <View style={s.scoreBox}>
          <View style={s.iconRing}>
            <Trophy size={20} color={colors.sage[700]} strokeWidth={2} />
          </View>
          <View>
            <Text style={s.scoreLabel}>SCORE DE FORCE GLOBAL</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={s.scoreNum}>{score}</Text>
              <Text style={s.scoreMax}>/ 100</Text>
            </View>
          </View>
        </View>

        {/* Badge Palier Métaux Nobles */}
        <View style={[s.badgeCap, { backgroundColor: tier.bgColor, borderColor: tier.badgeBorder }]}>
          <Sparkles size={13} color={tier.color} />
          <Text style={[s.badgeCapText, { color: tier.color }]}>{tier.label}</Text>
        </View>
      </View>

      <Text style={s.tierDesc}>{tier.description}</Text>

      {/* Barres de Répartition Musculaire Hebdomadaire */}
      <View style={s.muscleSection}>
        <Text style={s.sectionHeader}>RÉPARTITION DU STIMULUS MUSCULAIRE HEBDOMADAIRE</Text>
        <View style={s.muscleGrid}>
          {muscleItems.map((m) => (
            <View key={m.label} style={s.muscleRow}>
              <View style={s.labelRow}>
                <Text style={s.muscleName}>{m.label}</Text>
                <Text style={s.muscleVal}>{m.val}%</Text>
              </View>
              <View style={s.track}>
                <View style={[s.fill, { width: `${m.val}%`, backgroundColor: m.color }]} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.sand[300],
    ...shadows.sm,
    marginBottom: spacing[4],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.sage[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.sage[200],
  },
  scoreLabel: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: 10,
    color: colors.ink[500],
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  scoreNum: {
    fontFamily: fontFamily.spectral.bold,
    fontSize: fontSize['3xl'],
    color: colors.ink[900],
    lineHeight: 32,
  },
  scoreMax: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.xs,
    color: colors.ink[500],
  },
  badgeCap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[1.5],
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badgeCapText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.xs,
  },
  tierDesc: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.xs,
    color: colors.ink[600],
    marginBottom: spacing[4],
    lineHeight: 18,
  },
  muscleSection: {
    borderTopWidth: 1,
    borderTopColor: colors.sand[200],
    paddingTop: spacing[3.5],
  },
  sectionHeader: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: 10,
    color: colors.ink[500],
    letterSpacing: 0.8,
    marginBottom: spacing[3],
  },
  muscleGrid: {
    gap: spacing[2.5],
  },
  muscleRow: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muscleName: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.xs,
    color: colors.ink[800],
  },
  muscleVal: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.xs,
    color: colors.ink[900],
  },
  track: {
    height: 6,
    backgroundColor: colors.sand[200],
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
