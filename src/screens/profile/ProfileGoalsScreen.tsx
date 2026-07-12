import React, { useState } from 'react';
import {
  Pressable, SafeAreaView, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { ChevronLeft, Edit3, Target, Activity, Droplets, Moon, Compass } from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../../theme/theme';
import { Progress } from '../../components/Progress';
import { Button }   from '../../components/Button';

interface Props { onBack: () => void; isNewUser?: boolean; }

const EmptyGoals: React.FC = () => (
  <View style={{ flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:spacing[8], paddingVertical:spacing[12], gap:spacing[4] }}>
    <View style={{ width:72, height:72, borderRadius:36, backgroundColor:colors.clay[50], alignItems:'center', justifyContent:'center' }}>
      <Compass size={32} color={colors.clay[500]} strokeWidth={1.5} />
    </View>
    <Text style={{ fontFamily:fontFamily.spectral.medium, fontSize:fontSize.xl, color:colors.ink[900], textAlign:'center' }}>Tes objectifs arrivent</Text>
    <Text style={{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.base, color:colors.ink[500], textAlign:'center', lineHeight:fontSize.base*lineHeight.relaxed }}>
      Une fois ton premier programme démarré, tes objectifs personnels s'afficheront ici avec ton avancement en temps réel.
    </Text>
  </View>
);

const GOALS = [
  {
    icon: Target,
    label: 'Objectif poids',
    current: '68 kg',
    target: '63 kg',
    progress: 0.42,
    color: colors.clay[500],
    unit: 'kg',
    hint: '5 kg restants · ~12 semaines au rythme actuel',
  },
  {
    icon: Activity,
    label: 'Séances / semaine',
    current: '3',
    target: '4',
    progress: 0.75,
    color: colors.sage[500],
    unit: 'séances',
    hint: 'Tu es à 75% de ton objectif hebdomadaire',
  },
  {
    icon: Droplets,
    label: 'Hydratation quotidienne',
    current: '1.8 L',
    target: '2.5 L',
    progress: 0.72,
    color: colors.status.info,
    unit: 'litres',
    hint: '700 ml restants aujourd\'hui',
  },
  {
    icon: Moon,
    label: 'Sommeil',
    current: '6h45',
    target: '8h',
    progress: 0.84,
    color: colors.ink[600],
    unit: 'heures',
    hint: 'Tu t\'approches de ton objectif de sommeil',
  },
];

export const ProfileGoalsScreen: React.FC<Props> = ({ onBack, isNewUser = false }) => {
  const [editMode, setEditMode] = useState(false);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={onBack} accessibilityRole="button">
          <ChevronLeft size={22} color={colors.ink[700]} strokeWidth={2} />
        </Pressable>
        <Text style={s.title}>Mes objectifs</Text>
        <Pressable style={s.editBtn} onPress={() => setEditMode(e => !e)} accessibilityRole="button">
          <Edit3 size={18} color={editMode ? colors.sage[600] : colors.ink[600]} strokeWidth={2} />
        </Pressable>
      </View>

      {isNewUser ? <EmptyGoals /> : <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.subtitle}>
          Tes objectifs personnels avec ton avancement en temps réel.
        </Text>

        {GOALS.map((goal, i) => (
          <View key={i} style={s.goalCard}>
            <View style={s.goalTop}>
              <View style={[s.goalIcon, { backgroundColor: goal.color + '22' }]}>
                <goal.icon size={20} color={goal.color} strokeWidth={1.8} />
              </View>
              <View style={{ flex:1 }}>
                <Text style={s.goalLabel}>{goal.label}</Text>
                <View style={s.goalValues}>
                  <Text style={[s.goalCurrent, { color:goal.color }]}>{goal.current}</Text>
                  <Text style={s.goalSep}>/</Text>
                  <Text style={s.goalTarget}>{goal.target}</Text>
                </View>
              </View>
              <Text style={s.goalPercent}>{Math.round(goal.progress * 100)}%</Text>
            </View>
            <Progress value={goal.progress} fillColor={goal.color} trackColor={colors.ink[100]} height={6} />
            <Text style={s.goalHint}>{goal.hint}</Text>

            {editMode && (
              <View style={s.editRow}>
                <Button variant="soft" size="sm" label="Modifier l'objectif" onPress={() => {}} />
              </View>
            )}
          </View>
        ))}

        {/* Weekly recap */}
        <View style={s.weekCard}>
          <Text style={s.weekTitle}>Bilan de la semaine</Text>
          <View style={s.weekRow}>
            {['L','M','M','J','V','S','D'].map((day, i) => (
              <View key={i} style={s.weekDayCol}>
                <View style={[s.weekDot, i < 4 && s.weekDotActive, i === 3 && s.weekDotToday]} />
                <Text style={s.weekDay}>{day}</Text>
              </View>
            ))}
          </View>
          <Text style={s.weekCaption}>4 jours actifs sur 7 cette semaine · 🔥 4 jours de suite</Text>
        </View>

        <View style={{ height:40 }} />
      </ScrollView>}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:   { flex:1, backgroundColor:colors.sand[50] },
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:spacing[5], paddingVertical:spacing[4], borderBottomWidth:1, borderBottomColor:colors.ink[200] },
  backBtn:{ width:40, height:40, borderRadius:20, backgroundColor:colors.ink[100], alignItems:'center', justifyContent:'center' },
  editBtn:{ width:40, height:40, borderRadius:20, backgroundColor:colors.ink[100], alignItems:'center', justifyContent:'center' },
  title:  { flex:1, textAlign:'center', fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.lg, color:colors.ink[900] },

  scroll:   { paddingHorizontal:spacing[5], paddingTop:spacing[5] },
  subtitle: { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.base, color:colors.ink[600], marginBottom:spacing[6], lineHeight:fontSize.base*lineHeight.relaxed },

  goalCard:  { backgroundColor:'#fff', borderRadius:radius.xl, padding:spacing[5], marginBottom:spacing[4], gap:spacing[3], ...shadows.sm },
  goalTop:   { flexDirection:'row', alignItems:'center', gap:spacing[3] },
  goalIcon:  { width:44, height:44, borderRadius:22, alignItems:'center', justifyContent:'center' },
  goalLabel: { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.ink[500], marginBottom:2 },
  goalValues:{ flexDirection:'row', alignItems:'center', gap:spacing[2] },
  goalCurrent:{ fontFamily:fontFamily.hanken.bold, fontSize:fontSize.xl },
  goalSep:   { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.base, color:colors.ink[400] },
  goalTarget:{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.base, color:colors.ink[500] },
  goalPercent:{ fontFamily:fontFamily.hanken.bold, fontSize:fontSize.lg, color:colors.ink[400] },
  goalHint:  { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500] },
  editRow:   { borderTopWidth:1, borderTopColor:colors.ink[100], paddingTop:spacing[3] },

  weekCard:  { backgroundColor:'#fff', borderRadius:radius.xl, padding:spacing[5], gap:spacing[4], ...shadows.sm },
  weekTitle: { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.ink[900] },
  weekRow:   { flexDirection:'row', justifyContent:'space-between' },
  weekDayCol:{ alignItems:'center', gap:spacing[2] },
  weekDot:   { width:32, height:32, borderRadius:16, backgroundColor:colors.ink[100] },
  weekDotActive: { backgroundColor:colors.sage[400] },
  weekDotToday:  { backgroundColor:colors.sage[600] },
  weekDay:   { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500] },
  weekCaption:{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[600] },
});

export default ProfileGoalsScreen;
