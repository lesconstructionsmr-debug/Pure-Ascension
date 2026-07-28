import React from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { Flame, CheckCircle, ShieldCheck, Dumbbell, Utensils, Moon, Brain } from 'lucide-react-native';
import { colors, fontFamily, fontSize, letterSpacing, radius, spacing } from '../theme/theme';
import { PureAscensionLogo } from './PureAscensionLogo';
import { Ring } from './Ring';

export interface AscensionCardData {
  userName?: string;
  ascensionScore: number;
  streakDays: number;
  workoutCompleted: boolean;
  mealsCount: number;
  waterGlasses: number;
  sleepScore: number;
  mentalCheckin: boolean;
}

interface Props {
  data: AscensionCardData;
}

export const AscensionCard: React.FC<Props> = ({ data }) => {
  const {
    userName = 'Frère d\'Arme',
    ascensionScore = 85,
    streakDays = 1,
    workoutCompleted = false,
    mealsCount = 0,
    waterGlasses = 0,
    sleepScore = 0,
    mentalCheckin = false,
  } = data;

  const todayDate = React.useMemo(() => {
    return new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).toUpperCase();
  }, []);

  return (
    <View style={st.storyContainer} accessibilityRole="image" accessibilityLabel="Ascension Card Instagram Story">
      {/* Subtle decorative glow overlay circles */}
      <View style={st.glowTopRight} />
      <View style={st.glowBottomLeft} />

      {/* Outer Luxury Sand/Gold Frame */}
      <View style={st.innerFrame}>

        {/* Header Branding */}
        <View style={st.brandHeader}>
          <PureAscensionLogo size={38} color={colors.sand[200]} strokeWidth={2.5} />
          <Text style={st.brandTitle}>PURE ASCENSION</Text>
          <View style={st.eyebrowBadge}>
            <Text style={st.eyebrowText}>SCORE D'ASCENSION QUOTIDIEN</Text>
          </View>
        </View>

        {/* Main Ascension Ring Display */}
        <View style={st.ringSection}>
          <View style={st.ringWrapper}>
            <Ring
              value={ascensionScore}
              size={110}
              strokeWidth={9}
              fillColor={colors.sage[400]}
              trackColor="#253528"
            />
            <View style={st.ringCenterContent}>
              <Text style={st.scoreNumber}>{ascensionScore}%</Text>
              <Text style={st.scoreLabel}>SCORE</Text>
            </View>
          </View>

          {/* Streak 🔥 Pill */}
          <View style={st.streakPill}>
            <Flame size={16} color={colors.clay[400]} fill={colors.clay[500]} />
            <Text style={st.streakText}>{streakDays} Jours de Discipline 🔥</Text>
          </View>
        </View>

        {/* Summary of Pillars P1-P4 */}
        <View style={st.pillarsContainer}>
          <Text style={st.pillarsTitle}>PILIER PAR PILIER</Text>

          {/* P1: Entraînement */}
          <View style={st.pillarRow}>
            <View style={st.pillarIconBox}>
              <Dumbbell size={15} color={colors.sage[300]} />
            </View>
            <View style={st.pillarContent}>
              <Text style={st.pillarName}>P1 • ENTRAÎNEMENT & FORCE</Text>

              <Text style={st.pillarStatus}>
                {workoutCompleted ? 'Session du jour validée 💪' : 'Programme d\'entraînement en cours'}
              </Text>
            </View>
            {workoutCompleted && <CheckCircle size={15} color={colors.sage[400]} />}
          </View>

          {/* P2: Nutrition & Hydratation */}
          <View style={st.pillarRow}>
            <View style={st.pillarIconBox}>
              <Utensils size={15} color={colors.clay[300]} />
            </View>
            <View style={st.pillarContent}>
              <Text style={st.pillarName}>P2 • NUTRITION & EAU</Text>
              <Text style={st.pillarStatus}>
                {mealsCount}/3 Repas • {waterGlasses}/8 Verres d'eau
              </Text>
            </View>
            {mealsCount >= 3 && <CheckCircle size={15} color={colors.sage[400]} />}
          </View>

          {/* P3: Sommeil & Récupération */}
          <View style={st.pillarRow}>
            <View style={st.pillarIconBox}>
              <Moon size={15} color={colors.info[100]} />
            </View>
            <View style={st.pillarContent}>
              <Text style={st.pillarName}>P3 • SOMMEIL & RÉCUPÉRATION</Text>
              <Text style={st.pillarStatus}>
                {sleepScore >= 5 ? '⚡ Reposé (7h+)' : sleepScore >= 3 ? '😐 Moyen (6h)' : sleepScore === 1 ? '😴 Fatigué (-6h)' : 'Check-in 1-tap'}
              </Text>
            </View>
            {sleepScore >= 4 && <CheckCircle size={15} color={colors.sage[400]} />}
          </View>

          {/* P4: Équilibre Mental */}
          <View style={st.pillarRow}>
            <View style={st.pillarIconBox}>
              <Brain size={15} color={colors.sand[200]} />
            </View>
            <View style={st.pillarContent}>
              <Text style={st.pillarName}>P4 • ÉQUILIBRE MENTAL</Text>
              <Text style={st.pillarStatus}>
                {mentalCheckin ? 'Check-in Mental Validé 🧘' : 'Sérénité & Clarté'}
              </Text>
            </View>
            {mentalCheckin && <CheckCircle size={15} color={colors.sage[400]} />}
          </View>
        </View>

        {/* Footer Brand Info & Quote */}
        <View style={st.footer}>
          <Text style={st.quoteText}>
            « L'excellence est une habitude. L'ascension est un devoir. »
          </Text>
          <View style={st.footerMeta}>
            <Text style={st.userNameText}>@{userName}</Text>
            <Text style={st.dateText}>{todayDate}</Text>
          </View>
          <Text style={st.websiteTag}>PUREASCENSION.APP</Text>
        </View>

      </View>
    </View>
  );
};

const CARD_WIDTH = 300;
const CARD_HEIGHT = 533; // 9:16 aspect ratio (300 x 533.33)

const st = StyleSheet.create({
  storyContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#111714', // Onyx dark background
    borderRadius: radius.card,
    padding: spacing[3],
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#37493A',
    position: 'relative',
    alignSelf: 'center',
  },
  glowTopRight: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(185, 106, 69, 0.15)', // Subtle clay glow
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(94, 132, 85, 0.18)', // Subtle sage glow
  },
  innerFrame: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(234, 224, 207, 0.25)',
    borderRadius: radius.xl,
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[3],
    justify: 'space-between',
    backgroundColor: 'rgba(18, 26, 21, 0.85)',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  brandTitle: {
    fontFamily: fontFamily.spectral.medium,
    fontSize: fontSize.base,
    color: colors.sand[100],
    letterSpacing: 3,
    marginTop: spacing[1],
  },
  eyebrowBadge: {
    backgroundColor: 'rgba(185, 106, 69, 0.2)',
    paddingHorizontal: spacing[2.5],
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginTop: spacing[1],
    borderWidth: 0.5,
    borderColor: colors.clay[400],
  },
  eyebrowText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: 9,
    color: colors.sand[200],
    letterSpacing: 1.5,
  },
  ringSection: {
    alignItems: 'center',
    marginVertical: spacing[1.5],
  },
  ringWrapper: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontFamily: fontFamily.spectral.medium,
    fontSize: fontSize.xl,
    color: colors.sand[50],
    lineHeight: 26,
  },
  scoreLabel: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: 8,
    color: colors.sage[300],
    letterSpacing: 1.5,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2A22',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
    gap: spacing[1.5],
    marginTop: spacing[2],
    borderWidth: 1,
    borderColor: '#2F4335',
  },
  streakText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.xs,
    color: colors.sand[100],
  },
  pillarsContainer: {
    backgroundColor: 'rgba(15, 22, 17, 0.7)',
    borderRadius: radius.md,
    padding: spacing[2.5],
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: spacing[1.5],
    marginVertical: spacing[1],
  },
  pillarsTitle: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: 9,
    color: colors.clay[300],
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  pillarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  pillarIconBox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: '#1A271E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarContent: {
    flex: 1,
  },
  pillarName: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: 9,
    color: colors.ink[300],
    letterSpacing: 0.5,
  },
  pillarStatus: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.xs,
    color: colors.sand[100],
  },
  footer: {
    alignItems: 'center',
    gap: 3,
    marginTop: spacing[1],
  },
  quoteText: {
    fontFamily: fontFamily.spectral.regularItalic,
    fontSize: fontSize.xs,
    color: colors.sand[300],
    textAlign: 'center',
  },
  footerMeta: {
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'center',
  },
  userNameText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.xs,
    color: colors.clay[300],
  },
  dateText: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: 9,
    color: colors.ink[400],
  },
  websiteTag: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: 9,
    color: colors.sage[400],
    letterSpacing: 2,
  },
});
