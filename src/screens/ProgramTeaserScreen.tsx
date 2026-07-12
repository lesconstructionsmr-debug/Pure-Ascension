/**
 * ProgramTeaserScreen — Étape 4 du tunnel.
 * Aperçu partiel du programme généré : les grandes lignes sont visibles
 * (nom, calories, fréquence), le détail (split + macros) est verrouillé.
 * Le signup arrive APRÈS que la valeur est perçue.
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import {
  CheckCircle2, Flame, Calendar, Clock, Lock, ArrowRight, Dumbbell, UtensilsCrossed,
} from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';
import type { GeneratedProgram } from '../services/programService';

interface Props {
  program:   GeneratedProgram;
  firstName: string;
  onSignup:  () => void;
  onLogin:   () => void;
}

const FadeIn: React.FC<{ delay: number; children: React.ReactNode }> = ({ delay, children }) => {
  const anim  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim,  { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity: anim, transform: [{ translateY: slide }] }}>{children}</Animated.View>;
};

export const ProgramTeaserScreen: React.FC<Props> = ({ program, firstName, onSignup, onLogin }) => {
  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <FadeIn delay={0}>
          <View style={st.hero}>
            <View style={st.heroBadge}>
              <CheckCircle2 size={16} color={colors.sage[300]} strokeWidth={2} />
              <Text style={st.heroBadgeText}>Programme créé</Text>
            </View>
            <Text style={st.heroTitle}>
              Ton programme personnalisé{'\n'}est prêt
              {firstName ? <Text style={st.heroName}>, {firstName}</Text> : null}.
            </Text>
            <Text style={st.heroSub}>
              <Text style={st.heroProgram}>{program.name}</Text> · {program.frequency}× par semaine
            </Text>
          </View>
        </FadeIn>

        {/* ── Stats visibles (la valeur) ── */}
        <FadeIn delay={120}>
          <View style={st.statsRow}>
            <View style={st.statCard}>
              <Flame size={20} color={colors.clay[500]} strokeWidth={1.8} />
              <Text style={st.statValue}>{program.calories}</Text>
              <Text style={st.statLabel}>kcal / jour</Text>
            </View>
            <View style={st.statDivider} />
            <View style={st.statCard}>
              <Calendar size={20} color={colors.sage[500]} strokeWidth={1.8} />
              <Text style={st.statValue}>{program.frequency}×</Text>
              <Text style={st.statLabel}>/ semaine</Text>
            </View>
            <View style={st.statDivider} />
            <View style={st.statCard}>
              <Clock size={20} color={colors.sage[500]} strokeWidth={1.8} />
              <Text style={st.statValue}>{program.sessionDuration}</Text>
              <Text style={st.statLabel}>min / séance</Text>
            </View>
          </View>
        </FadeIn>

        {/* ── Split entraînement (verrouillé) ── */}
        <FadeIn delay={220}>
          <View style={st.sectionHeader}>
            <Dumbbell size={18} color={colors.sage[500]} strokeWidth={2} />
            <Text style={st.sectionTitle}>Ton split d'entraînement</Text>
          </View>
          <View style={st.lockedCard}>
            <View style={st.lockedContent}>
              {program.sessions.slice(0, 4).map((s, i) => (
                <View key={s.id} style={[st.sessionRow, i > 0 && st.sessionRowBorder]}>
                  <View style={st.sessionNum}><Text style={st.sessionNumText}>{i + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.sessionDay}>{s.day}</Text>
                    <Text style={st.sessionTitle}>{s.title}</Text>
                  </View>
                  <Text style={st.sessionDur}>{s.duration} min</Text>
                </View>
              ))}
            </View>
            {/* Voile de verrouillage */}
            <View style={st.lockOverlay}>
              <View style={st.lockBadge}>
                <Lock size={16} color={colors.sage[700]} strokeWidth={2} />
                <Text style={st.lockText}>Débloqué avec ton compte</Text>
              </View>
            </View>
          </View>
        </FadeIn>

        {/* ── Macros (verrouillées) ── */}
        <FadeIn delay={320}>
          <View style={st.sectionHeader}>
            <UtensilsCrossed size={18} color={colors.sage[500]} strokeWidth={2} />
            <Text style={st.sectionTitle}>Tes macros personnalisées</Text>
          </View>
          <View style={st.lockedCard}>
            <View style={[st.lockedContent, st.macroRow]}>
              {[
                { label: 'Protéines', val: `${program.macros.protein} g` },
                { label: 'Glucides',  val: `${program.macros.carbs} g`  },
                { label: 'Lipides',   val: `${program.macros.fat} g`    },
              ].map(m => (
                <View key={m.label} style={st.macroItem}>
                  <Text style={st.macroVal}>{m.val}</Text>
                  <Text style={st.macroLabel}>{m.label}</Text>
                </View>
              ))}
            </View>
            <View style={st.lockOverlay}>
              <View style={st.lockBadge}>
                <Lock size={16} color={colors.sage[700]} strokeWidth={2} />
                <Text style={st.lockText}>Débloqué avec ton compte</Text>
              </View>
            </View>
          </View>
        </FadeIn>

        {/* ── CTA ── */}
        <FadeIn delay={420}>
          <View style={st.ctaArea}>
            <Pressable
              style={({ pressed }) => [st.ctaBtn, pressed && st.ctaBtnPressed]}
              onPress={onSignup}
              accessibilityRole="button"
              accessibilityLabel="Créer mon compte pour y accéder"
            >
              <Text style={st.ctaBtnText}>Créer mon compte pour y accéder</Text>
              <ArrowRight size={20} color="#fff" strokeWidth={2.2} />
            </Pressable>
            <Text style={st.ctaLegal}>Gratuit pendant la bêta · aucune carte requise</Text>
            <Pressable onPress={onLogin} style={st.loginLink} accessibilityRole="button">
              <Text style={st.loginText}>J'ai déjà un compte · <Text style={st.loginBold}>Se connecter</Text></Text>
            </Pressable>
          </View>
        </FadeIn>

        <View style={{ height: spacing[10] }} />
      </ScrollView>
    </SafeAreaView>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.sand[50] },
  scroll: { paddingHorizontal: spacing[5] },

  hero: {
    backgroundColor: colors.sage[800],
    marginHorizontal: -spacing[5],
    paddingHorizontal: spacing[6],
    paddingTop: spacing[10], paddingBottom: spacing[8],
    gap: spacing[3], marginBottom: spacing[6],
  },
  heroBadge:     { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  heroBadgeText: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.xs, color: colors.sage[300], letterSpacing: 1, textTransform: 'uppercase' },
  heroTitle: { fontFamily: fontFamily.spectral.regular, fontSize: fontSize['3xl'], color: '#fff', lineHeight: fontSize['3xl'] * lineHeight.snug },
  heroName:  { fontFamily: fontFamily.spectral.mediumItalic, color: colors.sage[300] },
  heroSub:   { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.base, color: colors.sage[400] },
  heroProgram: { fontFamily: fontFamily.hanken.semiBold, color: colors.sage[200] },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: radius.xl,
    padding: spacing[5], marginBottom: spacing[6],
    ...shadows.sm,
  },
  statCard:    { flex: 1, alignItems: 'center', gap: spacing[1] },
  statDivider: { width: 1, height: 48, backgroundColor: colors.ink[100] },
  statValue:   { fontFamily: fontFamily.spectral.medium, fontSize: fontSize.xl, color: colors.ink[900] },
  statLabel:   { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500] },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] },
  sectionTitle:  { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.base, color: colors.ink[900] },

  lockedCard: { borderRadius: radius.xl, overflow: 'hidden', marginBottom: spacing[6], position: 'relative', ...shadows.sm },
  lockedContent: { backgroundColor: '#fff', opacity: 0.45 },
  lockOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  lockBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    backgroundColor: colors.sage[100], borderRadius: radius.pill,
    paddingHorizontal: spacing[4], paddingVertical: spacing[2],
    borderWidth: 1, borderColor: colors.sage[200],
  },
  lockText: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.sage[700] },

  sessionRow:       { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  sessionRowBorder: { borderTopWidth: 1, borderTopColor: colors.ink[100] },
  sessionNum:     { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.sage[100], alignItems: 'center', justifyContent: 'center' },
  sessionNumText: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.sage[600] },
  sessionDay:   { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.ink[900] },
  sessionTitle: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500] },
  sessionDur:   { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.xs, color: colors.ink[500] },

  macroRow:   { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing[6] },
  macroItem:  { alignItems: 'center', gap: spacing[1] },
  macroVal:   { fontFamily: fontFamily.spectral.medium, fontSize: fontSize.xl, color: colors.ink[900] },
  macroLabel: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500] },

  ctaArea: { gap: spacing[3], paddingTop: spacing[2] },
  ctaBtn: {
    backgroundColor: colors.sage[500], borderRadius: radius.pill,
    paddingVertical: spacing[5],
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[3],
    ...shadows.md,
  },
  ctaBtnPressed: { backgroundColor: colors.sage[600], transform: [{ scale: 0.98 }] },
  ctaBtnText: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.md, color: '#fff' },
  ctaLegal: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500], textAlign: 'center' },

  loginLink: { alignItems: 'center', paddingVertical: spacing[2] },
  loginText: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[500] },
  loginBold: { fontFamily: fontFamily.hanken.semiBold, color: colors.sage[600] },
});

export default ProgramTeaserScreen;
