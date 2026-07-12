import React, { useState } from 'react';
import {
  Pressable, SafeAreaView, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import {
  Flame, Leaf, Apple, Moon, Zap, ChevronLeft,
} from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';
import { Button } from '../components/Button';

const GOALS = [
  {
    id: 'balance',
    icon: Leaf,
    title: 'Équilibre global',
    desc: 'Mieux manger, bouger régulièrement et retrouver de l\'énergie au quotidien.',
    color: colors.sage[500],
    bg: colors.sage[100],
  },
  {
    id: 'weight',
    icon: Flame,
    title: 'Perte de poids',
    desc: 'Atteindre ton poids de forme durablement, sans restriction extrême.',
    color: colors.clay[500],
    bg: colors.clay[100],
  },
  {
    id: 'nutrition',
    icon: Apple,
    title: 'Alimentation saine',
    desc: 'Apprendre à cuisiner équilibré et comprendre les bases de la nutrition.',
    color: colors.status.success,
    bg: colors.status.successSoft,
  },
  {
    id: 'performance',
    icon: Zap,
    title: 'Performance sportive',
    desc: 'Vélo route, demi-marathon, marathon, triathlon, Ironman — un plan structuré pour ta discipline.',
    color: colors.info[600],
    bg: colors.info[50],
  },
  {
    id: 'sleep',
    icon: Moon,
    title: 'Récupération & sommeil',
    desc: 'Optimiser ton repos pour te sentir reposé·e et moins stressé·e.',
    color: colors.ink[600],
    bg: colors.sand[200],
  },
] as const;

type GoalId = typeof GOALS[number]['id'];

const SPORT_DISCIPLINES = [
  { id: 'velo-route',   label: '🚴 Vélo de route' },
  { id: 'course-pied',  label: '🏃 Course à pied' },
  { id: 'triathlon',    label: '🏊 Triathlon' },
  { id: 'natation',     label: '🌊 Natation' },
  { id: 'ski-alpin',    label: '⛷️ Ski alpin / Rando' },
  { id: 'autre',        label: '🏅 Autre sport' },
] as const;

type SportId = typeof SPORT_DISCIPLINES[number]['id'];

interface Props {
  onBack: () => void;
  onContinue: (goalId: GoalId, sportDiscipline?: string) => void;
}

export const OnboardingGoalScreen: React.FC<Props> = ({ onBack, onContinue }) => {
  const [selected,    setSelected]    = useState<GoalId | null>(null);
  const [sportPicked, setSportPicked] = useState<SportId | null>(null);

  const goal = GOALS.find(g => g.id === selected);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>

        <Pressable style={s.back} onPress={onBack} accessibilityRole="button">
          <ChevronLeft size={22} color={colors.ink[700]} strokeWidth={2} />
        </Pressable>

        {/* Progress */}
        <View style={s.stepsRow}>
          {['Compte','Objectif','Programme'].map((step, i) => (
            <View key={step} style={s.stepItem}>
              <View style={[s.stepDot, i === 1 && s.stepDotActive]}>
                <Text style={[s.stepNum, i === 1 && s.stepNumActive]}>{i + 1}</Text>
              </View>
              <Text style={[s.stepLabel, i === 1 && s.stepLabelActive]}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={s.header}>
          <Text style={s.title}>Quel est ton{'\n'}<Text style={s.titleItalic}>objectif principal ?</Text></Text>
          <Text style={s.sub}>Sélectionne ce qui résonne le plus avec toi. Tu pourras ajuster à tout moment.</Text>
        </View>

        <View style={s.goalsList}>
          {GOALS.map(g => {
            const isSelected = selected === g.id;
            const Icon = g.icon;
            return (
              <Pressable
                key={g.id}
                style={[s.goalCard, isSelected && { borderColor: g.color, borderWidth: 2 }]}
                onPress={() => setSelected(g.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={[s.goalIcon, { backgroundColor: g.bg }]}>
                  <Icon size={22} color={g.color} strokeWidth={1.8} />
                </View>
                <View style={s.goalText}>
                  <Text style={[s.goalTitle, isSelected && { color: g.color }]}>{g.title}</Text>
                  <Text style={s.goalDesc}>{g.desc}</Text>
                </View>
                <View style={[s.radio, isSelected && { borderColor: g.color }]}>
                  {isSelected && <View style={[s.radioDot, { backgroundColor: g.color }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Sélecteur de discipline — affiché uniquement pour "Performance sportive" */}
        {selected === 'performance' && (
          <View style={s.disciplineBox}>
            <Text style={s.disciplineTitle}>Quelle est ta discipline ?</Text>
            <Text style={s.disciplineSub}>Choisis celle qui correspond à ton entraînement principal.</Text>
            <View style={s.chipsRow}>
              {SPORT_DISCIPLINES.map(d => {
                const isSel = sportPicked === d.id;
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => setSportPicked(d.id)}
                    style={[s.chip, isSel && s.chipSelected]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSel }}
                  >
                    <Text style={[s.chipText, isSel && s.chipTextSelected]}>{d.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {selected && goal && selected !== 'performance' && (
          <View style={[s.hint, { backgroundColor: goal.bg }]}>
            <Text style={[s.hintText, { color: goal.color }]}>
              ✓ Super choix — on va construire un programme {goal.title.toLowerCase()} sur-mesure pour toi.
            </Text>
          </View>
        )}

        {selected === 'performance' && sportPicked && (
          <View style={[s.hint, { backgroundColor: GOALS.find(g => g.id === 'performance')!.bg }]}>
            <Text style={[s.hintText, { color: GOALS.find(g => g.id === 'performance')!.color }]}>
              ✓ Programme{' '}
              {SPORT_DISCIPLINES.find(d => d.id === sportPicked)?.label ?? ''}{' '}
              sur-mesure — c'est parti !
            </Text>
          </View>
        )}

        <Button
          variant="primary"
          size="lg"
          label="Continuer"
          fullWidth
          disabled={!selected || (selected === 'performance' && !sportPicked)}
          onPress={() => {
            if (!selected) return;
            const discipline = selected === 'performance' && sportPicked
              ? SPORT_DISCIPLINES.find(d => d.id === sportPicked)?.label
              : undefined;
            onContinue(selected, discipline);
          }}
        />

      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:   { flex:1, backgroundColor:colors.sand[50] },
  scroll: { flexGrow:1, paddingHorizontal:spacing[6], paddingBottom:spacing[12], paddingTop:spacing[4] },
  back:   { width:40, height:40, borderRadius:20, backgroundColor:colors.ink[100], alignItems:'center', justifyContent:'center', marginBottom:spacing[6] },

  stepsRow: { flexDirection:'row', gap:spacing[6], marginBottom:spacing[8], alignItems:'center' },
  stepItem: { alignItems:'center', gap:spacing[1] },
  stepDot:  { width:28, height:28, borderRadius:14, backgroundColor:colors.ink[100], alignItems:'center', justifyContent:'center' },
  stepDotActive: { backgroundColor:colors.sage[500] },
  stepNum:  { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[400] },
  stepNumActive: { color:'#fff' },
  stepLabel: { fontFamily:fontFamily.hanken.regular, fontSize:10, color:colors.ink[400], textTransform:'uppercase', letterSpacing:0.5 },
  stepLabelActive: { fontFamily:fontFamily.hanken.semiBold, color:colors.sage[600] },

  header: { marginBottom:spacing[6], gap:spacing[2] },
  title:  { fontFamily:fontFamily.spectral.regular, fontSize:fontSize['3xl'], color:colors.ink[900], lineHeight:fontSize['3xl']*lineHeight.snug },
  titleItalic: { fontFamily:fontFamily.spectral.mediumItalic, color:colors.sage[500] },
  sub:    { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.base, color:colors.ink[600], lineHeight:fontSize.base*lineHeight.relaxed },

  goalsList: { gap:spacing[3], marginBottom:spacing[5] },
  goalCard: {
    flexDirection:'row', alignItems:'center', gap:spacing[4],
    padding:spacing[4], borderRadius:radius.lg,
    backgroundColor:'#fff', borderWidth:1.5, borderColor:colors.ink[200],
    ...shadows.sm,
  },
  goalIcon: { width:44, height:44, borderRadius:22, alignItems:'center', justifyContent:'center' },
  goalText: { flex:1, gap:2 },
  goalTitle:{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.ink[900] },
  goalDesc: { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[600], lineHeight:fontSize.sm*lineHeight.relaxed },
  radio:    { width:20, height:20, borderRadius:10, borderWidth:2, borderColor:colors.ink[300], alignItems:'center', justifyContent:'center' },
  radioDot: { width:10, height:10, borderRadius:5 },

  hint:     { borderRadius:radius.md, padding:spacing[4], marginBottom:spacing[5] },
  hintText: { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, lineHeight:fontSize.sm*lineHeight.relaxed },

  disciplineBox: {
    backgroundColor: colors.info[50], borderRadius:radius.lg,
    padding:spacing[4], marginBottom:spacing[4], gap:spacing[3],
    borderWidth:1, borderColor:colors.info[100],
  },
  disciplineTitle: { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.ink[900] },
  disciplineSub:   { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[600] },
  chipsRow: { flexDirection:'row', flexWrap:'wrap', gap:spacing[2] },
  chip: {
    paddingHorizontal:spacing[3], paddingVertical:spacing[2],
    borderRadius:radius.pill, borderWidth:1.5, borderColor:colors.ink[300],
    backgroundColor:'#fff',
  },
  chipSelected: { backgroundColor:colors.info[600], borderColor:colors.info[600] },
  chipText:         { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.ink[700] },
  chipTextSelected: { color:'#fff' },
});

export default OnboardingGoalScreen;
