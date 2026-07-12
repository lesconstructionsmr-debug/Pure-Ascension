import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check, Plus, Trash2 } from 'lucide-react-native';
import * as Haptics from '../utils/haptics';
import { colors, fontFamily, fontSize, lineHeight, letterSpacing, spacing, radius, shadows } from '../theme/theme';
import { Card } from '../components/Card';
import { Ring } from '../components/Ring';
import { mockMealDay, WEEKDAYS, formatNumber, type Meal } from '../data';
import { useDailyProgress } from '../context/DailyProgressContext';
import { useCalorie } from '../context/CalorieContext';
import { AddFoodModal } from '../components/AddFoodModal';

const ML = [{ key:'proteins' as const, label:'P', color:colors.sage[500] }, { key:'carbs' as const, label:'G', color:colors.clay[500] }, { key:'fats' as const, label:'L', color:colors.status.info }];

const MealRow: React.FC<{meal:Meal;onToggle:(id:string)=>void;onPress:(id:string)=>void}> = ({meal,onToggle,onPress}) => (
  <Pressable onPress={()=>onPress(meal.id)} style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:spacing[4], gap:spacing[3] }}>
    <View style={{ flexDirection:'row', alignItems:'center', gap:spacing[3], flex:1 }}>
      <Pressable onPress={()=>onToggle(meal.id)} accessibilityRole="checkbox" accessibilityState={{checked:meal.done}}
        style={[{ width:36, height:36, borderRadius:18, borderWidth:1.5, borderColor:colors.ink[200], alignItems:'center', justifyContent:'center', backgroundColor:colors.white }, meal.done&&{ backgroundColor:colors.sage[500], borderColor:colors.sage[500] }]}>
        {meal.done ? <Check size={14} color={colors.white} strokeWidth={2.5} /> : <Plus size={14} color={colors.ink[500]} strokeWidth={2} />}
      </Pressable>
      <View>
        <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:meal.done?colors.ink[500]:colors.ink[900], textDecorationLine:meal.done?'line-through':'none' }}>{meal.name}</Text>
        <Text style={{ fontFamily:fontFamily.hanken.regular,  fontSize:fontSize.xs,   color:colors.ink[600] }}>{meal.time}</Text>
      </View>
    </View>
    <View style={{ alignItems:'flex-end', gap:spacing[1] }}>
      <View style={{ flexDirection:'row', gap:spacing[2] }}>
        {ML.map(({key,label,color})=>(
          <View key={key} style={{ flexDirection:'row', alignItems:'center', gap:spacing[0.5] }}>
            <View style={{ width:5, height:5, borderRadius:3, backgroundColor:color }} />
            <Text style={{ fontFamily:fontFamily.hanken.regular, fontSize:8, color:colors.ink[600] }}>{label} {meal.macros[key]}g</Text>
          </View>
        ))}
      </View>
      <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[900] }}>{meal.calories} kcal</Text>
    </View>
  </Pressable>
);

export const MealsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const today = new Date().getDay();
  const [activeDay, setActiveDay] = useState(today===0?6:today-1);
  const [meals, setMeals] = useState<Meal[]>(mockMealDay.meals);
  const [modalOpen, setModalOpen] = useState(false);
  const { checkMeal, uncheckMeal } = useDailyProgress();
  const { totalKcal, goalKcal, remainingKcal, pct, totalProteins, totalCarbs, totalFats, entries, removeEntry } = useCalorie();

  const handleToggle = (id: string) => {
    const meal = meals.find(m => m.id === id);
    if (!meal) return;
    const nextDone = !meal.done;
    setMeals(p => p.map(m => m.id === id ? { ...m, done: nextDone } : m));
    if (nextDone) {
      checkMeal(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      uncheckMeal(id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const overGoal = totalKcal > goalKcal;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
          <Text style={s.screenTitle} accessibilityRole="header">Repas</Text>
          <Pressable style={s.addFab} onPress={() => setModalOpen(true)} accessibilityRole="button">
            <Plus size={18} color="#fff" strokeWidth={2.5} />
            <Text style={s.addFabLabel}>Ajouter</Text>
          </Pressable>
        </View>

        {/* ── Calorie tracker card ── */}
        <View style={[s.trackerCard, overGoal && s.trackerCardOver]}>
          <View style={s.trackerTop}>
            <View style={{ flex: 1, gap: spacing[1] }}>
              <Text style={s.trackerEyebrow}>CALORIES DU JOUR</Text>
              <Text style={s.trackerMain}>
                {formatNumber(totalKcal)}{' '}
                <Text style={s.trackerGoal}>/ {formatNumber(goalKcal)} kcal</Text>
              </Text>
              <Text style={[s.trackerRemaining, overGoal && { color: colors.status.danger }]}>
                {overGoal
                  ? `+${formatNumber(totalKcal - goalKcal)} kcal au-dessus de l'objectif`
                  : `${formatNumber(remainingKcal)} kcal restantes`}
              </Text>
            </View>
            <Ring
              value={Math.min(pct, 100)}
              size={80}
              strokeWidth={8}
              fillColor={overGoal ? colors.status.danger : colors.clay[500]}
              label={`${pct}%`}
            />
          </View>

          {/* Barre de progression */}
          <View style={s.trackerTrack}>
            <View style={[
              s.trackerFill,
              { width: `${Math.min(pct, 100)}%` as any },
              overGoal && { backgroundColor: colors.status.danger },
            ]} />
          </View>

          {/* Macros totaux */}
          <View style={s.macroRow}>
            {[
              { label:'Prot.', val: totalProteins, color: colors.sage[400] },
              { label:'Gluc.', val: totalCarbs,    color: colors.clay[400] },
              { label:'Lip.',  val: totalFats,     color: colors.info[500] },
            ].map(m => (
              <View key={m.label} style={s.macroItem}>
                <View style={[s.macroDot, { backgroundColor: m.color }]} />
                <Text style={s.macroLabel}>{m.label}</Text>
                <Text style={s.macroVal}>{Math.round(m.val)}g</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Entrées journalières ── */}
        {entries.length > 0 && (
          <View style={{ gap: spacing[3] }}>
            <Text style={s.sectionTitle}>Aujourd'hui · {entries.length} entrée{entries.length > 1 ? 's' : ''}</Text>
            <View style={s.entriesCard}>
              {entries.map((entry, idx) => (
                <View key={entry.id}>
                  <View style={s.entryRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.entryName}>{entry.name}</Text>
                      <Text style={s.entryTime}>{entry.time} · P {entry.proteins}g · G {entry.carbs}g · L {entry.fats}g</Text>
                    </View>
                    <Text style={s.entryKcal}>{entry.kcal} kcal</Text>
                    <Pressable
                      onPress={() => removeEntry(entry.id)}
                      style={s.deleteBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Supprimer"
                    >
                      <Trash2 size={14} color={colors.ink[400]} strokeWidth={1.8} />
                    </Pressable>
                  </View>
                  {idx < entries.length - 1 && <View style={s.divider} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {entries.length === 0 && (
          <Pressable style={s.emptyTracker} onPress={() => setModalOpen(true)}>
            <Plus size={22} color={colors.clay[400]} strokeWidth={1.8} />
            <Text style={s.emptyTrackerText}>Ajouter ton premier aliment</Text>
          </Pressable>
        )}

        {/* ── Séparateur ── */}
        <View style={{ height: 1, backgroundColor: colors.ink[200] }} />

        {/* ── Repas suggérés (plan) ── */}
        <View style={s.weekBand}>
          {WEEKDAYS.map((d,i)=>(
            <Pressable key={i} onPress={()=>setActiveDay(i)} accessibilityRole="button" accessibilityState={{selected:i===activeDay}}
              style={[s.dayBtn, i===activeDay&&s.dayBtnActive]}>
              <Text style={[s.dayText, i===activeDay&&s.dayTextActive]}>{d}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ gap:spacing[3] }}>
          <Text style={s.sectionTitle}>Plan de la journée</Text>
          <Card elevation="sm" padding={0} style={{ overflow:'hidden' }}>
            {[...meals].sort((a,b)=>a.order-b.order).map((meal,idx,arr)=>(
              <View key={meal.id}>
                <MealRow
                  meal={meal}
                  onToggle={handleToggle}
                  onPress={id=>navigation?.navigate('MealDetail', { mealId:id })}
                />
                {idx<arr.length-1 && <View style={{ height:1, backgroundColor:colors.ink[200], marginHorizontal:spacing[4] }} />}
              </View>
            ))}
          </Card>
        </View>

        <View style={{ height:spacing[10] }} />
      </ScrollView>

      <AddFoodModal visible={modalOpen} onClose={() => setModalOpen(false)} />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:    { flex:1, backgroundColor:colors.sand[50] },
  scroll:  { flex:1 },
  content: { paddingHorizontal:spacing[5], paddingTop:spacing[6], gap:spacing[5] },
  screenTitle: { fontFamily:fontFamily.spectral.medium, fontSize:fontSize['3xl'], color:colors.ink[900] },

  addFab:      { flexDirection:'row', alignItems:'center', gap:spacing[2], backgroundColor:colors.clay[500], borderRadius:radius.pill, paddingHorizontal:spacing[4], paddingVertical:spacing[2] },
  addFabLabel: { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:'#fff' },

  trackerCard:     { backgroundColor:colors.clay[800], borderRadius:radius.xl, padding:spacing[5], gap:spacing[4] },
  trackerCardOver: { backgroundColor:'#5c1a0e' },
  trackerTop:      { flexDirection:'row', alignItems:'center' },
  trackerEyebrow:  { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.xs, color:colors.clay[300], letterSpacing:0.6 },
  trackerMain:     { fontFamily:fontFamily.spectral.medium, fontSize:fontSize['2xl'], color:'#fff', lineHeight:fontSize['2xl']*lineHeight.snug },
  trackerGoal:     { fontFamily:fontFamily.spectral.regular, fontSize:fontSize.lg, color:colors.clay[300] },
  trackerRemaining:{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.clay[200] },
  trackerTrack:    { height:6, borderRadius:3, backgroundColor:colors.clay[700], overflow:'hidden' },
  trackerFill:     { height:'100%' as any, borderRadius:3, backgroundColor:colors.clay[400] },

  macroRow:  { flexDirection:'row', justifyContent:'space-between' },
  macroItem: { flexDirection:'row', alignItems:'center', gap:spacing[1.5] },
  macroDot:  { width:8, height:8, borderRadius:4 },
  macroLabel:{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.clay[200] },
  macroVal:  { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.xs, color:'#fff' },

  sectionTitle: { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.md, color:colors.ink[900] },

  entriesCard: { backgroundColor:'#fff', borderRadius:radius.xl, overflow:'hidden', ...shadows.sm },
  entryRow:    { flexDirection:'row', alignItems:'center', gap:spacing[3], paddingHorizontal:spacing[4], paddingVertical:spacing[3] },
  entryName:   { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[900] },
  entryTime:   { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500], marginTop:2 },
  entryKcal:   { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.clay[600] },
  deleteBtn:   { width:30, height:30, borderRadius:15, backgroundColor:colors.ink[100], alignItems:'center', justifyContent:'center' },
  divider:     { height:1, backgroundColor:colors.ink[100], marginHorizontal:spacing[4] },

  emptyTracker: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:spacing[3], padding:spacing[5], borderRadius:radius.xl, borderWidth:2, borderColor:colors.clay[200], borderStyle:'dashed' },
  emptyTrackerText: { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.clay[500] },

  weekBand:    { flexDirection:'row', justifyContent:'space-between', backgroundColor:colors.sand[100], borderRadius:radius.card, padding:spacing[1] },
  dayBtn:      { flex:1, alignItems:'center', paddingVertical:spacing[2], borderRadius:radius.xl, minHeight:40, justifyContent:'center' },
  dayBtnActive:{ backgroundColor:colors.sage[500] },
  dayText:     { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[600] },
  dayTextActive:{ color:colors.white },
});
export default MealsScreen;
