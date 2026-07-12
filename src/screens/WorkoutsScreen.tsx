import React, { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check, Dumbbell } from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing } from '../theme/theme';
import { Badge }    from '../components/Badge';
import { Button }   from '../components/Button';
import { Card }     from '../components/Card';
import { Progress } from '../components/Progress';
import { type Exercise } from '../data';
import { EmptyState } from '../components/EmptyState';
import { useProgramStore } from '../store/useProgramStore';
import { getTodaySession } from '../services/programService';

const Hero: React.FC = () => (
  <View style={{ width:'100%', height:220, backgroundColor:colors.sage[800], alignItems:'center', justifyContent:'center', gap:spacing[2] }}>
    <Dumbbell size={36} color={colors.sage[300]} strokeWidth={1.5} />
    <Text style={{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.sage[400], letterSpacing:0.5 }}>Photo de la séance</Text>
  </View>
);

const ExRow: React.FC<{ex:Exercise;onToggle:(id:string)=>void}> = ({ex,onToggle}) => (
  <Pressable onPress={()=>onToggle(ex.id)} accessibilityRole="checkbox" accessibilityState={{checked:ex.done}}
    style={{ flexDirection:'row', alignItems:'center', padding:spacing[4], gap:spacing[3], minHeight:52 }}>
    <View style={[{ width:28, height:28, borderRadius:14, borderWidth:1.5, borderColor:colors.ink[200], alignItems:'center', justifyContent:'center', backgroundColor:colors.white }, ex.done&&{ backgroundColor:colors.sage[500], borderColor:colors.sage[500] }]}>
      {ex.done && <Check size={13} color={colors.white} strokeWidth={2.5} />}
    </View>
    <Text style={{ flex:1, fontFamily:fontFamily.hanken.medium, fontSize:fontSize.base, color:ex.done?colors.ink[500]:colors.ink[900], textDecorationLine:ex.done?'line-through':'none' }}>{ex.name}</Text>
    <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[600], minWidth:52, textAlign:'right' }}>{ex.sets}×{ex.reps}</Text>
  </Pressable>
);

export const WorkoutsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const program          = useProgramStore(s => s.program);
  const setActiveSession = useProgramStore(s => s.setActiveSession);
  const today   = program ? getTodaySession(program) : null;
  const session = today?.session ?? null;
  const [exercises, setExercises] = useState<Exercise[]>(session?.exercises ?? []);

  // Aucun programme réel → jamais de données factices
  if (!program || !today || !session) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={{ flex:1, justifyContent:'center', paddingHorizontal:spacing[5] }}>
          <EmptyState
            title="Aucune séance trouvée"
            message="Complète ton diagnostic pour recevoir ton plan d'entraînement personnalisé."
          />
        </View>
      </SafeAreaView>
    );
  }

  const done=exercises.filter(e=>e.done).length, total=exercises.length;
  const pct=total>0?Math.round((done/total)*100):0;
  const toggle=(id:string)=>setExercises(p=>p.map(e=>e.id===id?{...e,done:!e.done}:e));
  const startSession = () => {
    setActiveSession(session.id);
    navigation?.navigate('ActiveWorkout');
  };
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Hero />
        <View style={s.inner}>
          <Card elevation="sm" padding={spacing[5]}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:spacing[3], marginBottom:spacing[3] }}>
              <Badge label={today.isToday ? 'Séance du jour' : session.day ?? 'À venir'} variant="clay" />
              <Text style={{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[600] }}>{session.duration} min · {session.exerciseCount} exercices</Text>
            </View>
            <Text style={{ fontFamily:fontFamily.spectral.medium, fontSize:fontSize.xl, color:colors.ink[900], lineHeight:fontSize.xl*lineHeight.snug, marginBottom:spacing[5] }} accessibilityRole="header">{session.title}</Text>
            <View style={{ gap:spacing[2] }}>
              <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                <Text style={{ fontFamily:fontFamily.hanken.medium,   fontSize:fontSize.sm, color:colors.ink[600] }}>Progression</Text>
                <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.sage[600] }}>{done}/{total}</Text>
              </View>
              <Progress value={pct} fillColor={colors.sage[500]} trackColor={colors.sage[100]} height={8} />
            </View>
          </Card>
          <View style={{ gap:spacing[3] }}>
            <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.md, color:colors.ink[900] }}>Exercices</Text>
            <Card elevation="sm" padding={0} style={{ overflow:'hidden' }}>
              {exercises.map((ex,idx,arr)=>(
                <View key={ex.id}>
                  <ExRow ex={ex} onToggle={toggle} />
                  {idx<arr.length-1 && <View style={{ height:1, backgroundColor:colors.ink[200], marginHorizontal:spacing[4] }} />}
                </View>
              ))}
            </Card>
          </View>
          <Button variant="accent" size="lg" label="Continuer la séance" fullWidth onPress={startSession} />
          <View style={{ height:spacing[10] }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:    { flex:1, backgroundColor:colors.sand[50] },
  scroll:  { flex:1 },
  content: { paddingBottom:spacing[10] },
  inner:   { paddingHorizontal:spacing[5], paddingTop:spacing[5], gap:spacing[5] },
});
export default WorkoutsScreen;
