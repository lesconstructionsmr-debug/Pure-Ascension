import React, { useState, useEffect } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check, Dumbbell, Lock, Sparkles, ChevronRight, Activity, Calendar, Zap, Flame } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows } from '../theme/theme';
import { Badge }    from '../components/Badge';
import { Button }   from '../components/Button';
import { Card }     from '../components/Card';
import { Progress } from '../components/Progress';
import { type Exercise } from '../data';
import Svg, { Path, Line, Circle, Rect } from 'react-native-svg';
import { EmptyState } from '../components/EmptyState';
import { useProgramStore } from '../store/useProgramStore';
import { useActiveWorkoutStore } from '../store/useActiveWorkoutStore';
import { useWorkoutHistoryStore, workoutDateKey } from '../store/useWorkoutHistoryStore';
import { getTodaySession, saveProgram } from '../services/programService';
import { auth } from '../services/firebase';
import { useDailyProgress } from '../context/DailyProgressContext';

export function getMuscleGroup(name: string): { label: string; icon: string; bg: string; color: string } {
  const n = name.toLowerCase();
  if (n.includes('squat') || n.includes('fente') || n.includes('presse') || n.includes('leg') || n.includes('ischio') || n.includes('mollet') || n.includes('quad') || n.includes('fessier')) {
    return { label: 'Force', icon: 'legs', bg: '#EAF2EC', color: colors.sage[600] };
  }
  if (n.includes('développé') || n.includes('push-up') || n.includes('pompe') || n.includes('chest') || n.includes('dips') || n.includes('pec')) {
    return { label: 'Force', icon: 'push', bg: '#FCF2ED', color: colors.clay[500] };
  }
  if (n.includes('traction') || n.includes('tirage') || n.includes('rowing') || n.includes('lombaires') || n.includes('back') || n.includes('pull')) {
    return { label: 'Force', icon: 'pull', bg: '#EEF7FB', color: '#4E7384' };
  }
  if (n.includes('biceps') || n.includes('triceps') || n.includes('curl') || n.includes('bras') || n.includes('shoulder') || n.includes('élévation') || n.includes('épaules') || n.includes('delto')) {
    return { label: 'Bras / Épaules', icon: 'arms', bg: '#F8F1FD', color: '#9C54D6' };
  }
  if (n.includes('gainage') || n.includes('crunch') || n.includes('abdo') || n.includes('core') || n.includes('planche') || n.includes('sit-up')) {
    return { label: 'Tronc', icon: 'core', bg: '#FDFCEB', color: '#D4A84B' };
  }
  return { label: 'Force', icon: 'cardio', bg: '#F5F5F5', color: colors.ink[600] };
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

const ExRow: React.FC<{ex:Exercise; onToggle:(id:string)=>void}> = ({ex, onToggle}) => {
  const group = getMuscleGroup(ex.name);

  return (
    <Pressable 
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle(ex.id);
      }} 
      accessibilityRole="checkbox" 
      accessibilityState={{checked:ex.done}}
      style={s.exRow}
    >
      <View style={[s.exCheckbox, ex.done && s.exCheckboxDone]}>
        {ex.done && <Check size={12} color={colors.white} strokeWidth={2.5} />}
      </View>
      <ExerciseImage name={ex.name} size={44} />
      <View style={{ flex:1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Text style={[s.exName, ex.done && s.exNameDone]}>
            {ex.name}
          </Text>
          <Badge label={group.label} variant="solid" />
        </View>
        <Text style={{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500] }}>
          🎯 {group.label === 'Force' ? 'Développement musculaire' : 'Renforcement'} · Contrôlé
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

        {/* Header : Titre 'Séances' en grand */}
        <View style={s.header}>
          <Text style={s.headerTitle} accessibilityRole="header">Séances</Text>
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
            <Text style={{ fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.md, color:colors.ink[900] }}>Exercices de la séance</Text>
            <Card elevation="sm" padding={0} style={{ overflow:'hidden' }}>
              {exercises.map((ex, idx, arr) => (
                <View key={ex.id}>
                  <ExRow ex={ex} onToggle={toggle} />
                  {idx < arr.length - 1 && <View style={{ height:1, backgroundColor:colors.ink[200], marginHorizontal:spacing[4] }} />}
                </View>
              ))}
            </Card>
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
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:    { flex:1, backgroundColor:colors.sand[50] },
  scroll:  { flex:1 },
  content: { paddingBottom:spacing[10] },
  
  /* Header */
  header:  { paddingHorizontal:spacing[5], paddingTop:spacing[6], paddingBottom:spacing[3] },
  headerTitle: { fontFamily:fontFamily.spectral.regular, fontSize:fontSize['3xl'], color:colors.ink[900] },

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
  exName: {
    fontFamily:fontFamily.hanken.medium,
    fontSize:fontSize.base,
    color:colors.ink[900],
  },
  exNameDone: {
    color:colors.ink[400],
    textDecorationLine:'line-through',
  },
  exReps: {
    fontFamily:fontFamily.hanken.semiBold,
    fontSize:fontSize.sm,
    color:colors.ink[600],
    minWidth:52,
    textAlign:'right',
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
