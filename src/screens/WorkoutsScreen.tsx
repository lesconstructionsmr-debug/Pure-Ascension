import React, { useState, useEffect } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check, Dumbbell, Lock, Sparkles, ChevronRight, Activity, Calendar, Zap, Flame, RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';
import { Badge }    from '../components/Badge';
import { Button }   from '../components/Button';
import { Card }     from '../components/Card';
import { Progress } from '../components/Progress';
import { ExerciseDetailModal } from '../components/ExerciseDetailModal';
import { type Exercise } from '../data';
import Svg, { Path, Line, Circle, Rect } from 'react-native-svg';
import { EmptyState } from '../components/EmptyState';
import { useProgramStore } from '../store/useProgramStore';
import { useActiveWorkoutStore } from '../store/useActiveWorkoutStore';
import { useWorkoutHistoryStore, workoutDateKey } from '../store/useWorkoutHistoryStore';
import { getTodaySession, saveProgram } from '../services/programService';
import { auth } from '../services/firebase';
import { useDailyProgress } from '../context/DailyProgressContext';

export function getMuscleGroup(name: string, reps?: string | number): { label: string; icon: string; bg: string; color: string; objective: string } {
  const n = name.toLowerCase();

  // 1. Mobilité / Échauffement / Respirations / Etirements
  if (n.includes('stretch') || n.includes('étirement') || n.includes('mobilité') || n.includes('respiration') || n.includes('échauffement') || n.includes('lunge twist') || n.includes('spine')) {
    return { label: 'MOBILITÉ', icon: 'cardio', bg: '#EBF6F0', color: colors.sage[700], objective: 'Souplesse & Mobilité' };
  }

  // 2. Endurance / Pliométrie / Métabolique / Cardio
  if (n.includes('burpee') || n.includes('jump') || n.includes('swing') || n.includes('métabolique') || n.includes('shadow') || n.includes('corde') || n.includes('high knees') || n.includes('cardio')) {
    return { label: 'ENDURANCE', icon: 'cardio', bg: '#FFF4EB', color: colors.clay[600], objective: 'Capacité cardiovasculaire' };
  }

  // 3. Tronc / Gainage / Core
  if (n.includes('gainage') || n.includes('crunch') || n.includes('abdo') || n.includes('core') || n.includes('planche') || n.includes('sit-up') || n.includes('hollow') || n.includes('deadbug')) {
    return { label: 'CORE & TRONC', icon: 'core', bg: '#FDFCEB', color: '#B58416', objective: 'Stabilité & Transverse' };
  }

  // 4. Distinction Hypertrophie vs Force vs Endurance selon le nom ou les réps
  const isHighRep = typeof reps === 'string' ? (reps.includes('12') || reps.includes('15') || reps.includes('20')) : (typeof reps === 'number' && reps >= 12);
  const isLowRep = typeof reps === 'string' ? (reps.includes('3') || reps.includes('4') || reps.includes('5') || reps.includes('6')) : (typeof reps === 'number' && reps <= 6);

  if (n.includes('squat') || n.includes('fente') || n.includes('presse') || n.includes('leg') || n.includes('ischio') || n.includes('mollet') || n.includes('quad') || n.includes('fessier') || n.includes('hip thrust')) {
    if (isLowRep) return { label: 'FORCE', icon: 'legs', bg: '#EAF2EC', color: colors.sage[700], objective: 'Gain de force maximale' };
    if (isHighRep) return { label: 'ENDURANCE', icon: 'legs', bg: '#EAF2EC', color: colors.sage[600], objective: 'Endurance musculaire' };
    return { label: 'HYPERTROPHIE', icon: 'legs', bg: '#EAF2EC', color: colors.sage[600], objective: 'Volume & Galbe musculaire' };
  }

  if (n.includes('développé') || n.includes('push-up') || n.includes('pompe') || n.includes('chest') || n.includes('dips') || n.includes('pec')) {
    if (isLowRep) return { label: 'FORCE', icon: 'push', bg: '#FCF2ED', color: colors.clay[600], objective: 'Poussée lourde & Force' };
    if (isHighRep) return { label: 'ENDURANCE', icon: 'push', bg: '#FCF2ED', color: colors.clay[500], objective: 'Endurance de poussée' };
    return { label: 'HYPERTROPHIE', icon: 'push', bg: '#FCF2ED', color: colors.clay[500], objective: 'Volume Pectoraux & Triceps' };
  }

  if (n.includes('traction') || n.includes('tirage') || n.includes('rowing') || n.includes('lombaires') || n.includes('back') || n.includes('pull')) {
    if (isLowRep) return { label: 'FORCE', icon: 'pull', bg: '#EEF7FB', color: '#3B6071', objective: 'Force de tirage' };
    if (isHighRep) return { label: 'ENDURANCE', icon: 'pull', bg: '#EEF7FB', color: '#4E7384', objective: 'Endurance dorsale' };
    return { label: 'HYPERTROPHIE', icon: 'pull', bg: '#EEF7FB', color: '#4E7384', objective: 'Épaisseur & V-Taper' };
  }

  if (n.includes('biceps') || n.includes('triceps') || n.includes('curl') || n.includes('bras') || n.includes('shoulder') || n.includes('élévation') || n.includes('épaules') || n.includes('delto') || n.includes('clean & press')) {
    return { label: 'HYPERTROPHIE', icon: 'arms', bg: '#F8F1FD', color: '#8E3EC9', objective: 'Développement esthétique bras/épaules' };
  }

  return { label: isHighRep ? 'ENDURANCE' : 'HYPERTROPHIE', icon: 'cardio', bg: '#F5F5F5', color: colors.ink[600], objective: 'Développement général' };
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

/* Bloc supérieur photo de séance (fond vert sombre épuré) */
const Hero: React.FC = () => (
  <View style={s.heroContainer}>
    <View style={s.heroOverlay} />
    <Dumbbell size={40} color={colors.sage[300]} strokeWidth={1.5} />
    <Text style={s.heroText}>PHOTO DE LA SÉANCE</Text>
  </View>
);

const ExRow: React.FC<{
  ex: Exercise;
  onToggle: (id: string) => void;
  onOpenDetail: (ex: Exercise) => void;
}> = ({ ex, onToggle, onOpenDetail }) => {
  const group = getMuscleGroup(ex.name, ex.reps);

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onOpenDetail(ex);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Détail de ${ex.name}`}
      style={s.exRow}
    >
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle(ex.id);
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: ex.done }}
        hitSlop={8}
        style={[s.exCheckbox, ex.done && s.exCheckboxDone]}
      >
        {ex.done && <Check size={12} color={colors.white} strokeWidth={2.5} />}
      </Pressable>
      <ExerciseImage name={ex.name} size={44} />
      <View style={s.exMid}>
        <View style={s.exTitleRow}>
          <Text style={[s.exName, ex.done && s.exNameDone]} numberOfLines={1}>
            {ex.name}
          </Text>
          <View style={s.exBadgeWrap}>
            <Badge label={group.label} variant="solid" />
          </View>
        </View>
        <Text style={s.exObjective} numberOfLines={1}>
          🎯 {group.objective}
        </Text>
      </View>
      <Text style={s.exReps}>{ex.sets}×{ex.reps}</Text>
    </Pressable>
  );
};

export const WorkoutsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const program          = useProgramStore(s => s.program);
  const isPremium        = useProgramStore(s => s.isPremium);
  const setActiveSession = useProgramStore(s => s.setActiveSession);
  const { completeWorkout } = useDailyProgress();
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);
  
  const today   = program ? getTodaySession(program) : null;
  const session = today?.session ?? null;

  const [selectedDay, setSelectedDay] = useState<string>('Lundi');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Default mockup exercises fallback
  const defaultMockExercises: Exercise[] = [
    { id: '1', name: 'Squat gobelet', sets: 5, reps: '10', done: false },
    { id: '2', name: 'Pompes', sets: 3, reps: '8-10', done: false },
    { id: '3', name: 'Rowing haltères', sets: 3, reps: '10', done: false },
  ];

  useEffect(() => {
    if (session && !selectedSessionId) {
      setSelectedSessionId(session.id);
      setSelectedDay(session.day || 'Lundi');
    }
  }, [session]);

  const activeSession = program?.sessions.find(s => s.id === selectedSessionId) ?? session;
  const baseExercises = activeSession?.exercises && activeSession.exercises.length > 0 ? activeSession.exercises : defaultMockExercises;

  // Séries validées dans la séance en cours + séances déjà terminées aujourd'hui
  const liveSessionId  = useActiveWorkoutStore(st => st.sessionId);
  const liveDoneSets   = useActiveWorkoutStore(st => st.completedSets);
  const workoutHistory = useWorkoutHistoryStore(st => st.history);

  const todayRecord = activeSession
    ? workoutHistory.find(w => w.sessionId === activeSession.id && w.dateKey === workoutDateKey())
    : undefined;
  const sessionCompletedToday = !!todayRecord;

  const [manualDone, setManualDone] = useState<Set<string>>(new Set());
  useEffect(() => { setManualDone(new Set()); }, [selectedSessionId]);

  const isExerciseDone = (ex: Exercise, idx: number): boolean => {
    if (sessionCompletedToday) return true;
    if (manualDone.has(ex.id)) return true;
    if (activeSession && liveSessionId === activeSession.id && ex.sets > 0) {
      for (let i = 0; i < ex.sets; i++) {
        if (!liveDoneSets.includes(`${idx}-${i}`)) return false;
      }
      return true;
    }
    return false;
  };

  const exercises: Exercise[] = baseExercises.map((ex, idx) => ({ ...ex, done: isExerciseDone(ex, idx) }));

  if (!program || !today) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={{ flex:1, paddingHorizontal:spacing[5], justifyContent:'center' }}>
          <EmptyState
            title="Aucune séance trouvée"
            message="Complète ton profil fitness pour recevoir ton plan d'entraînement personnalisé."
          />
        </View>
      </SafeAreaView>
    );
  }

  const done = exercises.filter(e => e.done).length;
  const total = exercises.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const toggle = (id: string) => setManualDone(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m} min ${String(s).padStart(2, '0')}s` : `${s}s`;
  };

  const startSession = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (activeSession) {
      setActiveSession(activeSession.id);
    }
    navigation?.navigate('ActiveWorkout');
  };

  const handleMarkCompleted = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (activeSession) {
      completeWorkout({
        sessionId: activeSession.id,
        sessionTitle: activeSession.title || 'Circuit training',
        durationSec: (activeSession.duration || 45) * 60,
        totalSets: baseExercises.reduce((acc, e) => acc + e.sets, 0),
      });
    }
  };

  const daysChipsList = program?.sessions && program.sessions.length > 0
    ? program.sessions.map((s, idx) => s.day || `Séance ${idx + 1}`)
    : ['Lundi', 'Mardi', 'Mercredi', 'Jeudi'];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header : Titre 'Séances' + Bouton Régénérer */}
        <View style={s.header}>
          <Text style={s.headerTitle} accessibilityRole="header">Séances</Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation?.navigate('ProgramAdjustment');
            }}
            style={s.adjustBtn}
            accessibilityRole="button"
          >
            <RefreshCw size={13} color={colors.sage[700]} />
            <Text style={s.adjustBtnText}>Régénérer mon plan 🔄</Text>
          </Pressable>
        </View>

        {/* Bloc supérieur photo de séance (fond vert sombre épuré) */}
        <Hero />

        <View style={s.inner}>
          
          {/* Sélecteur de jours en chips : 'Lundi' (sélectionné vert), 'Mardi', 'Jeudi' */}
          <View style={s.chipsRow}>
            {daysChipsList.map((dayName) => {
              const isSelected = selectedDay === dayName;
              return (
                <Pressable
                  key={dayName}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedDay(dayName);
                    const matchingSession = program.sessions.find(s => s.day?.toLowerCase() === dayName.toLowerCase());
                    if (matchingSession) {
                      setSelectedSessionId(matchingSession.id);
                    }
                  }}
                  style={[s.chip, isSelected && s.chipSelected]}
                  accessibilityRole="button"
                >
                  <Text style={[s.chipText, isSelected && s.chipTextSelected]}>
                    {dayName}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Sous-titre : '45 MIN · 5 EXERCICES' / Circuit training en italique/serif */}
          <View style={s.subtitleBox}>
            <Text style={s.subtitleMeta}>
              {activeSession?.duration || 45} MIN · {total || 5} EXERCICES
            </Text>
            <Text style={s.subtitleItalic}>
              {activeSession?.title || 'Circuit training'}
            </Text>
          </View>

          {/* Card de progression */}
          <Card elevation="sm" padding={spacing[4]}>
            <View style={{ gap: spacing[2] }}>
              <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                <Text style={{ fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.ink[600] }}>Progression de la séance</Text>
                <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.sage[600] }}>{done}/{total}</Text>
              </View>
              <Progress value={pct} fillColor={colors.sage[500]} trackColor={colors.sage[100]} height={8} />
              {sessionCompletedToday && todayRecord && (
                <View style={s.completedBanner}>
                  <Check size={14} color={colors.sage[700]} strokeWidth={2.5} />
                  <Text style={s.completedBannerText}>
                    Séance validée aujourd'hui · {todayRecord.totalSets} séries · {formatDuration(todayRecord.durationSec)}
                  </Text>
                </View>
              )}
            </View>
          </Card>

          {/* Liste des exercices */}
          <View style={{ gap:spacing[3] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.md, color:colors.ink[900] }}>Exercices de la séance</Text>
              {Platform.OS === 'web' && (
                <Text style={{ fontFamily: fontFamily.hanken.medium, fontSize: fontSize.xs, color: colors.sage[700] }}>
                  Mode Interactif Web Active
                </Text>
              )}
            </View>

            {Platform.OS === 'web' ? (
              /* --- EXCLUSIF WEB APP : SÉRIE DE TABLEAUX DES EXERCICES STYLE STRONGER --- */
              <View style={{ gap: spacing[4] }}>
                {exercises.map((ex) => {
                  const group = getMuscleGroup(ex.name, ex.reps);
                  return (
                    <Card key={ex.id} elevation="sm" padding={spacing[4]} style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.sand[300] }}>
                      {/* Header de l'exercice */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[3], paddingBottom: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.sand[200] }}>
                        <ExerciseImage name={ex.name} size={48} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: 2 }}>
                            <Badge label={group.label} variant="solid" />
                            <Text style={{ fontFamily: fontFamily.hanken.medium, fontSize: fontSize.xs, color: colors.ink[600] }}>
                              🎯 {group.objective}
                            </Text>
                          </View>
                          <Text style={{ fontFamily: fontFamily.spectral.bold, fontSize: fontSize.lg, color: colors.ink[900] }}>
                            {ex.name}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => toggle(ex.id)}
                          style={{
                            backgroundColor: ex.done ? colors.sage[500] : colors.sand[200],
                            paddingHorizontal: spacing[3], paddingVertical: spacing[1.5],
                            borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 6
                          }}
                        >
                          <Check size={14} color={ex.done ? '#fff' : colors.ink[700]} strokeWidth={2.5} />
                          <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.xs, color: ex.done ? '#fff' : colors.ink[800] }}>
                            {ex.done ? 'Séance Terminée ✓' : 'Tout Valider'}
                          </Text>
                        </Pressable>
                      </View>

                      {/* Tableau Interactif des Séries Style Stronger */}
                      <View style={{ backgroundColor: colors.sand[50], borderRadius: radius.md, padding: spacing[3], borderWidth: 1, borderColor: colors.sand[200] }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: spacing[2], borderBottomWidth: 1.5, borderBottomColor: colors.sand[300], marginBottom: spacing[2] }}>
                          <Text style={{ width: 50, fontFamily: fontFamily.hanken.bold, fontSize: 11, color: colors.ink[500], letterSpacing: 0.8 }}>SÉRIE</Text>
                          <Text style={{ flex: 1, fontFamily: fontFamily.hanken.bold, fontSize: 11, color: colors.ink[500], letterSpacing: 0.8 }}>PRÉCÉDENT</Text>
                          <Text style={{ width: 110, fontFamily: fontFamily.hanken.bold, fontSize: 11, color: colors.ink[500], letterSpacing: 0.8, textAlign: 'center' }}>CHARGE (KG)</Text>
                          <Text style={{ width: 110, fontFamily: fontFamily.hanken.bold, fontSize: 11, color: colors.ink[500], letterSpacing: 0.8, textAlign: 'center' }}>RÉPÉTITIONS</Text>
                          <Text style={{ width: 70, fontFamily: fontFamily.hanken.bold, fontSize: 11, color: colors.ink[500], letterSpacing: 0.8, textAlign: 'center' }}>VALIDATION</Text>
                        </View>

                        {Array.from({ length: ex.sets }, (_, i) => {
                          const prevWeight = Math.round(30 + i * 5);
                          return (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[2.5], borderBottomWidth: i < ex.sets - 1 ? 1 : 0, borderBottomColor: colors.sand[200] }}>
                              <View style={{ width: 50, alignItems: 'center' }}>
                                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: ex.done ? colors.sage[500] : colors.clay[500], alignItems: 'center', justifyContent: 'center' }}>
                                  <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: 11, color: '#fff' }}>{i + 1}</Text>
                                </View>
                              </View>
                              <Text style={{ flex: 1, fontFamily: fontFamily.hanken.medium, fontSize: fontSize.xs, color: colors.ink[600] }}>
                                {prevWeight} kg × {ex.reps}
                              </Text>
                              <View style={{ width: 110, alignItems: 'center' }}>
                                <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: colors.ink[900] }}>
                                  {prevWeight + 5} kg
                                </Text>
                              </View>
                              <View style={{ width: 110, alignItems: 'center' }}>
                                <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: colors.ink[900] }}>
                                  {ex.reps} reps
                                </Text>
                              </View>
                              <View style={{ width: 70, alignItems: 'center' }}>
                                <Pressable
                                  onPress={() => toggle(ex.id)}
                                  style={{
                                    width: 32, height: 32, borderRadius: 16,
                                    backgroundColor: ex.done ? colors.sage[500] : colors.sand[200],
                                    alignItems: 'center', justifyContent: 'center',
                                    borderWidth: 1, borderColor: ex.done ? colors.sage[500] : colors.sand[300]
                                  }}
                                >
                                  <Check size={16} color={ex.done ? '#fff' : colors.sage[600]} strokeWidth={2.5} />
                                </Pressable>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </Card>
                  );
                })}
              </View>
            ) : (
              /* --- MOBILE NATIVE (iOS / ANDROID) : LISTE STANDARD COMPACTE --- */
              <Card elevation="sm" padding={0} style={{ overflow:'hidden' }}>
                {exercises.map((ex, idx, arr) => (
                  <View key={ex.id}>
                    <ExRow
                      ex={ex}
                      onToggle={toggle}
                      onOpenDetail={setDetailExercise}
                    />
                    {idx < arr.length - 1 && <View style={{ height:1, backgroundColor:colors.ink[200], marginHorizontal:spacing[4] }} />}
                  </View>
                ))}
              </Card>
            )}
          </View>
          
          {/* Boutons CTA principaux Terre Cuite & Validation directe Apple Watch */}
          <View style={{ gap: spacing[2], marginTop: spacing[3] }}>
            <Pressable
              onPress={startSession}
              style={[s.ctaButtonTerreCuite, sessionCompletedToday && s.ctaButtonDone]}
              accessibilityRole="button"
              accessibilityLabel={sessionCompletedToday ? 'Refaire la séance' : 'Continuer la séance'}
            >
              <Text style={s.ctaButtonText}>
                {sessionCompletedToday
                  ? 'Refaire la séance'
                  : done > 0
                    ? 'Continuer la séance'
                    : 'Démarrer la séance'}
              </Text>
            </Pressable>

            {!sessionCompletedToday && (
              <Pressable
                onPress={handleMarkCompleted}
                style={s.ctaButtonSecondary}
                accessibilityRole="button"
                accessibilityLabel="Marquer la séance comme complétée (Apple Watch)"
              >
                <Check size={16} color={colors.sage[700]} strokeWidth={2.5} />
                <Text style={s.ctaButtonSecondaryText}>
                  Marquer comme complétée (Apple Watch)
                </Text>
              </Pressable>
            )}
          </View>

          {/* Bandeau de décharge médicale */}
          <View style={s.medicalDisclaimer}>
            <Text style={s.medicalDisclaimerText}>
              Pure Ascension est un outil de coaching fitness et nutrition. Il ne remplace pas un avis médical professionnel.
            </Text>
          </View>

          <View style={{ height:spacing[10] }} />
        </View>
      </ScrollView>
      <ExerciseDetailModal
        visible={!!detailExercise}
        exercise={detailExercise}
        objectiveLabel={detailExercise ? getMuscleGroup(detailExercise.name, detailExercise.reps).objective : undefined}
        onClose={() => setDetailExercise(null)}
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:    { flex:1, backgroundColor:colors.sand[50] },
  scroll:  { flex:1 },
  content: { paddingBottom:spacing[10] },
  
  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[3],
  },
  headerTitle: { fontFamily:fontFamily.spectral.regular, fontSize:fontSize['3xl'], color:colors.ink[900] },
  adjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.sage[100],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.sage[300],
  },
  adjustBtnText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.xs,
    color: colors.sage[800],
  },

  /* Hero / Bloc supérieur photo de séance */
  heroContainer: {
    width:'100%',
    height: 180,
    backgroundColor: colors.sage[900],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginVertical: spacing[1],
    position: 'relative',
    overflow: 'hidden',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  heroText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.xs,
    color: colors.sage[300],
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  inner:   { paddingHorizontal:spacing[5], paddingTop:spacing[4], gap:spacing[4] },
  
  /* Chips Sélecteur de jours */
  chipsRow: {
    flexDirection: 'row',
    gap: spacing[2.5],
    marginBottom: spacing[1],
  },
  chip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    borderRadius: radius.pill,
    backgroundColor: colors.sand[100],
    borderWidth: 1,
    borderColor: colors.ink[200],
  },
  chipSelected: {
    backgroundColor: colors.sage[500],
    borderColor: colors.sage[500],
  },
  chipText: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.sm,
    color: colors.ink[700],
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontFamily: fontFamily.hanken.bold,
  },

  /* Sous-titre 45 MIN · 5 EXERCICES / Circuit training */
  subtitleBox: {
    gap: spacing[1],
    marginVertical: spacing[1],
  },
  subtitleMeta: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.xs,
    color: colors.clay[500],
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  subtitleItalic: {
    fontFamily: fontFamily.spectral.regularItalic,
    fontSize: fontSize['2xl'],
    color: colors.ink[900],
  },

  /* Exercices */
  exRow: {
    flexDirection:'row',
    alignItems:'center',
    padding:spacing[4],
    gap:spacing[3],
    minHeight:72,
  },
  exCheckbox: {
    width:24,
    height:24,
    borderRadius:12,
    borderWidth:1.5,
    borderColor:colors.ink[200],
    alignItems:'center',
    justifyContent:'center',
    backgroundColor:colors.white,
  },
  exCheckboxDone: {
    backgroundColor:colors.sage[500],
    borderColor:colors.sage[500],
  },
  exMid: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  exTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    minWidth: 0,
  },
  exBadgeWrap: {
    flexShrink: 0,
  },
  exName: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.base,
    color: colors.ink[900],
    flexShrink: 1,
    minWidth: 0,
  },
  exNameDone: {
    color: colors.ink[400],
    textDecorationLine: 'line-through',
  },
  exObjective: {
    fontFamily: fontFamily.hanken.regular,
    fontSize: fontSize.xs,
    color: colors.ink[500],
  },
  exReps: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.sm,
    color: colors.ink[600],
    minWidth: 52,
    flexShrink: 0,
    textAlign: 'right',
  },

  /* Bouton CTA principal Terre Cuite */
  ctaButtonTerreCuite: {
    backgroundColor: colors.clay[500],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[3],
    ...shadows.md,
  },
  ctaButtonDone: {
    backgroundColor: colors.sage[600],
  },
  ctaButtonText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: fontSize.base,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  ctaButtonSecondary: {
    backgroundColor: colors.sage[50],
    borderWidth: 1,
    borderColor: colors.sage[200],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  ctaButtonSecondaryText: {
    fontFamily: fontFamily.hanken.semiBold,
    fontSize: fontSize.sm,
    color: colors.sage[800],
  },

  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.sage[50],
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    marginTop: spacing[2],
  },
  completedBannerText: {
    flex: 1,
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.xs,
    color: colors.sage[800],
  },

  /* Disclaimers */
  medicalDisclaimer: {
    marginTop:spacing[3],
    padding:spacing[3],
    backgroundColor:colors.sand[100],
    borderRadius:8,
    borderWidth:1,
    borderColor:colors.sand[200],
  },
  medicalDisclaimerText: {
    fontFamily:fontFamily.hanken.regular,
    fontSize:10,
    color:colors.ink[500],
    textAlign:'center',
    lineHeight:14,
  },
});

export default WorkoutsScreen;
