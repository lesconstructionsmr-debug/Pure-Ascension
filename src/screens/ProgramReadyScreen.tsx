/**
 * ProgramReadyScreen
 * Affiche le programme personnalisé généré à partir du profil utilisateur.
 * Nom du programme, objectif, fréquence, calories cibles, aperçu semaine 1,
 * split macros, et CTA "Commencer".
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  CheckCircle2, Dumbbell, UtensilsCrossed,
  Flame, Clock, Calendar, ChevronRight, Sparkles,
} from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';
import { UserProfile } from '../data';

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface Props {
  profile: UserProfile;
  onStart: () => void;
}

/* ─── Programme generator ────────────────────────────────────────────────── */

/** Nom du programme selon objectif + expérience */
function getProgramName(p: UserProfile): string {
  const names: Record<UserProfile['mainGoal'], Record<UserProfile['experience'], string>> = {
    muscle: { débutante: 'Force Fondation', intermédiaire: 'Force Avancée',    avancée: 'Force Élite'       },
    gras:   { débutante: 'Brûle & Sculpt',  intermédiaire: 'Métabolisme Actif', avancée: 'Fat Burner Pro'    },
    tone:   { débutante: 'Corps Léger',     intermédiaire: 'Corps Sculpté',     avancée: 'Corps Athlétique'  },
    force:  { débutante: 'Puissance I',     intermédiaire: 'Puissance II',      avancée: 'Puissance Élite'   },
  };
  return names[p.mainGoal][p.experience];
}

/** Calories cibles (simplifiées — sans âge exact) */
function getCalories(p: UserProfile): number {
  // BMR femme estimé (Mifflin-St Jeor, âge estimé 28 ans)
  const bmr = 10 * p.currentWeightKg + 6.25 * p.heightCm - 5 * 28 - 161;
  const activityFactor = p.frequency === 3 ? 1.375 : p.frequency === 4 ? 1.55 : 1.725;
  const tdee = bmr * activityFactor;
  const adjustments: Record<UserProfile['mainGoal'], number> = {
    muscle: 220, gras: -420, tone: -180, force: 150,
  };
  return Math.round((tdee + adjustments[p.mainGoal]) / 10) * 10;
}

/** Macros en grammes depuis les calories */
function getMacros(calories: number, goal: UserProfile['mainGoal']) {
  const splits: Record<UserProfile['mainGoal'], { p: number; c: number; f: number }> = {
    muscle: { p: 0.30, c: 0.45, f: 0.25 },
    gras:   { p: 0.35, c: 0.35, f: 0.30 },
    tone:   { p: 0.32, c: 0.40, f: 0.28 },
    force:  { p: 0.28, c: 0.48, f: 0.24 },
  };
  const s = splits[goal];
  return {
    protein: Math.round((calories * s.p) / 4),
    carbs:   Math.round((calories * s.c) / 4),
    fat:     Math.round((calories * s.f) / 9),
  };
}

/** Jours d'entraînement selon fréquence */
function getTrainingDays(freq: UserProfile['frequency']): string[] {
  const options = {
    3: ['Lundi', 'Mercredi', 'Vendredi'],
    4: ['Lundi', 'Mardi', 'Jeudi', 'Samedi'],
    5: ['Lundi', 'Mardi', 'Mercredi', 'Vendredi', 'Samedi'],
  };
  return options[freq];
}

/** Description de la séance selon objectif + jour */
function getSessionType(goal: UserProfile['mainGoal'], dayIdx: number): string {
  const types: Record<UserProfile['mainGoal'], string[]> = {
    muscle: ['Haut du corps — Push', 'Bas du corps', 'Haut du corps — Pull', 'Full Body', 'Cardio HIIT'],
    gras:   ['Circuit training', 'Cardio HIIT', 'Musculation métabolique', 'Cardio steady-state', 'Full Body brûle-graisses'],
    tone:   ['Fessiers & Abdos', 'Haut du corps léger', 'Circuit cardio', 'Bas du corps', 'Pilates fonctionnel'],
    force:  ['Squat & Deadlift', 'Bench & Rows', 'Overhead & Core', 'Squat volume', 'Accessoires & mobilité'],
  };
  const list = types[goal];
  return list[dayIdx % list.length];
}

const GOAL_LABELS: Record<UserProfile['mainGoal'], string> = {
  muscle: 'Gain musculaire',
  gras:   'Perte de gras',
  tone:   'Tonification',
  force:  'Force & puissance',
};

const EXPERIENCE_LABELS: Record<UserProfile['experience'], string> = {
  débutante:     'Débutant(e)',
  intermédiaire: 'Intermédiaire',
  avancée:       'Avancé(e)',
};

const GYM_LABELS: Record<UserProfile['gymAccess'], string> = {
  full:    'Salle complète',
  limited: 'Équipement limité',
  home:    'À la maison',
};

/* ─── Animated card ─────────────────────────────────────────────────────── */
const FadeCard: React.FC<{ delay: number; children: React.ReactNode; style?: object }> = ({ delay, children, style }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim,  { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity: anim, transform: [{ translateY: slide }] }, style]}>
      {children}
    </Animated.View>
  );
};

/* ─── Component ──────────────────────────────────────────────────────────── */
export const ProgramReadyScreen: React.FC<Props> = ({ profile, onStart }) => {
  const calories     = getCalories(profile);
  const macros       = getMacros(calories, profile.mainGoal);
  const programName  = getProgramName(profile);
  const trainingDays = getTrainingDays(profile.frequency);

  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero header ── */}
        <Animated.View style={[st.hero, { opacity: headerFade }]}>
          <View style={st.heroBadge}>
            <CheckCircle2 size={16} color={colors.sage[300]} strokeWidth={2} />
            <Text style={st.heroBadgeText}>Programme créé</Text>
          </View>
          <Text style={st.heroTitle}>
            <Text style={st.heroTitleItalic}>{programName}</Text>
            {'\n'}est prêt pour toi.
          </Text>
          <Text style={st.heroSub}>
            {GOAL_LABELS[profile.mainGoal]} · {EXPERIENCE_LABELS[profile.experience]} · {GYM_LABELS[profile.gymAccess]}
          </Text>
        </Animated.View>

        {/* ── Stats rapides ── */}
        <FadeCard delay={100} style={st.statsRow}>
          <View style={st.statCard}>
            <Flame size={20} color={colors.clay[500]} strokeWidth={1.8} />
            <Text style={st.statValue}>{calories}</Text>
            <Text style={st.statLabel}>kcal / jour</Text>
          </View>
          <View style={st.statDivider} />
          <View style={st.statCard}>
            <Calendar size={20} color={colors.sage[500]} strokeWidth={1.8} />
            <Text style={st.statValue}>{profile.frequency}×</Text>
            <Text style={st.statLabel}>/ semaine</Text>
          </View>
          <View style={st.statDivider} />
          <View style={st.statCard}>
            <Clock size={20} color={colors.sage[500]} strokeWidth={1.8} />
            <Text style={st.statValue}>{profile.sessionDuration}</Text>
            <Text style={st.statLabel}>min / séance</Text>
          </View>
        </FadeCard>

        {/* ── Macros ── */}
        <FadeCard delay={180}>
          <View style={st.sectionHeader}>
            <UtensilsCrossed size={18} color={colors.sage[500]} strokeWidth={2} />
            <Text style={st.sectionTitle}>Nutrition cible (jour)</Text>
          </View>
          <View style={st.macrosCard}>
            <View style={st.macroItem}>
              <View style={[st.macroBar, { backgroundColor: colors.clay[400], height: `${Math.round(macros.protein / (macros.protein + macros.carbs + macros.fat) * 100)}%` }]} />
              <Text style={st.macroValue}>{macros.protein}g</Text>
              <Text style={st.macroLabel}>Protéines</Text>
            </View>
            <View style={st.macroItem}>
              <View style={[st.macroBar, { backgroundColor: colors.sage[400], height: `${Math.round(macros.carbs / (macros.protein + macros.carbs + macros.fat) * 100)}%` }]} />
              <Text style={st.macroValue}>{macros.carbs}g</Text>
              <Text style={st.macroLabel}>Glucides</Text>
            </View>
            <View style={st.macroItem}>
              <View style={[st.macroBar, { backgroundColor: '#D4A84B', height: `${Math.round(macros.fat / (macros.protein + macros.carbs + macros.fat) * 100)}%` }]} />
              <Text style={st.macroValue}>{macros.fat}g</Text>
              <Text style={st.macroLabel}>Lipides</Text>
            </View>
            <View style={st.macroItem}>
              <View style={[st.macroBar, { backgroundColor: colors.ink[300], height: '100%' }]} />
              <Text style={st.macroValue}>{calories}</Text>
              <Text style={st.macroLabel}>kcal</Text>
            </View>
          </View>
        </FadeCard>

        {/* ── Semaine 1 ── */}
        <FadeCard delay={260}>
          <View style={st.sectionHeader}>
            <Dumbbell size={18} color={colors.sage[500]} strokeWidth={2} />
            <Text style={st.sectionTitle}>Semaine 1 — Aperçu</Text>
          </View>
          <View style={st.weekCard}>
            {['L', 'M', 'Me', 'J', 'V', 'S', 'D'].map((day, i) => {
              const isTraining = trainingDays.some(d => {
                const map: Record<string, string> = { Lundi:'L', Mardi:'M', Mercredi:'Me', Jeudi:'J', Vendredi:'V', Samedi:'S', Dimanche:'D' };
                return map[d] === day;
              });
              const dayIdx = trainingDays.indexOf(
                ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'][i]
              );

              return (
                <View key={day} style={[st.dayCol, isTraining && st.dayColActive]}>
                  <Text style={[st.dayLabel, isTraining && st.dayLabelActive]}>{day}</Text>
                  {isTraining
                    ? <View style={st.dayDot} />
                    : <View style={st.dayDotRest} />
                  }
                  <Text style={[st.dayStatus, isTraining ? st.dayStatusActive : st.dayStatusRest]}>
                    {isTraining ? '💪' : '😴'}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Liste des séances */}
          <View style={st.sessionsList}>
            {trainingDays.map((day, i) => (
              <View key={day} style={[st.sessionRow, i > 0 && st.sessionRowBorder]}>
                <View style={st.sessionLeft}>
                  <View style={st.sessionNumWrap}>
                    <Text style={st.sessionNum}>{i + 1}</Text>
                  </View>
                  <View>
                    <Text style={st.sessionDay}>{day}</Text>
                    <Text style={st.sessionType}>{getSessionType(profile.mainGoal, i)}</Text>
                  </View>
                </View>
                <View style={st.sessionRight}>
                  <Text style={st.sessionDuration}>{profile.sessionDuration} min</Text>
                  <ChevronRight size={14} color={colors.ink[400]} strokeWidth={2} />
                </View>
              </View>
            ))}
          </View>
        </FadeCard>

        {/* ── Restrictions alimentaires ── */}
        {profile.dietaryRestrictions.length > 0 && (
          <FadeCard delay={340}>
            <View style={st.tagsCard}>
              <Text style={st.tagsTitle}>Plan adapté à tes préférences</Text>
              <View style={st.tagsRow}>
                {profile.dietaryRestrictions.map(r => (
                  <View key={r} style={st.tag}>
                    <Text style={st.tagText}>{r}</Text>
                  </View>
                ))}
              </View>
            </View>
          </FadeCard>
        )}

        {/* ── Conditions santé ── */}
        {!!profile.healthConditions && (
          <FadeCard delay={380}>
            <View style={st.healthCard}>
              <Text style={st.healthTitle}>⚕️ Adapté à ta santé</Text>
              <Text style={st.healthText}>
                Programme ajusté pour tenir compte de : {profile.healthConditions}
              </Text>
            </View>
          </FadeCard>
        )}

        {/* ── CTA ── */}
        <FadeCard delay={440} style={st.ctaArea}>
          <Pressable
            style={({ pressed }) => [st.ctaBtn, pressed && st.ctaBtnPressed]}
            onPress={onStart}
            accessibilityRole="button"
            accessibilityLabel="Commencer mon programme"
          >
            <Sparkles size={20} color="#fff" strokeWidth={2} />
            <Text style={st.ctaBtnText}>Commencer mon programme</Text>
          </Pressable>
          <Text style={st.ctaLegal}>
            Programme renouvelé automatiquement toutes les 8 semaines selon tes progrès.
          </Text>
        </FadeCard>

        <View style={{ height: spacing[10] }} />
      </ScrollView>
    </SafeAreaView>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.sand[50] },
  scroll: { paddingHorizontal: spacing[5], paddingTop: 0 },

  /* Hero */
  hero: {
    backgroundColor: colors.sage[800],
    marginHorizontal: -spacing[5],
    paddingHorizontal: spacing[6],
    paddingTop: spacing[10],
    paddingBottom: spacing[8],
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
  },
  heroBadgeText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.xs, color: colors.sage[300],
    letterSpacing: 1, textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: fontFamily.spectral.regular,
    fontSize: fontSize['3xl'], color: '#fff',
    lineHeight: fontSize['3xl'] * lineHeight.snug,
  },
  heroTitleItalic: {
    fontFamily: fontFamily.spectral.mediumItalic,
    color: colors.sage[300],
  },
  heroSub: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.sm, color: colors.sage[400],
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: radius.xl,
    padding: spacing[5], marginBottom: spacing[5],
    ...shadows.sm,
  },
  statCard:  { flex: 1, alignItems: 'center', gap: spacing[1] },
  statDivider: { width: 1, height: 48, backgroundColor: colors.ink[100] },
  statValue: {
    fontFamily: fontFamily.spectral.medium,
    fontSize: fontSize.xl, color: colors.ink[900],
  },
  statLabel: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.xs, color: colors.ink[500],
  },

  /* Section header */
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.base, color: colors.ink[900],
  },

  /* Macros */
  macrosCard: {
    backgroundColor: '#fff', borderRadius: radius.xl,
    padding: spacing[5], flexDirection: 'row',
    alignItems: 'flex-end', gap: spacing[3],
    height: 140, marginBottom: spacing[6],
    ...shadows.sm,
  },
  macroItem: {
    flex: 1, alignItems: 'center', justifyContent: 'flex-end',
    height: '100%', gap: spacing[1],
  },
  macroBar: {
    width: 28, borderRadius: radius.sm,
    minHeight: 12,
  },
  macroValue: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.sm, color: colors.ink[900],
  },
  macroLabel: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: 10, color: colors.ink[500],
    textAlign: 'center',
  },

  /* Week grid */
  weekCard: {
    backgroundColor: '#fff', borderRadius: radius.xl,
    padding: spacing[4], flexDirection: 'row',
    justifyContent: 'space-around', marginBottom: spacing[3],
    ...shadows.sm,
  },
  dayCol: {
    alignItems: 'center', gap: spacing[1],
    paddingVertical: spacing[2], paddingHorizontal: spacing[1],
    borderRadius: radius.md, minWidth: 36,
  },
  dayColActive: {
    backgroundColor: colors.sage[50],
  },
  dayLabel: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.xs, color: colors.ink[400],
  },
  dayLabelActive: { color: colors.sage[600] },
  dayDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.sage[500] },
  dayDotRest: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink[200] },
  dayStatus:  { fontSize: 14 },
  dayStatusActive: {},
  dayStatusRest:   {},

  /* Sessions list */
  sessionsList: {
    backgroundColor: '#fff', borderRadius: radius.xl,
    overflow: 'hidden', marginBottom: spacing[6],
    ...shadows.sm,
  },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing[5], paddingVertical: spacing[4],
    justifyContent: 'space-between',
  },
  sessionRowBorder: { borderTopWidth: 1, borderTopColor: colors.ink[100] },
  sessionLeft:   { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 },
  sessionNumWrap:{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.sage[100], alignItems: 'center', justifyContent: 'center' },
  sessionNum:    { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.sage[600] },
  sessionDay:    { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.ink[900] },
  sessionType:   { fontFamily: fontFamily.hanken.regular,  fontSize: fontSize.xs, color: colors.ink[500] },
  sessionRight:  { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  sessionDuration:{ fontFamily: fontFamily.hanken.medium, fontSize: fontSize.xs, color: colors.ink[500] },

  /* Tags */
  tagsCard: {
    backgroundColor: colors.sage[50], borderRadius: radius.xl,
    padding: spacing[5], marginBottom: spacing[4], gap: spacing[3],
    borderWidth: 1, borderColor: colors.sage[200],
  },
  tagsTitle: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.sm, color: colors.sage[700],
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  tag: {
    backgroundColor: colors.sage[100],
    paddingHorizontal: spacing[3], paddingVertical: spacing[1],
    borderRadius: radius.pill,
  },
  tagText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.xs, color: colors.sage[700],
  },

  /* Health */
  healthCard: {
    backgroundColor: colors.clay[100] + '80', borderRadius: radius.xl,
    padding: spacing[5], marginBottom: spacing[4], gap: spacing[2],
    borderWidth: 1, borderColor: colors.clay[200],
  },
  healthTitle: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.sm, color: colors.clay[700],
  },
  healthText: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.sm, color: colors.clay[700], lineHeight: fontSize.sm * lineHeight.relaxed,
  },

  /* CTA */
  ctaArea: { gap: spacing[3], paddingTop: spacing[2] },
  ctaBtn: {
    backgroundColor: colors.sage[500],
    borderRadius: radius.pill, paddingVertical: spacing[5],
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[3],
    ...shadows.md,
  },
  ctaBtnPressed: { backgroundColor: colors.sage[600], transform: [{ scale: 0.98 }] },
  ctaBtnText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.lg, color: '#fff',
  },
  ctaLegal: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.xs, color: colors.ink[500],
    textAlign: 'center', lineHeight: fontSize.xs * lineHeight.relaxed,
  },
});

export default ProgramReadyScreen;
