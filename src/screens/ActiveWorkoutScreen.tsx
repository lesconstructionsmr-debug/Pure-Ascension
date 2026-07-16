import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Animated, Platform, Pressable, SafeAreaView,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import {
  ChevronLeft, ChevronRight, Check, Clock,
  Pause, Play, SkipForward, X, Trophy, ArrowDown, ArrowUp, ShieldCheck, Dumbbell, Activity, Zap, Flame
} from 'lucide-react-native';
import * as Haptics from '../utils/haptics';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows, duration } from '../theme/theme';
import { Button } from '../components/Button';
import { Progress } from '../components/Progress';
import { Badge }   from '../components/Badge';
import { useDailyProgress } from '../context/DailyProgressContext';
import { EmptyState } from '../components/EmptyState';
import { useProgramStore } from '../store/useProgramStore';
import { getTodaySession } from '../services/programService';
import { getMuscleGroup, ExerciseImage } from './WorkoutsScreen';
import Svg, { Circle as SvgCircle, Path as SvgPath, Line as SvgLine, Rect as SvgRect, G } from 'react-native-svg';

const ExerciseVisual: React.FC<{ name: string; color: string }> = ({ name, color }) => {
  const n = name.toLowerCase();

  if (n.includes('squat') || n.includes('fente') || n.includes('presse') || n.includes('leg') || n.includes('ischio') || n.includes('mollet') || n.includes('quad') || n.includes('fessier')) {
    // SQUAT (Side View, bent posture)
    return (
      <Svg width={120} height={90} viewBox="0 0 120 90">
        {/* Ground */}
        <SvgLine x1={20} y1={80} x2={100} y2={80} stroke={colors.ink[200]} strokeWidth={2} />
        {/* Head */}
        <SvgCircle cx={65} cy={28} r={5} fill={color} />
        {/* Spine/Torso */}
        <SvgLine x1={65} y1={33} x2={52} y2={52} stroke={color} strokeWidth={4} strokeLinecap="round" />
        {/* Thighs (deep bent) */}
        <SvgLine x1={52} y1={52} x2={70} y2={60} stroke={color} strokeWidth={4} strokeLinecap="round" />
        {/* Calves */}
        <SvgLine x1={70} y1={60} x2={65} y2={80} stroke={color} strokeWidth={4} strokeLinecap="round" />
        {/* Feet */}
        <SvgLine x1={58} y1={80} x2={68} y2={80} stroke={color} strokeWidth={3} strokeLinecap="round" />
        {/* Barbell held on back */}
        <SvgCircle cx={60} cy={35} r={3} fill="#78716c" />
        <SvgRect x={58} y={23} width={4} height={24} rx={1} fill="#57534e" transform="rotate(15 60 35)" />
      </Svg>
    );
  }

  if (n.includes('développé') || n.includes('push-up') || n.includes('pompe') || n.includes('chest') || n.includes('dips') || n.includes('pec')) {
    // PUSHUP / BENCH (Horizontal pushing view)
    const isPushup = n.includes('pompe') || n.includes('push-up');
    return (
      <Svg width={120} height={90} viewBox="0 0 120 90">
        {/* Ground/Bench */}
        <SvgLine x1={20} y1={76} x2={100} y2={76} stroke={colors.ink[200]} strokeWidth={2} />
        {isPushup ? (
          // Pushup (diagonal body)
          <G>
            {/* Head */}
            <SvgCircle cx={82} cy={40} r={5} fill={color} />
            {/* Spine/Body */}
            <SvgLine x1={78} y1={44} x2={44} y2={62} stroke={color} strokeWidth={4} strokeLinecap="round" />
            {/* Feet */}
            <SvgLine x1={44} y1={62} x2={34} y2={76} stroke={color} strokeWidth={4} strokeLinecap="round" />
            {/* Arm pushing */}
            <SvgLine x1={72} y1={47} x2={68} y2={76} stroke={color} strokeWidth={4} strokeLinecap="round" />
          </G>
        ) : (
          // Bench Press (flat body, bar in hands)
          <G>
            {/* Bench structure */}
            <SvgRect x={30} y={62} width={60} height={14} fill="#e7e5e4" />
            {/* Head */}
            <SvgCircle cx={42} cy={53} r={5} fill={color} />
            {/* Torso */}
            <SvgLine x1={47} y1={58} x2={78} y2={58} stroke={color} strokeWidth={4} strokeLinecap="round" />
            {/* Arms up holding bar */}
            <SvgLine x1={60} y1={58} x2={60} y2={40} stroke={color} strokeWidth={4} strokeLinecap="round" />
            {/* Barbell */}
            <SvgLine x1={35} y1={36} x2={85} y2={36} stroke="#57534e" strokeWidth={3} />
            <SvgCircle cx={35} cy={36} r={4} fill="#292524" />
            <SvgCircle cx={85} cy={36} r={4} fill="#292524" />
          </G>
        )}
      </Svg>
    );
  }

  if (n.includes('gainage') || n.includes('crunch') || n.includes('abdo') || n.includes('core') || n.includes('planche') || n.includes('sit-up')) {
    // PLANK (Straight horizontal body posture)
    return (
      <Svg width={120} height={90} viewBox="0 0 120 90">
        {/* Ground */}
        <SvgLine x1={20} y1={70} x2={100} y2={70} stroke={colors.ink[200]} strokeWidth={2} />
        {/* Head */}
        <SvgCircle cx={80} cy={48} r={5} fill={color} />
        {/* Straight Spine */}
        <SvgLine x1={75} y1={53} x2={35} y2={53} stroke={color} strokeWidth={4} strokeLinecap="round" />
        {/* Elbow / Forearm supporting */}
        <SvgLine x1={70} y1={53} x2={70} y2={70} stroke={color} strokeWidth={4} strokeLinecap="round" />
        {/* Toes supporting */}
        <SvgLine x1={35} y1={53} x2={35} y2={70} stroke={color} strokeWidth={4} strokeLinecap="round" />
      </Svg>
    );
  }

  if (n.includes('traction') || n.includes('tirage') || n.includes('rowing') || n.includes('lombaires') || n.includes('back') || n.includes('pull')) {
    // TRACTION / ROW (Hanging pull posture)
    return (
      <Svg width={120} height={90} viewBox="0 0 120 90">
        {/* Bar */}
        <SvgLine x1={30} y1={25} x2={90} y2={25} stroke="#78716c" strokeWidth={3} />
        {/* Head */}
        <SvgCircle cx={60} cy={36} r={5} fill={color} />
        {/* Spine */}
        <SvgLine x1={60} y1={41} x2={60} y2={62} stroke={color} strokeWidth={4} strokeLinecap="round" />
        {/* Arms pulling */}
        <SvgPath d="M 45 25 L 48 40 L 60 41" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <SvgPath d="M 75 25 L 72 40 L 60 41" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        {/* Bent legs hanging */}
        <SvgPath d="M 60 62 L 56 74 L 64 80" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (n.includes('biceps') || n.includes('triceps') || n.includes('curl') || n.includes('bras') || n.includes('shoulder') || n.includes('élévation') || n.includes('épaules') || n.includes('delto')) {
    // BICEPS CURL (Standing arm-bending dumbbell)
    return (
      <Svg width={120} height={90} viewBox="0 0 120 90">
        {/* Head */}
        <SvgCircle cx={60} cy={26} r={5} fill={color} />
        {/* Spine */}
        <SvgLine x1={60} y1={31} x2={60} y2={60} stroke={color} strokeWidth={4} strokeLinecap="round" />
        {/* Bent arm holding weight */}
        <SvgPath d="M 60 38 L 68 53 L 60 44" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        {/* Dumbbell */}
        <SvgLine x1={56} y1={42} x2={64} y2={46} stroke="#78716c" strokeWidth={3} />
        <SvgCircle cx={56} cy={42} r={3} fill="#292524" />
        <SvgCircle cx={64} cy={46} r={3} fill="#292524" />
        {/* Legs */}
        <SvgLine x1={60} y1={60} x2={60} y2={80} stroke={color} strokeWidth={4} strokeLinecap="round" />
      </Svg>
    );
  }

  // DEFAULT / CARDIO / GENERAL
  return (
    <Svg width={120} height={90} viewBox="0 0 120 90">
      {/* Head */}
      <SvgCircle cx={60} cy={26} r={5} fill={color} />
      {/* Torso */}
      <SvgLine x1={60} y1={31} x2={60} y2={56} stroke={color} strokeWidth={4} strokeLinecap="round" />
      {/* Arms raised */}
      <SvgPath d="M 42 36 L 60 40 L 78 36" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" />
      {/* Legs running */}
      <SvgPath d="M 60 56 L 50 74 L 38 78" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <SvgPath d="M 60 56 L 68 70 L 76 80" fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

const MovementDiagram: React.FC<{ name: string }> = ({ name }) => {
  const group = getMuscleGroup(name);
  
  // Custom tips and arrows based on movement type
  let movementTips = ["Garder le buste droit", "Contrôler la descente"];
  let pathDirection = "vertical";
  let targetMuscle = group.label;

  const n = name.toLowerCase();
  if (n.includes('squat')) {
    movementTips = ["Pousser les genoux vers l'extérieur", "Garder les talons au sol", "Descente sous la parallèle"];
    pathDirection = "down-up";
    targetMuscle = "Quadriceps / Fessiers";
  } else if (n.includes('fente')) {
    movementTips = ["Genou arrière proche du sol", "Garder l'équilibre", "Buste légèrement penché"];
    pathDirection = "down-up";
    targetMuscle = "Fessiers / Ischios";
  } else if (n.includes('développé') || n.includes('pompe') || n.includes('push-up')) {
    movementTips = ["Coudes à 45 degrés", "Engager les abdominaux", "Extension complète"];
    pathDirection = "up-down";
    targetMuscle = "Pectoraux / Triceps";
  } else if (n.includes('traction') || n.includes('pull')) {
    movementTips = ["Tirer avec les coudes", "Poitrine vers la barre", "Contrôler la descente"];
    pathDirection = "up-down";
    targetMuscle = "Grand Dorsal";
  } else if (n.includes('rowing') || n.includes('tirage')) {
    movementTips = ["Serrer les omoplates", "Garder le dos plat", "Tirer vers le nombril"];
    pathDirection = "horizontal";
    targetMuscle = "Haut du Dos / Trapèzes";
  } else if (n.includes('gainage') || n.includes('planche')) {
    movementTips = ["Alignement cheville-bassin-épaule", "Rentrer le nombril", "Ne pas creuser le dos"];
    pathDirection = "isometric";
    targetMuscle = "Transverse / Abdominaux";
  }

  return (
    <View style={{
      backgroundColor: group.bg,
      borderRadius: radius.lg,
      padding: spacing[4],
      borderWidth: 1,
      borderColor: group.color + '33',
      gap: spacing[3],
      marginVertical: spacing[2],
      ...shadows.sm
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <Activity size={18} color={group.color} />
          <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: colors.ink[900] }}>
            Schéma Anatomique & Posture
          </Text>
        </View>
        <Badge variant="sage" label={targetMuscle} />
      </View>

      {/* Schematic drawing representation */}
      <View style={{
        height: 120,
        backgroundColor: '#fff',
        borderRadius: radius.md,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.ink[150],
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Left Side: SVG Visual */}
        <View style={{ width: 130, height: '100%', alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: colors.ink[100] }}>
          <ExerciseVisual name={name} color={group.color} />
        </View>

        {/* Right Side: Directional Vectors */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[2] }}>
          {pathDirection === 'down-up' && (
            <View style={{ alignItems: 'center', gap: spacing[1.5] }}>
              <ArrowDown size={20} color={group.color} strokeWidth={2.5} />
              <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: 10, color: colors.ink[500], letterSpacing: 0.5 }}>FLEXION / EXTENSION</Text>
              <ArrowUp size={20} color={group.color} strokeWidth={2.5} />
            </View>
          )}
          {pathDirection === 'up-down' && (
            <View style={{ alignItems: 'center', gap: spacing[1.5] }}>
              <ArrowUp size={20} color={group.color} strokeWidth={2.5} />
              <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: 10, color: colors.ink[500], letterSpacing: 0.5 }}>POUSSÉE VERTICALE</Text>
              <ArrowDown size={20} color={group.color} strokeWidth={2.5} />
            </View>
          )}
          {pathDirection === 'horizontal' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
              <ChevronLeft size={20} color={group.color} strokeWidth={2.5} />
              <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: 10, color: colors.ink[500], letterSpacing: 0.5 }}>TIRAGE</Text>
              <ChevronRight size={20} color={group.color} strokeWidth={2.5} />
            </View>
          )}
          {pathDirection === 'isometric' && (
            <View style={{ alignItems: 'center', gap: spacing[1.5] }}>
              <View style={{ width: 60, height: 6, borderRadius: 3, backgroundColor: group.color }} />
              <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: 10, color: group.color, letterSpacing: 0.5 }}>
                ISOMÉTRIE (STATIQUE)
              </Text>
            </View>
          )}
          {pathDirection === 'vertical' && (
            <View style={{ alignItems: 'center', gap: spacing[1.5] }}>
              <Dumbbell size={20} color={group.color} />
              <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: 10, color: colors.ink[500], letterSpacing: 0.5 }}>
                ALTERNE / BILATÉRAL
              </Text>
            </View>
          )}
        </View>

        <View style={{ position: 'absolute', bottom: 6, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <ShieldCheck size={12} color={colors.sage[600]} />
          <Text style={{ fontFamily: fontFamily.hanken.medium, fontSize: 9, color: colors.sage[600] }}>Alignement sécurisé</Text>
        </View>
      </View>

      {/* Movement Tips */}
      <View style={{ gap: spacing[1.5] }}>
        {movementTips.map((tip, idx) => (
          <Text key={idx} style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[700], lineHeight: 16 }}>
            • {tip}
          </Text>
        ))}
      </View>
    </View>
  );
};

interface Props { onClose: () => void; }

const REST_DURATION = 60; // seconds

export const ActiveWorkoutScreen: React.FC<Props> = ({ onClose }) => {
  const program         = useProgramStore(st => st.program);
  const activeSessionId = useProgramStore(st => st.activeSessionId);
  const session =
    program?.sessions.find(sess => sess.id === activeSessionId)
    ?? (program ? getTodaySession(program)?.session ?? null : null);
  const exercises = session?.exercises ?? [];
  const { completeWorkout } = useDailyProgress();

  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [currentSetIdx, setCurrentSetIdx]           = useState(0);
  const [completedSets, setCompletedSets]           = useState<Set<string>>(new Set());
  const [isResting, setIsResting]                   = useState(false);
  const [restTime, setRestTime]                     = useState(REST_DURATION);
  const [isPaused, setIsPaused]                     = useState(false);
  const [elapsedSec, setElapsedSec]                 = useState(0);
  const [workoutDone, setWorkoutDone]               = useState(false);

  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const restAnim       = useRef(new Animated.Value(1)).current;
  const doneAnim       = useRef(new Animated.Value(0)).current;
  const celebrateAnim  = useRef(new Animated.Value(0)).current;

  const exercise = exercises[currentExerciseIdx];
  const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);
  const doneSets  = completedSets.size;
  const progress  = totalSets > 0 ? doneSets / totalSets : 0;

  // Elapsed timer
  useEffect(() => {
    elapsedRef.current = setInterval(() => {
      if (!isPaused) setElapsedSec(s => s + 1);
    }, 1000);
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [isPaused]);

  // Rest countdown
  useEffect(() => {
    if (!isResting || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setRestTime(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setIsResting(false);
          setRestTime(REST_DURATION);
          return REST_DURATION;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isResting, isPaused]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2,'0');
    const s = (sec % 60).toString().padStart(2,'0');
    return `${m}:${s}`;
  };

  const setKey = (exIdx: number, setIdx: number) => `${exIdx}-${setIdx}`;

  // Detect workout completion
  useEffect(() => {
    if (totalSets > 0 && doneSets >= totalSets && !workoutDone) {
      setWorkoutDone(true);
      completeWorkout();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 300);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 600);
      Animated.spring(celebrateAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }).start();
    }
  }, [doneSets, totalSets, workoutDone]);

  const completeSet = () => {
    const key = setKey(currentExerciseIdx, currentSetIdx);
    setCompletedSets(prev => new Set([...prev, key]));

    // Haptic + Animate
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(doneAnim, { toValue:1, duration:200, useNativeDriver:true }),
      Animated.timing(doneAnim, { toValue:0, duration:300, useNativeDriver:true }),
    ]).start();

    const nextSet = currentSetIdx + 1;
    if (nextSet < (exercise?.sets ?? 0)) {
      setCurrentSetIdx(nextSet);
      setIsResting(true);
    } else {
      const nextEx = currentExerciseIdx + 1;
      if (nextEx < exercises.length) {
        setCurrentExerciseIdx(nextEx);
        setCurrentSetIdx(0);
        setIsResting(true);
      }
    }
  };

  const skipRest = () => {
    setIsResting(false);
    setRestTime(REST_DURATION);
  };

  const restPercent = restTime / REST_DURATION;

  // Aucune séance réelle → jamais de données factices
  if (!session) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={{ flex:1, justifyContent:'center', padding:spacing[5] }}>
          <EmptyState
            title="Aucune séance active"
            message="Complète ton diagnostic pour recevoir ton plan d'entraînement."
            ctaLabel="Retour"
            onCta={onClose}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.iconBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer">
          <X size={20} color={colors.ink[700]} strokeWidth={2} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{session.title}</Text>
          <Text style={s.headerTime}>{formatTime(elapsedSec)}</Text>
        </View>
        <Pressable style={s.iconBtn} onPress={() => setIsPaused(p => !p)} accessibilityRole="button">
          {isPaused
            ? <Play  size={20} color={colors.sage[600]} strokeWidth={2} />
            : <Pause size={20} color={colors.ink[700]}  strokeWidth={2} />}
        </Pressable>
      </View>

      {/* Global progress */}
      <View style={s.globalProgress}>
        <Progress value={progress} fillColor={colors.sage[500]} trackColor={colors.ink[200]} height={4} />
        <Text style={s.progressLabel}>{doneSets}/{totalSets} séries complétées</Text>
      </View>

      <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false}>

        {/* Rest overlay */}
        {isResting && (
          <View style={s.restCard}>
            <View style={s.restCircle}>
              <Animated.View style={[s.restCircleFill, {
                height: restAnim.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] as any }),
              }]} />
              <Text style={s.restNum}>{restTime}</Text>
              <Text style={s.restSec}>secondes</Text>
            </View>
            <Text style={s.restTitle}>Temps de repos</Text>
            <Text style={s.restSub}>Reprends ton souffle avant la prochaine série.</Text>
            <Pressable style={s.skipBtn} onPress={skipRest} accessibilityRole="button">
              <SkipForward size={16} color={colors.sage[600]} strokeWidth={2} />
              <Text style={s.skipText}>Passer</Text>
            </Pressable>
          </View>
        )}

        {/* Current exercise */}
        {exercise && (
          <View style={s.exerciseSection}>
            <View style={s.exHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 }}>
                <ExerciseImage name={exercise.name} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={s.exCounter}>Exercice {currentExerciseIdx + 1}/{exercises.length}</Text>
                  <Text style={s.exName}>{exercise.name}</Text>
                </View>
              </View>
              <Badge variant="sage" label={`${exercise.sets} × ${exercise.reps}`} />
            </View>

            <MovementDiagram name={exercise.name} />

            {exercise.notes && (
              <View style={s.notesBox}>
                <Text style={s.notesText}>💡 {exercise.notes}</Text>
              </View>
            )}

            {/* Sets grid */}
            <View style={s.setsGrid}>
              {Array.from({ length: exercise.sets }, (_, i) => {
                const done = completedSets.has(setKey(currentExerciseIdx, i));
                const isCurrent = i === currentSetIdx && !isResting;
                return (
                  <Pressable
                    key={i}
                    style={[s.setChip, done && s.setChipDone, isCurrent && s.setChipCurrent]}
                    onPress={() => {
                      if (!done) { setCurrentSetIdx(i); }
                    }}
                    accessibilityRole="button"
                  >
                    {done
                      ? <Check size={14} color="#fff" strokeWidth={2.5} />
                      : <Text style={[s.setChipText, isCurrent && s.setChipTextActive]}>
                          Série {i + 1}
                        </Text>
                    }
                  </Pressable>
                );
              })}
            </View>

            {/* CTA */}
            {!isResting && (
              <Button
                variant="accent"
                size="lg"
                label={`Série ${currentSetIdx + 1} terminée ✓`}
                fullWidth
                onPress={completeSet}
                disabled={completedSets.has(setKey(currentExerciseIdx, currentSetIdx))}
              />
            )}
          </View>
        )}

        {/* All exercises list */}
        <View style={s.allExSection}>
          <Text style={s.allExTitle}>Programme complet</Text>
          {exercises.map((ex, exIdx) => {
            const exDone = Array.from({ length: ex.sets }, (_, i) => completedSets.has(setKey(exIdx, i))).every(Boolean);
            const isCurrent = exIdx === currentExerciseIdx;
            const group = getMuscleGroup(ex.name);
            return (
              <Pressable
                key={ex.id}
                style={[s.exRow, isCurrent && s.exRowActive]}
                onPress={() => { setCurrentExerciseIdx(exIdx); setCurrentSetIdx(0); }}
                accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 }}>
                  <ExerciseImage name={ex.name} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.exRowName, isCurrent && { color:colors.sage[700] }]}>{ex.name}</Text>
                    <Text style={s.exRowMeta}>{ex.sets} séries × {ex.reps} reps · {group.label}</Text>
                  </View>
                </View>
                <View style={[s.exRowDot, exDone && s.exRowDotDone, isCurrent && s.exRowDotCurrent]}>
                  {exDone && <Check size={10} color="#fff" strokeWidth={2.5} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Done flash (per set) */}
      <Animated.View pointerEvents="none" style={[s.doneFlash, { opacity: doneAnim }]}>
        <Check size={32} color="#fff" strokeWidth={2.5} />
      </Animated.View>

      {/* Celebration overlay (workout complete) */}
      {workoutDone && (
        <Animated.View style={[s.celebOverlay, {
          opacity: celebrateAnim,
          transform: [{ scale: celebrateAnim.interpolate({ inputRange:[0,1], outputRange:[0.92, 1] }) }],
        }]}>
          <View style={s.celebCard}>
            <View style={s.celebIconRing}>
              <Trophy size={36} color={colors.clay[500]} strokeWidth={1.8} />
            </View>
            <Text style={s.celebTitle}>Séance terminée ! 🎉</Text>
            <Text style={s.celebSub}>
              {doneSets} séries · {formatTime(elapsedSec)}
            </Text>
            <Text style={s.celebMsg}>Bravo, tu viens de faire quelque chose que la plupart des gens remettent à demain. 🌿</Text>
            <Pressable style={s.celebBtn} onPress={onClose} accessibilityRole="button">
              <Text style={s.celebBtnText}>Terminer la séance</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex:1, backgroundColor:colors.sand[50] },

  header: {
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingHorizontal:spacing[5], paddingVertical:spacing[4],
    borderBottomWidth:1, borderBottomColor:colors.ink[200],
  },
  iconBtn: { width:40, height:40, borderRadius:20, backgroundColor:colors.ink[100], alignItems:'center', justifyContent:'center' },
  headerCenter: { alignItems:'center' },
  headerTitle: { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.base, color:colors.ink[900] },
  headerTime:  { fontFamily:fontFamily.spectral.medium, fontSize:fontSize.xl, color:colors.sage[600] },

  globalProgress: { paddingHorizontal:spacing[5], paddingVertical:spacing[3], gap:spacing[1] },
  progressLabel:  { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500] },

  // Rest card
  restCard:   { margin:spacing[5], backgroundColor:colors.sage[800], borderRadius:radius.xl, padding:spacing[6], alignItems:'center', gap:spacing[4] },
  restCircle: { width:120, height:120, borderRadius:60, backgroundColor:colors.sage[700], alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' },
  restCircleFill: { position:'absolute', bottom:0, left:0, right:0, backgroundColor:colors.sage[500] },
  restNum:   { fontFamily:fontFamily.spectral.medium, fontSize:40, color:'#fff', zIndex:1 },
  restSec:   { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.sage[200], zIndex:1 },
  restTitle: { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.lg, color:'#fff' },
  restSub:   { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.sage[200], textAlign:'center' },
  skipBtn:   { flexDirection:'row', alignItems:'center', gap:spacing[2], paddingHorizontal:spacing[4], paddingVertical:spacing[2], borderRadius:radius.pill, backgroundColor:colors.sage[700] },
  skipText:  { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.sage[200] },

  // Exercise section
  exerciseSection: { margin:spacing[5], gap:spacing[5] },
  exHeader: { flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between' },
  exCounter:{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500], textTransform:'uppercase', letterSpacing:1, marginBottom:2 },
  exName:   { fontFamily:fontFamily.spectral.medium, fontSize:fontSize['2xl'], color:colors.ink[900] },

  notesBox: { backgroundColor:colors.sand[200], borderRadius:radius.md, padding:spacing[4] },
  notesText:{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[700], lineHeight:fontSize.sm*lineHeight.relaxed },

  setsGrid: { flexDirection:'row', flexWrap:'wrap', gap:spacing[3] },
  setChip:  { paddingHorizontal:spacing[4], paddingVertical:spacing[3], borderRadius:radius.md, backgroundColor:colors.ink[100], borderWidth:1.5, borderColor:colors.ink[200] },
  setChipDone:    { backgroundColor:colors.sage[500], borderColor:colors.sage[500] },
  setChipCurrent: { borderColor:colors.sage[500], backgroundColor:colors.sage[50] },
  setChipText:    { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:colors.ink[600] },
  setChipTextActive: { color:colors.sage[700] },

  // All exercises
  allExSection: { marginHorizontal:spacing[5], gap:spacing[2] },
  allExTitle:   { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.sm, color:colors.ink[500], textTransform:'uppercase', letterSpacing:1, marginBottom:spacing[1] },
  exRow:        { flexDirection:'row', alignItems:'center', gap:spacing[3], padding:spacing[4], borderRadius:radius.lg, backgroundColor:'#fff', borderWidth:1, borderColor:colors.ink[200] },
  exRowActive:  { borderColor:colors.sage[400], backgroundColor:colors.sage[50] },
  exRowDot:     { width:28, height:28, borderRadius:14, backgroundColor:colors.ink[200], alignItems:'center', justifyContent:'center' },
  exRowDotDone: { backgroundColor:colors.sage[500] },
  exRowDotCurrent: { backgroundColor:colors.sage[200] },
  exRowName:    { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.base, color:colors.ink[900] },
  exRowMeta:    { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:colors.ink[500] },

  // Done flash
  doneFlash: { position:'absolute', top:'50%', left:'50%', marginLeft:-40, marginTop:-40, width:80, height:80, borderRadius:40, backgroundColor:colors.sage[500], alignItems:'center', justifyContent:'center' },

  // Celebration overlay
  celebOverlay: {
    position:'absolute', top:0, left:0, right:0, bottom:0,
    backgroundColor:'rgba(44,57,45,0.88)',
    alignItems:'center', justifyContent:'center',
    paddingHorizontal: spacing[6],
  },
  celebCard: {
    backgroundColor:'#fff', borderRadius: radius.xl * 1.5,
    padding: spacing[8], alignItems:'center', gap: spacing[4],
    width:'100%',
    ...shadows.lg,
  },
  celebIconRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.clay[50],
    alignItems:'center', justifyContent:'center',
    borderWidth: 2, borderColor: colors.clay[200],
  },
  celebTitle: { fontFamily: fontFamily.spectral.medium, fontSize: fontSize['2xl'], color: colors.ink[900], textAlign:'center' },
  celebSub:   { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.base, color: colors.sage[600] },
  celebMsg:   { fontFamily: fontFamily.hanken.regular,  fontSize: fontSize.sm,   color: colors.ink[600], textAlign:'center', lineHeight: fontSize.sm * lineHeight.relaxed },
  celebBtn:   {
    backgroundColor: colors.sage[600], borderRadius: radius.xl,
    paddingVertical: spacing[4], paddingHorizontal: spacing[8],
    width:'100%', alignItems:'center', marginTop: spacing[2],
  },
  celebBtnText: { fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.base, color:'#fff' },
});

export default ActiveWorkoutScreen;
