/**
 * ProgramGenerationScreen
 * Animation de chargement pendant la "génération" du programme.
 * Dure ~3,5 secondes puis appelle onDone().
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Leaf } from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius } from '../theme/theme';
import { UserProfile } from '../data';

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface Props {
  profile: UserProfile;
  onDone: () => void;
}

/* ─── Messages affichés pendant le chargement ───────────────────────────── */
const STEPS = [
  { pct: 0,   label: 'Analyse de ton profil…' },
  { pct: 18,  label: 'Calcul de tes besoins caloriques…' },
  { pct: 35,  label: 'Création de ton plan repas…' },
  { pct: 52,  label: 'Génération de tes séances…' },
  { pct: 68,  label: 'Adaptation à ton niveau…' },
  { pct: 82,  label: 'Personnalisation des recettes…' },
  { pct: 95,  label: 'Finalisation du programme…' },
  { pct: 100, label: 'Ton programme est prêt ✦' },
];

const TOTAL_MS = 3600; // durée totale

/* ─── Component ──────────────────────────────────────────────────────────── */
export const ProgramGenerationScreen: React.FC<Props> = ({ profile, onDone }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const fadeIn   = useRef(new Animated.Value(0)).current;
  const labelFade = useRef(new Animated.Value(1)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;

  // Fade-in global au montage
  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1, duration: 500, useNativeDriver: true,
    }).start();
  }, []);

  // Pulsation de l'icône
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(iconPulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Progression de la barre + messages
  useEffect(() => {
    let cancelled = false;

    const runStep = (idx: number) => {
      if (cancelled || idx >= STEPS.length) return;

      const step    = STEPS[idx];
      const nextPct = STEPS[idx + 1]?.pct ?? 100;
      const duration = (nextPct - step.pct) / 100 * TOTAL_MS;

      // Fade out label actuel, swap, fade in nouveau
      Animated.timing(labelFade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        if (cancelled) return;
        setStepIdx(idx);
        Animated.timing(labelFade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      });

      // Animate la barre jusqu'au prochain point
      Animated.timing(progress, {
        toValue: nextPct / 100,
        duration,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (!finished || cancelled) return;
        if (idx + 1 < STEPS.length) {
          runStep(idx + 1);
        } else {
          // Terminé — attendre un instant puis appeler onDone
          setTimeout(() => { if (!cancelled) onDone(); }, 600);
        }
      });
    };

    runStep(0);
    return () => { cancelled = true; };
  }, []);

  const goalLabel: Record<UserProfile['mainGoal'], string> = {
    muscle: 'Gain musculaire',
    gras:   'Perte de gras',
    tone:   'Tonification',
    force:  'Force & puissance',
  };

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const currentStep = STEPS[stepIdx];

  return (
    <SafeAreaView style={st.safe}>
      <Animated.View style={[st.container, { opacity: fadeIn }]}>

        {/* Logo / icon animé */}
        <View style={st.topArea}>
          <Animated.View style={[st.iconWrap, { transform: [{ scale: iconPulse }] }]}>
            <View style={st.iconInner}>
              <Leaf size={36} color={colors.sage[300]} strokeWidth={1.2} />
            </View>
          </Animated.View>
          <Text style={st.brandName}>Pure Ascension</Text>
        </View>

        {/* Titre principal */}
        <View style={st.centerArea}>
          <Text style={st.title}>
            On crée ton{'\n'}
            <Text style={st.titleItalic}>programme</Text>
          </Text>
          <Text style={st.subtitle}>
            Objectif : {goalLabel[profile.mainGoal]} · {profile.frequency}×/semaine
          </Text>
        </View>

        {/* Barre de progression */}
        <View style={st.progressArea}>
          <View style={st.progressTrack}>
            <Animated.View style={[st.progressFill, { width: barWidth }]} />
          </View>

          {/* Message courant */}
          <Animated.Text style={[st.stepLabel, { opacity: labelFade }]}>
            {currentStep.label}
          </Animated.Text>

          {/* Pourcentage */}
          <Animated.Text style={st.pctLabel}>
            {STEPS[stepIdx].pct} %
          </Animated.Text>
        </View>

        {/* Dots décoratifs */}
        <View style={st.dotsRow}>
          {[0, 1, 2, 3, 4, 5, 6].map(i => (
            <View
              key={i}
              style={[
                st.dot,
                i <= stepIdx ? st.dotActive : st.dotInactive,
              ]}
            />
          ))}
        </View>

      </Animated.View>
    </SafeAreaView>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.sage[800],
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[12],
    paddingBottom: spacing[10],
    justifyContent: 'space-between',
  },

  topArea: {
    alignItems: 'center',
    gap: spacing[4],
  },
  iconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconInner: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  brandName: {
    fontFamily: fontFamily.spectral.regular,
    fontSize: fontSize.lg,
    color: colors.sage[300],
    letterSpacing: 0.5,
  },

  centerArea: {
    alignItems: 'center',
    gap: spacing[3],
  },
  title: {
    fontFamily: fontFamily.spectral.regular,
    fontSize: fontSize['3xl'],
    color: '#fff',
    textAlign: 'center',
    lineHeight: fontSize['3xl'] * lineHeight.snug,
  },
  titleItalic: {
    fontFamily: fontFamily.spectral.mediumItalic,
    color: colors.sage[300],
  },
  subtitle: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.sm,
    color: colors.sage[400],
    textAlign: 'center',
  },

  progressArea: {
    gap: spacing[3],
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.sage[400],
    borderRadius: radius.pill,
  },
  stepLabel: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.sm,
    color: '#fff',
    textAlign: 'center',
  },
  pctLabel: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize['2xl'],
    color: colors.sage[300],
    textAlign: 'center',
  },

  dotsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 6, borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.sage[400],
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});

export default ProgramGenerationScreen;
