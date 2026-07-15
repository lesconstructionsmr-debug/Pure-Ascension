import React, { useState } from 'react';
import {
  SafeAreaView, ScrollView, StyleSheet,
  Text, View, Pressable,
} from 'react-native';
import {
  Sun, Wind, Eye, Droplet, Heart, Check, Plus, Minus, Info, Sparkles
} from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';

type Habit = {
  id: string; icon: React.ElementType; title: string; desc: string;
  color: string; bg: string;
  tag: string;
};

const ANTI_INFLAM_HABITS: Habit[] = [
  {
    id: 'h1', icon: Sun, title: 'Exposition Lumière Naturelle',
    color: '#e2a13b', bg: '#fdf8f0',
    tag: 'Matin · 10 min',
    desc: 'Exposition solaire directe dès le réveil pour caler l\'horloge biologique et sécréter l\'hormone du dynamisme.'
  },
  {
    id: 'h2', icon: Heart, title: 'Thérapie par le Froid',
    color: '#3498db', bg: '#ecf0f1',
    tag: 'Douche · 30s à 2 min',
    desc: 'Terminer la douche par un jet d\'eau froide pour stimuler le système parasympathique et réduire l\'inflammation.'
  },
  {
    id: 'h3', icon: Wind, title: 'Respiration 4-7-8',
    color: colors.sage[600], bg: colors.sage[50],
    tag: 'Calme · 2x par jour',
    desc: 'Inspire 4s, retiens 7s, expire 8s. Idéal pour inhiber la réponse de stress aiguë du cortisol.'
  },
  {
    id: 'h4', icon: Eye, title: 'Coupure Écrans',
    color: colors.clay[500], bg: colors.clay[100],
    tag: 'Soir · 1 heure avant',
    desc: 'Coupure stricte de tous les écrans avant le sommeil pour préserver la sécrétion naturelle de mélatonine.'
  },
  {
    id: 'h5', icon: Wind, title: 'Qualité de l\'Air Intérieur',
    color: colors.info[500], bg: colors.info[50],
    tag: 'Maison · 10 min',
    desc: 'Aérer vos pièces de vie 10 minutes par jour pour évacuer les perturbateurs chimiques et rafraîchir l\'oxygène.'
  }
];

export const EquilibreScreen: React.FC = () => {
  const [completedHabits, setCompletedHabits] = useState<Set<string>>(new Set());
  const [waterMl, setWaterMl] = useState<number>(0);
  const [masticationDone, setMasticationDone] = useState(false);

  const toggleHabit = (id: string) => {
    setCompletedHabits(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const adjustWater = (amount: number) => {
    setWaterMl(prev => Math.max(0, Math.min(4000, prev + amount)));
  };

  const doneCount = completedHabits.size + (masticationDone ? 1 : 0) + (waterMl >= 3000 ? 1 : 0);
  const totalCount = ANTI_INFLAM_HABITS.length + 2; // +1 mastication +1 eau

  const waterPct = Math.min(100, Math.round((waterMl / 3000) * 100));

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={st.header}>
          <Text style={st.headerTitle}>Équilibre & Vitalité</Text>
          <Text style={st.headerSub}>Optimisation du microbiote et réduction de l'inflammation.</Text>
        </View>

        {/* Global Progress card */}
        <View style={st.summaryCard}>
          <View style={st.summaryTop}>
            <Text style={st.summaryHeading}>Score Anti-Inflammatoire</Text>
            <Text style={st.summaryCount}>{doneCount}/{totalCount}</Text>
          </View>
          <View style={st.progressTrack}>
            <View style={[st.progressFill, { width: `${(doneCount / totalCount) * 100}%` as any }]} />
          </View>
          <Text style={st.summaryCaption}>
            {doneCount === totalCount
              ? '✨ Parfait ! Équilibre gastro-intestinal et hormonal optimal.'
              : `${totalCount - doneCount} rituel${totalCount - doneCount > 1 ? 's' : ''} restant${totalCount - doneCount > 1 ? 's' : ''} pour aujourd'hui.`}
          </Text>
        </View>

        {/* Water tracker widget */}
        <View style={st.widgetCard}>
          <View style={st.widgetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
              <Droplet size={20} color="#3498db" />
              <View>
                <Text style={st.widgetTitle}>Hydratation & Transit</Text>
                <Text style={st.widgetSub}>Objectif minimum : 3,0 Litres par jour</Text>
              </View>
            </View>
            <Text style={st.waterProgressText}>{waterMl / 1000} L / 3 L</Text>
          </View>

          <View style={st.waterBarTrack}>
            <View style={[st.waterBarFill, { width: `${waterPct}%` as any }]} />
          </View>

          <View style={st.waterBtns}>
            <Pressable onPress={() => adjustWater(-250)} style={st.waterBtn} accessibilityRole="button">
              <Minus size={16} color={colors.ink[600]} />
              <Text style={st.waterBtnLabel}>-250 ml</Text>
            </Pressable>
            <Pressable onPress={() => adjustWater(250)} style={[st.waterBtn, st.waterBtnAdd]} accessibilityRole="button">
              <Plus size={16} color="#fff" />
              <Text style={[st.waterBtnLabel, { color: '#fff' }]}>+250 ml</Text>
            </Pressable>
          </View>

          <Text style={st.waterHintText}>
            💧 Hydratation optimale essentielle pour lubrifier le transit et éliminer les toxines du foie.
          </Text>
        </View>

        {/* Mastication reminder widget */}
        <View style={[st.widgetCard, masticationDone && st.widgetCardDone]}>
          <View style={st.widgetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], flex: 1 }}>
              <Info size={20} color={colors.sage[600]} />
              <View style={{ flex: 1 }}>
                <Text style={st.widgetTitle}>Mastication Parasympathique</Text>
                <Text style={st.widgetSub}>20 à 30 mastications par bouchée</Text>
              </View>
            </View>
            <Pressable
              onPress={() => setMasticationDone(!masticationDone)}
              style={[st.checkCircleBtn, masticationDone && st.checkCircleBtnActive]}
            >
              {masticationDone ? <Check size={14} color="#fff" /> : null}
            </Pressable>
          </View>
          <Text style={st.masticationDesc}>
            Mâcher lentement, en état de calme (sans écrans), permet d'activer le système nerveux parasympathique indispensable pour sécréter les sucs et enzymes gastriques. Évite les fermentations et ballonnements.
          </Text>
        </View>

        {/* Anti-inflam habits list */}
        <Text style={st.sectionHeading}>Les 5 Leviers Anti-Inflammatoires</Text>
        <View style={{ gap: spacing[3], marginBottom: 40 }}>
          {ANTI_INFLAM_HABITS.map(habit => {
            const isDone = completedHabits.has(habit.id);
            const Icon = habit.icon;
            return (
              <Pressable
                key={habit.id}
                onPress={() => toggleHabit(habit.id)}
                style={[st.habitCard, isDone && st.habitCardDone]}
              >
                <View style={[st.habitIconWrap, { backgroundColor: isDone ? habit.color : habit.bg }]}>
                  <Icon size={20} color={isDone ? '#fff' : habit.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.habitTag}>{habit.tag}</Text>
                  <Text style={[st.habitTitle, isDone && st.habitTitleDone]}>{habit.title}</Text>
                  <Text style={st.habitDesc}>{habit.desc}</Text>
                </View>
                <View style={[st.checkCircleBtn, isDone && { backgroundColor: habit.color, borderColor: habit.color }]}>
                  {isDone ? <Check size={14} color="#fff" /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.sand[50] },
  scroll: { paddingHorizontal: spacing[5], paddingTop: spacing[6] },
  header: { marginBottom: spacing[6], gap: spacing[1] },
  headerTitle: { fontFamily: fontFamily.spectral.regular, fontSize: fontSize['3xl'], color: colors.ink[900] },
  headerSub: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[600], lineHeight: 18 },

  summaryCard: { backgroundColor: colors.sage[800], borderRadius: radius.xl, padding: spacing[5], marginBottom: spacing[5], gap: spacing[3] },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryHeading: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.base, color: '#fff' },
  summaryCount: { fontFamily: fontFamily.spectral.medium, fontSize: fontSize['2xl'], color: colors.sage[300] },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.sage[700], overflow: 'hidden' },
  progressFill: { height: '100%' as any, borderRadius: 3, backgroundColor: colors.sage[400] },
  summaryCaption: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.sage[200], lineHeight: 16 },

  widgetCard: {
    backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing[4],
    borderWidth: 1.5, borderColor: colors.ink[200], gap: spacing[3],
    marginBottom: spacing[4], ...shadows.sm
  },
  widgetCardDone: { borderColor: colors.sage[200], backgroundColor: colors.sage[50] },
  widgetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  widgetTitle: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.ink[900] },
  widgetSub: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500], marginTop: 2 },
  waterProgressText: { fontFamily: fontFamily.spectral.bold, fontSize: fontSize.base, color: '#3498db' },
  waterBarTrack: { height: 8, borderRadius: 4, backgroundColor: colors.ink[100], overflow: 'hidden' },
  waterBarFill: { height: '100%', borderRadius: 4, backgroundColor: '#3498db' },
  waterBtns: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[1] },
  waterBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 40, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.ink[200],
    backgroundColor: '#fff'
  },
  waterBtnAdd: { backgroundColor: '#3498db', borderColor: '#3498db' },
  waterBtnLabel: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.xs, color: colors.ink[700] },
  waterHintText: { fontFamily: fontFamily.hanken.regular, fontSize: 11, color: colors.ink[500], lineHeight: 16, marginTop: 2 },

  checkCircleBtn: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.ink[300], alignItems: 'center', justifyContent: 'center' },
  checkCircleBtnActive: { backgroundColor: colors.sage[500], borderColor: colors.sage[500] },
  masticationDesc: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.sm, color: colors.ink[600], lineHeight: 20 },

  sectionHeading: { fontFamily: fontFamily.spectral.bold, fontSize: fontSize.lg, color: colors.ink[900], marginTop: spacing[3], marginBottom: spacing[4] },
  habitCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[4],
    backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing[4],
    borderWidth: 1.5, borderColor: colors.ink[200], ...shadows.sm
  },
  habitCardDone: { opacity: 0.8 },
  habitIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  habitTag: { fontFamily: fontFamily.hanken.bold, fontSize: 10, color: colors.ink[400], textTransform: 'uppercase', letterSpacing: 0.5 },
  habitTitle: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: colors.ink[900], marginTop: 2 },
  habitTitleDone: { textDecorationLine: 'line-through', color: colors.ink[400] },
  habitDesc: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[600], lineHeight: 16, marginTop: 4 }
});

export default EquilibreScreen;
