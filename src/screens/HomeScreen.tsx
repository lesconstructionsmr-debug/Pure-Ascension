import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, Platform } from 'react-native';
import { Activity, ChevronRight, Droplets, Plus, Minus } from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, letterSpacing, spacing } from '../theme/theme';
import { Avatar }   from '../components/Avatar';
import { Badge }    from '../components/Badge';
import { Card }     from '../components/Card';
import { Progress } from '../components/Progress';
import { Ring }     from '../components/Ring';
import { useDailyProgress } from '../context/DailyProgressContext';
import { useStreak } from '../hooks/useStreak';
import { FeedbackButton } from '../components/FeedbackButton';
import { EmptyState } from '../components/EmptyState';
import { useProgramStore } from '../store/useProgramStore';
import { getProgramProgress, getTodaySession } from '../services/programService';

function getGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Bon matin, ${name} ☀️`;
  if (h < 17) return `Bonne séance, ${name} 💪`;
  if (h < 21) return `Belle soirée, ${name} 🌙`;
  return `Bonne nuit, ${name} 🌿`;
}

const Eyebrow: React.FC<{children:string}> = ({children}) => (
  <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.clay[500], letterSpacing:letterSpacing.eyebrow, textTransform:'uppercase' }}>{children}</Text>
);

const SectionHeader: React.FC<{title:string;action?:string;onAction?:()=>void}> = ({title,action,onAction}) => (
  <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
    <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.md, color:colors.ink[900] }}>{title}</Text>
    {action && <Pressable onPress={onAction} hitSlop={12} accessibilityRole="button"><Text style={{ fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.sage[600] }}>{action}</Text></Pressable>}
  </View>
);

const RingItem: React.FC<{label:string;sublabel:string;value:number;fill:string;ringLabel:string}> = ({label,sublabel,value,fill,ringLabel}) => (
  <View style={{ alignItems:'center', gap:spacing[1.5], flex:1 }}>
    <Ring value={value} size={72} strokeWidth={7} fillColor={fill} label={ringLabel} />
    <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.xs, color:colors.ink[900], textAlign:'center' }}>{label}</Text>
    <Text style={{ fontFamily:fontFamily.hanken.regular,  fontSize:fontSize.xs, color:colors.ink[600], textAlign:'center' }}>{sublabel}</Text>
  </View>
);

export const HomeScreen: React.FC<{ userName?: string }> = ({ userName }) => {
  const program = useProgramStore(s => s.program);
  const { mealsPct, mealsCount, workoutPct, waterPct, waterGlasses, addWater, removeWater } = useDailyProgress();
  const { streak } = useStreak();

  const displayName = userName || 'toi';
  const greeting    = getGreeting(displayName);

  // Aucun programme réel → jamais de données factices
  if (!program) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={{ flex:1, justifyContent:'center', paddingHorizontal:spacing[5] }}>
          <EmptyState />
        </View>
      </SafeAreaView>
    );
  }

  const progress = getProgramProgress(program);
  const today    = getTodaySession(program);
  const displayProgram = {
    eyebrow: `PROGRAMME ${program.name.toUpperCase()}`,
    currentDay: progress.day,
    currentWeek: progress.week,
    totalWeeks: progress.totalWeeks,
    tagline: progress.week === 1 ? 'on démarre !' : 'tu avances bien.',
    completionPct: progress.completionPct,
  };

  return (
    <View style={{ flex:1 }}>
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View style={{ flex:1, marginRight:spacing[4] }}>
            <Text style={s.greeting} accessibilityRole="header">{greeting}</Text>
            <Text style={s.subgreeting}>
              {streak > 1 ? `🔥 ${streak} jours de série` : progress.day <= 1 ? 'Bienvenue ! C\'est parti 🌿' : 'Voici ton tableau de bord.'}
            </Text>
          </View>
          <Avatar name={displayName} size={44} ring />
        </View>

        {/* Programme card */}
        <Card dark elevation="md" padding={spacing[6]}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:spacing[3] }}>
            <Eyebrow>{displayProgram.eyebrow}</Eyebrow>
            <Badge label={`Jour ${displayProgram.currentDay}`} variant="solid" />
          </View>
          <Text style={s.programTitle}>
            Semaine {displayProgram.currentWeek} sur {displayProgram.totalWeeks} —{' '}
            <Text style={s.programTitleItalic}>{displayProgram.tagline}</Text>
          </Text>
          <Progress value={displayProgram.completionPct} fillColor={colors.clay[300]} trackColor={colors.sage[700]} height={6} style={{ marginBottom:spacing[2] }} />
          <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
            <Text style={{ fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.sage[300] }}>{displayProgram.completionPct} % complété</Text>
            <Text style={{ fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.sand[200] }}>{streak} jour{streak !== 1 ? 's' : ''} de série 🔥</Text>
          </View>
        </Card>

        {/* Aujourd'hui */}
        <SectionHeader title="Aujourd'hui" />
        <Card elevation="sm" padding={spacing[5]}>
          <View style={{ flexDirection:'row', justifyContent:'space-around', alignItems:'center' }}>
            <RingItem label="Nutrition"    sublabel={`${mealsCount}/3 repas`}              value={mealsPct}   fill={colors.sage[500]}   ringLabel={`${mealsPct}%`} />
            <View style={{ width:1, height:72, backgroundColor:colors.ink[200] }} />
            <RingItem label="Entraînement" sublabel={workoutPct === 100 ? 'Complété ✓' : '0/1 séance'} value={workoutPct}  fill={colors.clay[500]}   ringLabel={`${workoutPct}%`} />
            <View style={{ width:1, height:72, backgroundColor:colors.ink[200] }} />
            <RingItem label="Hydratation"  sublabel={`${waterGlasses}/8 verres`}           value={waterPct}   fill={colors.status.info} ringLabel={`${waterPct}%`} />
          </View>
          {/* Compteur eau rapide */}
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:spacing[4], marginTop:spacing[4], paddingTop:spacing[4], borderTopWidth:1, borderTopColor:colors.ink[100] }}>
            <Pressable onPress={removeWater} style={{ width:32, height:32, borderRadius:16, backgroundColor:colors.ink[100], alignItems:'center', justifyContent:'center' }}>
              <Minus size={14} color={colors.ink[600]} strokeWidth={2.5} />
            </Pressable>
            <View style={{ flexDirection:'row', alignItems:'center', gap:spacing[2] }}>
              <Droplets size={16} color={colors.status.info} strokeWidth={2} />
              <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[900] }}>{waterGlasses} verre{waterGlasses !== 1 ? 's' : ''} d'eau</Text>
            </View>
            <Pressable onPress={addWater} style={{ width:32, height:32, borderRadius:16, backgroundColor:colors.sage[100], alignItems:'center', justifyContent:'center' }}>
              <Plus size={14} color={colors.sage[600]} strokeWidth={2.5} />
            </Pressable>
          </View>
        </Card>

        {/* Prochaine séance */}
        {today && (
          <>
            <SectionHeader title={today.isToday ? 'Séance du jour' : 'Prochaine séance'} />
            <Pressable onPress={()=>{}} accessibilityRole="button">
              <Card elevation="sm" padding={spacing[5]}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:spacing[4] }}>
                  <View style={{ width:44, height:44, borderRadius:22, backgroundColor:colors.clay[100], alignItems:'center', justifyContent:'center' }}>
                    <Activity size={20} color={colors.clay[500]} strokeWidth={2} />
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.ink[900], marginBottom:spacing[0.5] }}>{today.session.title}</Text>
                    <Text style={{ fontFamily:fontFamily.hanken.regular,  fontSize:fontSize.sm,   color:colors.ink[600] }}>{today.session.day} · {today.session.duration} min · {today.session.exerciseCount} exercices</Text>
                  </View>
                  <ChevronRight size={20} color={colors.ink[500]} strokeWidth={2} />
                </View>
              </Card>
            </Pressable>
          </>
        )}

        <View style={{ height:spacing[10] }} />
      </ScrollView>
    </SafeAreaView>
    <FeedbackButton />
    </View>
  );
};

const s = StyleSheet.create({
  safe:    { flex:1, backgroundColor:colors.sand[50] },
  scroll:  { flex:1 },
  content: { paddingHorizontal:spacing[5], paddingTop:spacing[6], gap:spacing[4] },
  header:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:spacing[2] },
  greeting:        { fontFamily:fontFamily.spectral.regular,      fontSize:fontSize['2xl'], color:colors.ink[900], lineHeight:fontSize['2xl']*lineHeight.snug },
  greetingName:    { fontFamily:fontFamily.spectral.mediumItalic, color:colors.sage[600] },
  subgreeting:     { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[600], marginTop:spacing[0.5] },
  programTitle:       { fontFamily:fontFamily.spectral.regular,       fontSize:fontSize.xl, color:colors.sand[100], lineHeight:fontSize.xl*lineHeight.snug, marginBottom:spacing[5] },
  programTitleItalic: { fontFamily:fontFamily.spectral.regularItalic, color:colors.sand[50] },
});
export default HomeScreen;
