/**
 * SlidePreview — mini-aperçus natifs des écrans de l'app, affichés dans les
 * slides d'onboarding à la place d'icônes. Reconstruits pixel-près depuis les
 * vrais écrans (quiz / génération / dashboard) : nets à toute résolution,
 * aucun asset image, aucune animation continue.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Leaf } from 'lucide-react-native';
import { colors, fontFamily, fontSize, spacing, radius, shadows } from '../theme/theme';

export type PreviewVariant = 'quiz' | 'generation' | 'dashboard';

/* Cadre commun : une "capture" d'écran de l'app dans une carte arrondie. */
const Frame: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark }) => (
  <View style={[st.frame, dark && { backgroundColor: colors.sage[800] }]}>{children}</View>
);

/* ── 1. Quiz : barre de progression + question + options ── */
const QuizPreview = () => (
  <Frame>
    <View style={st.statusBar}>
      <View style={st.dotBack} />
      <View style={st.progressTrack}><View style={[st.progressFill, { width: '40%' }]} /></View>
    </View>
    <Text style={st.qStep}>QUESTION 2 SUR 11</Text>
    <Text style={st.qTitle}>Ton objectif ?</Text>
    <View style={[st.opt, st.optActive]}>
      <View style={{ flex: 1 }}>
        <Text style={[st.optLabel, { color: colors.sage[600] }]}>Perte de gras</Text>
      </View>
      <View style={st.radioOn}><View style={st.radioDot} /></View>
    </View>
    <View style={st.opt}>
      <Text style={st.optLabel}>Prise de masse</Text>
      <View style={st.radioOff} />
    </View>
    <View style={st.opt}>
      <Text style={st.optLabel}>Remise en forme</Text>
      <View style={st.radioOff} />
    </View>
  </Frame>
);

/* ── 2. Génération : logo + message + barre + % ── */
const GenerationPreview = () => (
  <Frame dark>
    <View style={st.genLogoWrap}>
      <View style={st.genLogoInner}>
        <Leaf size={22} color={colors.sage[300]} strokeWidth={1.3} />
      </View>
    </View>
    <Text style={st.genBrand}>Pure Ascension</Text>
    <View style={st.genBarTrack}><View style={[st.genBarFill, { width: '62%' }]} /></View>
    <Text style={st.genMsg}>Calcul de tes macros personnalisés…</Text>
    <Text style={st.genPct}>62 %</Text>
  </Frame>
);

/* ── 3. Dashboard : carte programme + 3 anneaux ── */
const Ring: React.FC<{ pct: number; color: string; label: string }> = ({ pct, color, label }) => (
  <View style={st.ringItem}>
    <View style={[st.ring, { borderColor: colors.ink[100] }]}>
      <View style={[st.ringArc, { borderColor: color, transform: [{ rotate: `${pct * 3.6}deg` }] }]} />
      <Text style={st.ringPct}>{pct}%</Text>
    </View>
    <Text style={st.ringLabel}>{label}</Text>
  </View>
);

const DashboardPreview = () => (
  <Frame>
    <View style={st.progCard}>
      <Text style={st.progEyebrow}>PROGRAMME FAT BURNER PRO</Text>
      <Text style={st.progTitle}>Semaine 1 sur 8</Text>
      <View style={st.progBarTrack}><View style={[st.progBarFill, { width: '18%' }]} /></View>
    </View>
    <Text style={st.sectionLabel}>Aujourd'hui</Text>
    <View style={st.ringsCard}>
      <Ring pct={75} color={colors.sage[500]} label="Nutrition" />
      <Ring pct={50} color={colors.clay[500]} label="Séance" />
      <Ring pct={90} color={colors.status.info} label="Eau" />
    </View>
  </Frame>
);

export const SlidePreview: React.FC<{ variant: PreviewVariant }> = ({ variant }) => {
  if (variant === 'generation') return <GenerationPreview />;
  if (variant === 'dashboard')  return <DashboardPreview />;
  return <QuizPreview />;
};

const st = StyleSheet.create({
  frame: {
    width: 220, backgroundColor: colors.sand[50],
    borderRadius: radius.xl, padding: spacing[4], gap: spacing[3],
    ...shadows.lg,
  },

  /* Quiz */
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  dotBack: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.ink[100] },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.ink[100], overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: colors.sage[500] },
  qStep: { fontFamily: fontFamily.hanken.semiBold, fontSize: 8, color: colors.ink[400], letterSpacing: 1 },
  qTitle: { fontFamily: fontFamily.spectral.medium, fontSize: fontSize.md, color: colors.ink[900], marginBottom: spacing[1] },
  opt: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.ink[200],
    paddingHorizontal: spacing[3], paddingVertical: spacing[2] + 2,
  },
  optActive: { borderColor: colors.sage[500], borderWidth: 2, backgroundColor: colors.sage[50] },
  optLabel: { flex: 1, fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.xs, color: colors.ink[800] },
  radioOn:  { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.sage[500], alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.sage[500] },
  radioOff: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.ink[300] },

  /* Generation */
  genLogoWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  genLogoInner: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  genBrand: { fontFamily: fontFamily.spectral.regular, fontSize: fontSize.sm, color: colors.sage[300], textAlign: 'center' },
  genBarTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', marginTop: spacing[2] },
  genBarFill: { height: 5, borderRadius: 3, backgroundColor: colors.sage[400] },
  genMsg: { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.xs, color: '#fff', textAlign: 'center' },
  genPct: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.lg, color: colors.sage[300], textAlign: 'center' },

  /* Dashboard */
  progCard: { backgroundColor: colors.sage[800], borderRadius: radius.lg, padding: spacing[3], gap: spacing[2] },
  progEyebrow: { fontFamily: fontFamily.hanken.semiBold, fontSize: 7, color: colors.clay[300], letterSpacing: 0.8 },
  progTitle: { fontFamily: fontFamily.spectral.regular, fontSize: fontSize.sm, color: '#fff' },
  progBarTrack: { height: 4, borderRadius: 2, backgroundColor: colors.sage[700], overflow: 'hidden' },
  progBarFill: { height: 4, borderRadius: 2, backgroundColor: colors.clay[300] },
  sectionLabel: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.xs, color: colors.ink[900] },
  ringsCard: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', borderRadius: radius.lg, paddingVertical: spacing[3], ...shadows.sm },
  ringItem: { alignItems: 'center', gap: spacing[1] },
  ring: { width: 40, height: 40, borderRadius: 20, borderWidth: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ringArc: { position: 'absolute', top: -4, left: -4, width: 40, height: 40, borderRadius: 20, borderWidth: 4, borderLeftColor: 'transparent', borderBottomColor: 'transparent' },
  ringPct: { fontFamily: fontFamily.hanken.semiBold, fontSize: 8, color: colors.ink[900] },
  ringLabel: { fontFamily: fontFamily.hanken.regular, fontSize: 8, color: colors.ink[600] },
});

export default SlidePreview;
