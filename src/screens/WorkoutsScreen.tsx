import React, { useState, useEffect } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check, Dumbbell, Lock, Sparkles, ChevronRight, Activity, Calendar, Zap, Flame } from 'lucide-react-native';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';
import { Badge }    from '../components/Badge';
import { Button }   from '../components/Button';
import { Card }     from '../components/Card';
import { Progress } from '../components/Progress';
import { type Exercise } from '../data';
import Svg, { Path, Line, Circle, Rect } from 'react-native-svg';
import { EmptyState } from '../components/EmptyState';
import { useProgramStore } from '../store/useProgramStore';
import { getTodaySession, saveProgram } from '../services/programService';
import { auth } from '../services/firebase';

export function getMuscleGroup(name: string): { label: string; icon: string; bg: string; color: string } {
  const n = name.toLowerCase();
  if (n.includes('squat') || n.includes('fente') || n.includes('presse') || n.includes('leg') || n.includes('ischio') || n.includes('mollet') || n.includes('quad') || n.includes('fessier')) {
    return { label: 'Jambes', icon: 'legs', bg: '#EAF2EC', color: colors.sage[600] };
  }
  if (n.includes('développé') || n.includes('push-up') || n.includes('pompe') || n.includes('chest') || n.includes('dips') || n.includes('pec')) {
    return { label: 'Pectoraux', icon: 'push', bg: '#FCF2ED', color: colors.clay[500] };
  }
  if (n.includes('traction') || n.includes('tirage') || n.includes('rowing') || n.includes('lombaires') || n.includes('back') || n.includes('pull')) {
    return { label: 'Dos', icon: 'pull', bg: '#EEF7FB', color: '#4E7384' };
  }
  if (n.includes('biceps') || n.includes('triceps') || n.includes('curl') || n.includes('bras') || n.includes('shoulder') || n.includes('élévation') || n.includes('épaules') || n.includes('delto')) {
    return { label: 'Bras / Épaules', icon: 'arms', bg: '#F8F1FD', color: '#9C54D6' };
  }
  if (n.includes('gainage') || n.includes('crunch') || n.includes('abdo') || n.includes('core') || n.includes('planche') || n.includes('sit-up')) {
    return { label: 'Tronc / Abdominos', icon: 'core', bg: '#FDFCEB', color: '#D4A84B' };
  }
  return { label: 'Cardio / Général', icon: 'cardio', bg: '#F5F5F5', color: colors.ink[600] };
}

export const ExerciseImage: React.FC<{ name: string; size?: number }> = ({ name, size = 44 }) => {
  const group = getMuscleGroup(name);
  const color = group.color;
  const strokeWidth = 3.5;
  const n = name.toLowerCase();

  return (
    <View style={{
      width: size, height: size, borderRadius: radius.md,
      backgroundColor: group.bg, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: group.color + '22',
      overflow: 'hidden'
    }}>
      <Svg width={size * 0.8} height={size * 0.8} viewBox="0 0 100 100" fill="none">
        {(() => {
          // 1. HIP THRUST
          if (n.includes('thrust') || n.includes('fessier') || n.includes('pont')) {
            return (
              <>
                <Line x1="10" y1="80" x2="90" y2="80" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Rect x="15" y="60" width="18" height="20" rx="3" stroke={color} strokeWidth={strokeWidth} />
                <Circle cx="33" cy="50" r="5" stroke={color} strokeWidth={strokeWidth} />
                <Line x1="33" y1="55" x2="65" y2="55" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="65" y1="55" x2="78" y2="55" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="78" y1="55" x2="78" y2="80" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
              </>
            );
          }
          // 2. GAINAGE / PLANCHE
          if (n.includes('gainage') || n.includes('planche') || n.includes('plank')) {
            return (
              <>
                <Line x1="10" y1="80" x2="90" y2="80" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="20" y1="80" x2="30" y2="80" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="30" y1="80" x2="30" y2="60" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Circle cx="32" cy="48" r="5" stroke={color} strokeWidth={strokeWidth} />
                <Line x1="30" y1="60" x2="75" y2="60" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="75" y1="60" x2="85" y2="80" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
              </>
            );
          }
          // 3. SQUAT / FENTES
          if (n.includes('squat') || n.includes('fente') || n.includes('jambes') || n.includes('legs')) {
            return (
              <>
                <Line x1="10" y1="85" x2="90" y2="85" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Circle cx="50" cy="25" r="5" stroke={color} strokeWidth={strokeWidth} />
                <Line x1="50" y1="30" x2="45" y2="50" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="45" y1="50" x2="62" y2="60" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="62" y1="60" x2="58" y2="85" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="45" y1="40" x2="68" y2="40" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
              </>
            );
          }
          // 4. GOOD MORNING / DEADLIFT
          if (n.includes('good morning') || n.includes('deadlift') || n.includes('soulevé') || n.includes('ischio')) {
            return (
              <>
                <Line x1="10" y1="85" x2="90" y2="85" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="50" y1="85" x2="50" y2="58" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="50" y1="58" x2="28" y2="50" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Circle cx="20" cy="47" r="5" stroke={color} strokeWidth={strokeWidth} />
                <Line x1="38" y1="53" x2="38" y2="76" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Circle cx="38" cy="76" r="4" fill={color} />
              </>
            );
          }
          // 5. POMPES / PUSH-UP / DIPS
          if (n.includes('pompe') || n.includes('push-up') || n.includes('dips') || n.includes('développé') || n.includes('pec')) {
            return (
              <>
                <Line x1="10" y1="80" x2="90" y2="80" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="28" y1="80" x2="32" y2="68" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="32" y1="68" x2="42" y2="58" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Circle cx="36" cy="48" r="5" stroke={color} strokeWidth={strokeWidth} />
                <Line x1="42" y1="58" x2="78" y2="68" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="78" y1="68" x2="85" y2="80" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
              </>
            );
          }
          // 6. CARDIO / RUNNING
          if (n.includes('course') || n.includes('running') || n.includes('footing') || n.includes('vma') || n.includes('tempo') || n.includes('cardio') || n.includes('sortie')) {
            return (
              <>
                <Line x1="10" y1="85" x2="90" y2="85" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Circle cx="52" cy="24" r="5" stroke={color} strokeWidth={strokeWidth} />
                <Line x1="52" y1="29" x2="48" y2="52" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="48" y1="52" x2="65" y2="62" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="65" y1="62" x2="58" y2="85" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="48" y1="52" x2="34" y2="68" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="34" y1="68" x2="24" y2="78" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="50" y1="34" x2="62" y2="45" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
              </>
            );
          }
          // 7. TRACTION / PULL-UP / TIRAGE
          if (n.includes('traction') || n.includes('tirage') || n.includes('rowing') || n.includes('pull')) {
            return (
              <>
                <Line x1="20" y1="15" x2="80" y2="15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Circle cx="50" cy="38" r="5" stroke={color} strokeWidth={strokeWidth} />
                <Line x1="50" y1="43" x2="50" y2="68" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="50" y1="68" x2="42" y2="85" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="50" y1="68" x2="58" y2="85" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="50" y1="43" x2="38" y2="28" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="38" y1="28" x2="38" y2="15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="50" y1="43" x2="62" y2="28" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="62" y1="28" x2="62" y2="15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
              </>
            );
          }
          // 8. STRETCH / PSOAS / MOBILITE
          if (n.includes('étirement') || n.includes('stretch') || n.includes('rotation') || n.includes('psoas') || n.includes('mobil') || n.includes('foam')) {
            return (
              <>
                <Line x1="10" y1="80" x2="90" y2="80" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Circle cx="45" cy="25" r="5" stroke={color} strokeWidth={strokeWidth} />
                <Line x1="45" y1="30" x2="45" y2="55" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="45" y1="55" x2="28" y2="60" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="28" y1="60" x2="28" y2="80" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="45" y1="55" x2="68" y2="65" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
                <Line x1="68" y1="65" x2="80" y2="80" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
              </>
            );
          }
          // 9. FALLBACK (DUMBBELL STANDING)
          return (
            <>
              <Line x1="10" y1="85" x2="90" y2="85" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
              <Circle cx="50" cy="28" r="5" stroke={color} strokeWidth={strokeWidth} />
              <Line x1="50" y1="33" x2="50" y2="60" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
              <Line x1="50" y1="60" x2="42" y2="85" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
              <Line x1="50" y1="60" x2="58" y2="85" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
              <Line x1="50" y1="38" x2="35" y2="48" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
              <Circle cx="35" cy="48" r="3.5" fill={color} />
              <Line x1="50" y1="38" x2="65" y2="48" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
              <Circle cx="65" cy="48" r="3.5" fill={color} />
            </>
          );
        })()}
      </Svg>
    </View>
  );
};

const Hero: React.FC = () => (
  <View style={{ width:'100%', height:220, backgroundColor:colors.sage[800], alignItems:'center', justifyContent:'center', gap:spacing[2] }}>
    <Dumbbell size={36} color={colors.sage[300]} strokeWidth={1.5} />
    <Text style={{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.sage[400], letterSpacing:0.5 }}>Photo de la séance</Text>
  </View>
);

const ExRow: React.FC<{ex:Exercise;onToggle:(id:string)=>void}> = ({ex,onToggle}) => {
  const group = getMuscleGroup(ex.name);
  return (
    <Pressable onPress={()=>onToggle(ex.id)} accessibilityRole="checkbox" accessibilityState={{checked:ex.done}}
      style={{ flexDirection:'row', alignItems:'center', padding:spacing[4], gap:spacing[3], minHeight:64 }}>
      <View style={[{ width:24, height:24, borderRadius:12, borderWidth:1.5, borderColor:colors.ink[200], alignItems:'center', justifyContent:'center', backgroundColor:colors.white }, ex.done&&{ backgroundColor:colors.sage[500], borderColor:colors.sage[500] }]}>
        {ex.done && <Check size={11} color={colors.white} strokeWidth={2.5} />}
      </View>
      <ExerciseImage name={ex.name} size={44} />
      <View style={{ flex:1 }}>
        <Text style={{ fontFamily:fontFamily.hanken.medium, fontSize:fontSize.base, color:ex.done?colors.ink[500]:colors.ink[900], textDecorationLine:ex.done?'line-through':'none' }}>
          {ex.name}
        </Text>
        <Text style={{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500], marginTop: 2 }}>
          Muscle : {group.label}
        </Text>
      </View>
      <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[600], minWidth:52, textAlign:'right' }}>{ex.sets}×{ex.reps}</Text>
    </Pressable>
  );
};

export const WorkoutsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const program          = useProgramStore(s => s.program);
  const isPremium        = useProgramStore(s => s.isPremium);
  const setActiveSession = useProgramStore(s => s.setActiveSession);
  
  const today   = program ? getTodaySession(program) : null;
  const session = today?.session ?? null;

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showDayPicker, setShowDayPicker] = useState(false);

  // Initialiser la session sélectionnée par défaut au chargement
  useEffect(() => {
    if (session && !selectedSessionId) {
      setSelectedSessionId(session.id);
    }
  }, [session]);

  const activeSession = program?.sessions.find(s => s.id === selectedSessionId) ?? session;
  const [exercises, setExercises] = useState<Exercise[]>(activeSession?.exercises ?? []);

  // Mettre à jour les exercices quand la session sélectionnée change
  useEffect(() => {
    if (activeSession) {
      setExercises(activeSession.exercises);
    }
  }, [selectedSessionId, activeSession]);

  // Aucun programme réel → jamais de données factices
  if (!program || !today || !activeSession) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={{ flex:1, paddingHorizontal:spacing[5], justifyContent:'center' }}>
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
    setActiveSession(activeSession.id);
    navigation?.navigate('ActiveWorkout');
  };

  const handleAdjustPress = () => {
    if (!isPremium) {
      useProgramStore.getState().setShowPaywall(true);
    } else {
      navigation?.navigate('ProgramAdjustment');
    }
  };

  const handleSwapDay = async (targetDay: string) => {
    const updatedSessions = program.sessions.map(s => {
      if (s.id === activeSession.id) {
        return { ...s, day: targetDay };
      }
      if (s.day === targetDay) {
        return { ...s, day: activeSession.day };
      }
      return s;
    });

    const updatedProgram = { ...program, sessions: updatedSessions };
    useProgramStore.getState().setProgram(updatedProgram);

    const uid = auth.currentUser?.uid;
    if (uid) {
      await saveProgram(uid, updatedProgram).catch(err => {
        console.error("Erreur lors de la sauvegarde du swap de jour :", err);
      });
    }

    setShowDayPicker(false);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Hero />
        <View style={s.inner}>
          
          {/* ── Liste de toutes les séances de la semaine ── */}
          <View style={{ gap: spacing[2.5], marginBottom: spacing[1] }}>
            <Text style={s.sectionHeaderTitle}>
              Planning de ta semaine
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing[3], paddingVertical: 4 }}>
              {program.sessions.map((s) => {
                const isSelected = s.id === selectedSessionId;
                const isTodaySession = today?.session?.id === s.id;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => setSelectedSessionId(s.id)}
                    style={[
                      s.dayTab,
                      isSelected && s.dayTabSelected,
                      isTodaySession && !isSelected && s.dayTabToday
                    ]}
                  >
                    <Text style={[s.dayTabDay, isSelected && { color: '#fff' }]}>
                      {s.day ?? 'Séance'}
                    </Text>
                    <Text style={[s.dayTabTitle, isSelected ? { color: colors.sage[100] } : { color: colors.ink[500] }]} numberOfLines={1}>
                      {s.title}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Détail de la séance sélectionnée ── */}
          <Card elevation="sm" padding={spacing[5]}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:spacing[3], marginBottom:spacing[4] }}>
              <Badge label={today.session?.id === activeSession.id ? 'Séance du jour' : activeSession.day ?? 'À venir'} variant="clay" />
              <Text style={{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[600] }}>
                {activeSession.duration} min · {activeSession.exerciseCount} exercices
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing[2], marginBottom: spacing[5] }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily:fontFamily.spectral.medium, fontSize:fontSize.xl, color:colors.ink[900], lineHeight:fontSize.xl*lineHeight.snug }} accessibilityRole="header">
                  {activeSession.title}
                </Text>
              </View>
              <Pressable
                onPress={() => setShowDayPicker(!showDayPicker)}
                style={s.changeDayBtn}
                accessibilityRole="button"
                accessibilityLabel="Planifier un autre jour"
              >
                <Calendar size={14} color={colors.sage[600]} />
                <Text style={s.changeDayBtnText}>Planifier</Text>
              </Pressable>
            </View>

            {/* Day Picker / Swapper inside Card */}
            {showDayPicker && (
              <View style={s.dayPickerContainer}>
                <Text style={s.dayPickerTitle}>Planifier cette séance sur un autre jour :</Text>
                <View style={s.dayPickerGrid}>
                  {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Dimanche', 'Samedi', 'Dimanche'].map(d => {
                    const isCurrent = activeSession.day === d;
                    const sessionOnDay = program.sessions.find(s => s.day === d);
                    return (
                      <Pressable
                        key={d}
                        onPress={() => handleSwapDay(d)}
                        style={[s.dayPickerOption, isCurrent && s.dayPickerOptionCurrent]}
                      >
                        <Text style={[s.dayPickerOptionText, isCurrent && { color: '#fff' }]}>
                          {d}
                        </Text>
                        {sessionOnDay && !isCurrent && (
                          <Text style={s.dayPickerOptionSub} numberOfLines={1}>
                            🔄 Échanger avec : {sessionOnDay.title}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
                <Button variant="secondary" size="sm" label="Annuler" onPress={() => setShowDayPicker(false)} style={{ marginTop: spacing[3] }} />
              </View>
            )}

            <View style={{ gap:spacing[2] }}>
              <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                <Text style={{ fontFamily:fontFamily.hanken.medium,   fontSize:fontSize.sm, color:colors.ink[600] }}>Progression</Text>
                <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.sage[600] }}>{done}/{total}</Text>
              </View>
              <Progress value={pct} fillColor={colors.sage[500]} trackColor={colors.sage[100]} height={8} />
            </View>
          </Card>

          {/* Zones de Fréquence Cardiaque & Cardio Sport V9 */}
          {program.cardioZones && (
            <Card elevation="sm" padding={spacing[4]} style={{ gap: spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                <Activity size={18} color={colors.sage[600]} />
                <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.ink[900] }}>
                  Rapport de zones cardiaques
                </Text>
              </View>
              
              <View style={{ gap: spacing[2.5] }}>
                <View style={s.zoneRow}>
                  <View style={[s.zoneDot, { backgroundColor: colors.sage[400] }]} />
                  <Text style={s.zoneName}>Zone 2 (Cardio Modéré)</Text>
                  <Text style={s.zoneVal}>{program.cardioZones.z2}</Text>
                </View>
                <View style={s.zoneRow}>
                  <View style={[s.zoneDot, { backgroundColor: '#e2a13b' }]} />
                  <Text style={s.zoneName}>Zone 3 (Endurance Active)</Text>
                  <Text style={s.zoneVal}>{program.cardioZones.z3}</Text>
                </View>
                <View style={s.zoneRow}>
                  <View style={[s.zoneDot, { backgroundColor: '#c85d32' }]} />
                  <Text style={s.zoneName}>Zone 4 (Seuil Lactate)</Text>
                  <Text style={s.zoneVal}>{program.cardioZones.z4}</Text>
                </View>
                <View style={s.zoneRow}>
                  <View style={[s.zoneDot, { backgroundColor: colors.clay[500] }]} />
                  <Text style={s.zoneName}>Zone 5 (Effort Maximal)</Text>
                  <Text style={s.zoneVal}>{program.cardioZones.z5}</Text>
                </View>
              </View>

              {program.cardioSport === 'velo' && (
                <View style={s.cardioSportNote}>
                  <Text style={s.cardioSportNoteText}>
                    🚴 Note cycliste : Tes cibles FC Max sont ajustées (-5 bpm) car la position assise exige moins d'effort de stabilisation mécanique.
                  </Text>
                </View>
              )}
              {program.cardioSport === 'trail' && (
                <View style={s.cardioSportNote}>
                  <Text style={s.cardioSportNoteText}>
                    ⛰️ Note trail : Attention aux dénivelés brutaux qui font rapidement grimper les pulsations. Reste à l'écoute !
                  </Text>
                </View>
              )}
            </Card>
          )}

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
          
          {/* Ajustement Premium du programme */}
          <Pressable onPress={handleAdjustPress} style={s.adjustBtn} accessibilityRole="button">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 }}>
              <View style={s.adjustIconWrap}>
                <Sparkles size={16} color={colors.sage[600]} />
              </View>
              <View>
                <Text style={s.adjustTitle}>Réajuster mon programme</Text>
                <Text style={s.adjustSub}>Régénérer le volume après 3 semaines</Text>
              </View>
            </View>
            {isPremium ? (
              <ChevronRight size={18} color={colors.ink[400]} />
            ) : (
              <View style={s.lockWrap}>
                <Lock size={12} color="#fff" />
                <Text style={s.lockText}>Premium</Text>
              </View>
            )}
          </Pressable>

          {/* Bandeau de décharge médicale */}
          <View style={s.medicalDisclaimer}>
            <Text style={s.medicalDisclaimerText}>
              Avertissement : L'activité physique comporte des risques. Assure-toi d'exécuter les mouvements en toute sécurité. En cas de douleur ou d'inconfort, arrête immédiatement l'effort. Consulte ton médecin pour tout doute médical.
            </Text>
          </View>

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
  
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  zoneDot: { width: 10, height: 10, borderRadius: 5 },
  zoneName: { flex: 1, fontFamily: fontFamily.hanken.medium, fontSize: fontSize.sm, color: colors.ink[800] },
  zoneVal: { fontFamily: fontFamily.spectral.bold, fontSize: fontSize.sm, color: colors.ink[900] },
  
  cardioSportNote: { backgroundColor: colors.sand[100], borderRadius: radius.md, padding: spacing[3], marginTop: spacing[1] },
  cardioSportNoteText: { fontFamily: fontFamily.hanken.regular, fontSize: 11, color: colors.ink[600], lineHeight: 16 },

  adjustBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing[4],
    borderWidth: 1.5, borderColor: colors.ink[200], ...shadows.sm,
    marginTop: spacing[2]
  },
  adjustIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.sage[50], alignItems: 'center', justifyContent: 'center'
  },
  adjustTitle: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: colors.ink[900] },
  adjustSub: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500], marginTop: 2 },
  lockWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.sage[500], paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: radius.pill
  },
  lockText: { fontFamily: fontFamily.hanken.bold, fontSize: 10, color: '#fff' },

  medicalDisclaimer: { marginTop:spacing[4], padding:spacing[3], backgroundColor:colors.sand[100], borderRadius:8, borderWidth:1, borderColor:colors.sand[200] },
  medicalDisclaimerText: { fontFamily:fontFamily.hanken.regular, fontSize:10, color:colors.ink[500], textAlign:'center', lineHeight:14 },

  /* Styles de planification hebdomadaire */
  sectionHeaderTitle: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.xs, color: colors.ink[500],
    textTransform: 'uppercase', letterSpacing: 0.5
  },
  dayTab: {
    paddingHorizontal: spacing[4], paddingVertical: spacing[2.5],
    borderRadius: radius.md, backgroundColor: '#fff',
    borderWidth: 1, borderColor: colors.ink[200],
    alignItems: 'center', justifyContent: 'center',
    minWidth: 90, ...shadows.sm
  },
  dayTabSelected: {
    backgroundColor: colors.sage[500],
    borderColor: colors.sage[500]
  },
  dayTabToday: {
    borderColor: colors.sage[400],
    borderWidth: 1.5
  },
  dayTabDay: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.sm, color: colors.ink[900]
  },
  dayTabTitle: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: 10, marginTop: 2,
    maxWidth: 120
  },

  /* Bouton changement de jour */
  changeDayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing[2.5], paddingVertical: 6,
    borderRadius: radius.pill, backgroundColor: colors.sage[50],
    borderWidth: 1, borderColor: colors.sage[200]
  },
  changeDayBtnText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: 10, color: colors.sage[600]
  },

  /* Sélecteur de jour */
  dayPickerContainer: {
    backgroundColor: colors.sand[50], borderRadius: radius.lg,
    padding: spacing[3], marginBottom: spacing[4],
    borderWidth: 1, borderColor: colors.ink[200]
  },
  dayPickerTitle: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.xs, color: colors.ink[800],
    marginBottom: spacing[2]
  },
  dayPickerGrid: {
    gap: spacing[1.5], marginBottom: spacing[2]
  },
  dayPickerOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    borderRadius: radius.md, backgroundColor: '#fff',
    borderWidth: 1, borderColor: colors.ink[200]
  },
  dayPickerOptionCurrent: {
    backgroundColor: colors.sage[500],
    borderColor: colors.sage[500]
  },
  dayPickerOptionText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.sm, color: colors.ink[900]
  },
  dayPickerOptionSub: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: 9, color: colors.ink[500],
    maxWidth: 140
  }
});

export default WorkoutsScreen;
