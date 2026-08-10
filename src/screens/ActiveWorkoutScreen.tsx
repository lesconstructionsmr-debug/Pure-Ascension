import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Animated, Platform, Pressable, SafeAreaView,
  ScrollView, StyleSheet, Text, View, AppState, AppStateStatus, Modal
} from 'react-native';
import {
  ChevronLeft, ChevronRight, Check, Clock,
  Pause, Play, SkipForward, X, Trophy, ShieldCheck, Dumbbell, Activity, Zap, Flame, Info, ArrowDown, ArrowUp,
  RefreshCw, Target, Repeat, Sliders, CheckCircle2, Sparkles
} from 'lucide-react-native';
import * as Haptics from '../utils/haptics';
import { colors, fontFamily, fontSize, lineHeight, spacing, radius, shadows, duration } from '../theme/theme';
import { Button } from '../components/Button';
import { Progress } from '../components/Progress';
import { Badge }   from '../components/Badge';
import { useDailyProgress } from '../context/DailyProgressContext';
import { EmptyState } from '../components/EmptyState';
import { useProgramStore } from '../store/useProgramStore';
import { useActiveWorkoutStore } from '../store/useActiveWorkoutStore';
import { db, auth } from '../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getTodaySession, saveProgram } from '../services/programService';
import { getMuscleGroup, ExerciseImage } from './WorkoutsScreen';
import {
  getExerciseBiomechanics,
  getExerciseAlternatives,
  WORKOUT_PHASES,
  type ExerciseBiomechanics,
  type ExerciseAlternative,
  type WorkoutPhaseInfo
} from '../utils/biomechanics';
import type { Exercise } from '../data';
import { BeginnerGuideModal } from '../components/BeginnerGuideModal';

interface Props { onClose: () => void; }

export const ActiveWorkoutScreen: React.FC<Props> = ({ onClose }) => {
  const [showGuideModal, setShowGuideModal] = useState(false);
  const program         = useProgramStore(st => st.program);
  const activeSessionId = useProgramStore(st => st.activeSessionId);
  const session =
    program?.sessions.find(sess => sess.id === activeSessionId)
    ?? (program ? getTodaySession(program)?.session ?? null : null);

  const activeWorkout = useActiveWorkoutStore();
  const { completeWorkout } = useDailyProgress();

  // Liste des exercices d'origine fusionnés avec les remplacements 1-tap
  const rawExercises = session?.exercises ?? [];
  const exercises: Exercise[] = rawExercises.map((ex, idx) => {
    if (activeWorkout.replacedExercises[idx]) {
      return activeWorkout.replacedExercises[idx];
    }
    return ex;
  });

  const [elapsedSec, setElapsedSec] = useState(0);
  const [restTime, setRestTime]     = useState(90);
  const [selectedRestPreset, setSelectedRestPreset] = useState<45 | 90>(90);
  const [showSwapModal, setShowSwapModal] = useState(false);

  const [swapReason, setSwapReason] = useState<'discomfort' | 'preference' | null>(null);

  const restAnim       = useRef(new Animated.Value(1)).current;
  const doneAnim       = useRef(new Animated.Value(0)).current;
  const celebrateAnim  = useRef(new Animated.Value(0)).current;

  const currentExIdx = activeWorkout.currentExerciseIdx;
  const exercise = exercises[currentExIdx] ?? exercises[0];

  const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);
  const completedSets = new Set(activeWorkout.completedSets);
  const doneSets  = completedSets.size;
  const progress  = totalSets > 0 ? doneSets / totalSets : 0;

  // Données biomécaniques de l'exercice actif
  const biomechanics: ExerciseBiomechanics = exercise
    ? getExerciseBiomechanics(exercise.name, currentExIdx, exercises.length)
    : getExerciseBiomechanics('Squat');

  const currentPhase: WorkoutPhaseInfo = WORKOUT_PHASES[biomechanics.phaseNumber];

  // Calcul du temps de repos recommandé (90s pour Phase 2, 45s pour Phase 1 / Phase 3)
  const targetRestDuration = activeWorkout.restDuration || biomechanics.recommendedRestSec;

  // Initialisation de la session de workout dans le store
  useEffect(() => {
    if (session) {
      activeWorkout.startWorkout(session.id);
    }
  }, [session]);

  // Sync rest preset with exercise phase recommendation
  useEffect(() => {
    if (exercise) {
      setSelectedRestPreset(biomechanics.recommendedRestSec as 45 | 90);
    }
  }, [currentExIdx, exercise?.name]);

  // Écoute de l'AppState pour rafraîchir le temps restant de repos et sauvegarder en tâche de fond sur Firestore
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        activeWorkout.checkRestFinished();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (auth.currentUser && activeWorkout.sessionId) {
          const ref = doc(db, 'users', auth.currentUser.uid, 'activeWorkout', 'current');
          await setDoc(ref, {
            sessionId: activeWorkout.sessionId,
            currentExerciseIdx: activeWorkout.currentExerciseIdx,
            currentSetIdx: activeWorkout.currentSetIdx,
            completedSets: activeWorkout.completedSets,
            isPaused: activeWorkout.isPaused,
            startTime: activeWorkout.startTime,
            accumulatedTime: activeWorkout.accumulatedTime,
            isResting: activeWorkout.isResting,
            restStartTime: activeWorkout.restStartTime,
            restDuration: activeWorkout.restDuration,
            replacedExercises: activeWorkout.replacedExercises,
            updatedAt: serverTimestamp(),
          }, { merge: true }).catch(() => {});
        }
      }
    });

    return () => subscription.remove();
  }, [activeWorkout]);

  // Chronomètre de la séance (affichage visuel en continu)
  useEffect(() => {
    if (activeWorkout.isPaused || !activeWorkout.startTime) {
      setElapsedSec(activeWorkout.accumulatedTime);
      return;
    }

    const interval = setInterval(() => {
      const delta = Math.floor((Date.now() - activeWorkout.startTime!) / 1000);
      setElapsedSec(activeWorkout.accumulatedTime + delta);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeWorkout.isPaused, activeWorkout.startTime, activeWorkout.accumulatedTime]);

  // Chronomètre du temps de repos (affichage visuel)
  useEffect(() => {
    if (!activeWorkout.isResting || !activeWorkout.restStartTime) {
      setRestTime(targetRestDuration);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - activeWorkout.restStartTime!) / 1000);
      const remaining = Math.max(0, targetRestDuration - elapsed);
      setRestTime(remaining);

      // Animation du cercle de repos
      Animated.timing(restAnim, {
        toValue: remaining / targetRestDuration,
        duration: 300,
        useNativeDriver: false,
      }).start();

      if (remaining === 0) {
        clearInterval(interval);
        activeWorkout.skipRest();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeWorkout.isResting, activeWorkout.restStartTime, targetRestDuration]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2,'0');
    const s = (sec % 60).toString().padStart(2,'0');
    return `${m}:${s}`;
  };

  const setKey = (exIdx: number, setIdx: number) => `${exIdx}-${setIdx}`;

  // Détecter la fin de séance
  useEffect(() => {
    if (totalSets > 0 && doneSets >= totalSets && !activeWorkout.workoutDone) {
      activeWorkout.finishWorkout();
      completeWorkout({
        sessionId: session?.id || 's1',
        sessionTitle: session?.title || 'Séance complétée',
        durationSec: elapsedSec,
        totalSets,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 300);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 600);
      Animated.spring(celebrateAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }).start();
    }
  }, [doneSets, totalSets, activeWorkout.workoutDone, session, elapsedSec, completeWorkout]);

  const completeSet = () => {
    const key = setKey(activeWorkout.currentExerciseIdx, activeWorkout.currentSetIdx);

    // Haptic + Animation flash de validation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(doneAnim, { toValue:1, duration:180, useNativeDriver:true }),
      Animated.timing(doneAnim, { toValue:0, duration:250, useNativeDriver:true }),
    ]).start();

    const nextSet = activeWorkout.currentSetIdx + 1;
    let nextSetIdx = activeWorkout.currentSetIdx;
    let nextExIdx = activeWorkout.currentExerciseIdx;
    let startRest = false;

    if (nextSet < (exercise?.sets ?? 0)) {
      nextSetIdx = nextSet;
      startRest = true;
    } else {
      const nextEx = activeWorkout.currentExerciseIdx + 1;
      if (nextEx < exercises.length) {
        nextExIdx = nextEx;
        nextSetIdx = 0;
        startRest = true;
      }
    }

    // Prochain exercice rest duration
    const nextExercise = exercises[nextExIdx];
    const nextBiomechanics = nextExercise ? getExerciseBiomechanics(nextExercise.name, nextExIdx, exercises.length) : biomechanics;
    const restDurationToUse = selectedRestPreset || nextBiomechanics.recommendedRestSec;

    activeWorkout.completeSet(key, nextExIdx, nextSetIdx, startRest, restDurationToUse);
  };

  const skipRest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    activeWorkout.skipRest();
  };

  // Traitement du remplacement 1-tap d'un exercice
  const handleSwapExercise = (alt: ExerciseAlternative) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newEx: Exercise = {
      id: `${exercise.id}-swapped-${Date.now()}`,
      name: alt.name,
      sets: exercise.sets,
      reps: exercise.reps,
      done: false,
      notes: `💡 Alternative biomécanique : ${alt.biomechanicMatch}`,
    };

    // Enregistrer localement dans le store de la séance active
    activeWorkout.replaceExercise(currentExIdx, newEx);

    // Enregistrer globalement dans le programme si session existe
    if (program && session) {
      const updatedSessions = program.sessions.map(s => {
        if (s.id === session.id) {
          const updatedExs = [...s.exercises];
          updatedExs[currentExIdx] = newEx;
          return { ...s, exercises: updatedExs };
        }
        return s;
      });
      const updatedProgram = { ...program, sessions: updatedSessions };
      useProgramStore.getState().setProgram(updatedProgram);

      const uid = auth.currentUser?.uid;
      if (uid) {
        saveProgram(uid, updatedProgram).catch(() => {});
      }
    }

    setShowSwapModal(false);
  };

  if (!session) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={{ flex:1, justifyContent:'center', padding:spacing[5] }}>
          <EmptyState
            title="Aucune séance active"
            message="Complète ton quiz de profil fitness pour recevoir ton plan d'entraînement."
            ctaLabel="Retour"
            onCta={onClose}
          />
        </View>
      </SafeAreaView>
    );
  }

  const group = exercise ? getMuscleGroup(exercise.name) : { label: 'Général', bg: '#F5F5F5', color: colors.ink[600] };
  const healthConditions = useProgramStore.getState().profile?.healthConditions;
  const alternatives = exercise ? getExerciseAlternatives(exercise.name, healthConditions) : [];

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
        <Pressable style={s.iconBtn} onPress={() => activeWorkout.isPaused ? activeWorkout.resumeWorkout() : activeWorkout.pauseWorkout()} accessibilityRole="button">
          {activeWorkout.isPaused
            ? <Play  size={20} color={colors.sage[600]} strokeWidth={2} />
            : <Pause size={20} color={colors.ink[700]}  strokeWidth={2} />}
        </Pressable>
      </View>

      {/* Global progress */}
      <View style={s.globalProgress}>
        <Progress value={progress} fillColor={colors.sage[500]} trackColor={colors.ink[200]} height={4} />
        <Text style={s.progressLabel}>{doneSets}/{totalSets} séries complétées</Text>
      </View>

      {/* ── BARRE DES 4 PHASES DE LA SÉANCE ── */}
      <View style={s.phasesBarContainer}>
        {[1, 2, 3, 4].map((pNum) => {
          const pInfo = WORKOUT_PHASES[pNum as 1|2|3|4];
          const isActive = biomechanics.phaseNumber === pNum;
          return (
            <View
              key={pNum}
              style={[
                s.phaseStepChip,
                isActive && { backgroundColor: pInfo.color, borderColor: pInfo.color }
              ]}
            >
              <Text style={[s.phaseStepText, isActive && { color: '#fff', fontFamily: fontFamily.hanken.bold }]}>
                {pInfo.shortName}
              </Text>
            </View>
          );
        })}
      </View>

      <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false}>

        {/* REST OVERLAY CARD */}
        {activeWorkout.isResting && (
          <View style={[s.restCard, { backgroundColor: currentPhase.color }]}>
            <View style={s.restCircle}>
              <Animated.View style={[s.restCircleFill, {
                height: restAnim.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] as any }),
                backgroundColor: colors.sage[400],
              }]} />
              <Text style={s.restNum}>{restTime}</Text>
              <Text style={s.restSec}>secondes</Text>
            </View>
            <Text style={s.restTitle}>Repos • {currentPhase.shortName}</Text>
            <Text style={s.restSub}>Reprends ton souffle. Hydrate-toi et concentre-toi sur la prochaine série.</Text>

            {/* Presets 45s vs 90s */}
            <View style={s.presetContainer}>
              <Pressable
                onPress={() => {
                  setSelectedRestPreset(45);
                  activeWorkout.completeSet(
                    setKey(activeWorkout.currentExerciseIdx, activeWorkout.currentSetIdx),
                    activeWorkout.currentExerciseIdx,
                    activeWorkout.currentSetIdx,
                    true,
                    45
                  );
                }}
                style={[s.presetBtn, selectedRestPreset === 45 && s.presetBtnActive]}
              >
                <Text style={[s.presetBtnText, selectedRestPreset === 45 && s.presetBtnTextActive]}>45s (Accessoire)</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setSelectedRestPreset(90);
                  activeWorkout.completeSet(
                    setKey(activeWorkout.currentExerciseIdx, activeWorkout.currentSetIdx),
                    activeWorkout.currentExerciseIdx,
                    activeWorkout.currentSetIdx,
                    true,
                    90
                  );
                }}
                style={[s.presetBtn, selectedRestPreset === 90 && s.presetBtnActive]}
              >
                <Text style={[s.presetBtnText, selectedRestPreset === 90 && s.presetBtnTextActive]}>90s (Force)</Text>
              </Pressable>
            </View>

            <Pressable style={s.skipBtn} onPress={skipRest} accessibilityRole="button">
              <SkipForward size={16} color="#fff" strokeWidth={2} />
              <Text style={s.skipText}>Passer le repos</Text>
            </Pressable>
          </View>
        )}

        {/* EXERCICE ACTIF */}
        {exercise && (
          <View style={s.exerciseSection}>
            
            {/* Header de l'exercice + Bouton 1-Tap Remplacer */}
            <View style={s.exHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 }}>
                <ExerciseImage name={exercise.name} size={52} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: 2 }}>
                    <Text style={s.exCounter}>Exercice {currentExIdx + 1}/{exercises.length}</Text>
                    <View style={[s.phaseBadge, { backgroundColor: currentPhase.bgColor }]}>
                      <Text style={[s.phaseBadgeText, { color: currentPhase.color }]}>
                        {currentPhase.shortName}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.exName}>{exercise.name}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 6 }}>
                {/* Bouton Guide Pédagogique Débutant */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowGuideModal(true);
                  }}
                  style={[s.swapBtn1Tap, { backgroundColor: colors.sand[200] }]}
                  accessibilityRole="button"
                >
                  <Sparkles size={14} color={colors.clay[500]} />
                  <Text style={[s.swapBtn1TapText, { color: colors.ink[800] }]}>Pourquoi ?</Text>
                </Pressable>

                {/* Bouton 1-Tap Remplacer L'exercice */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setShowSwapModal(true);
                  }}
                  style={s.swapBtn1Tap}
                  accessibilityRole="button"
                  accessibilityLabel="Remplacer l'exercice"
                >
                  <RefreshCw size={14} color={colors.sage[600]} />
                  <Text style={s.swapBtn1TapText}>Remplacer</Text>
                </Pressable>
              </View>
            </View>

            {/* Encadré Pédagogique Débutant : Pourquoi cet exercice ? */}
            <View style={{ backgroundColor: '#fff', borderRadius: radius.md, padding: spacing[3], marginHorizontal: spacing[4], marginBottom: spacing[2], borderWidth: 1, borderColor: colors.sand[300], gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} color={colors.clay[500]} />
                <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.xs, color: colors.ink[900] }}>Pourquoi cet exercice ?</Text>
              </View>
              <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[700], lineHeight: 18 }}>
                {exercise.name.toLowerCase().includes('squat')
                  ? "Renforce l'ensemble des jambes et les fessiers. Développe une posture solide et brûle des calories même au repos."
                  : exercise.name.toLowerCase().includes('pompe') || exercise.name.toLowerCase().includes('développé')
                  ? "Développe la poitrine, les épaules et la force de poussée tout en protégeant les articulations des épaules."
                  : exercise.name.toLowerCase().includes('tirage') || exercise.name.toLowerCase().includes('traction')
                  ? "Renforce la musculature du dos et les biceps. Essentiel pour redresser les épaules et corriger la posture assise."
                  : "Mouvement ciblé pour renforcer les fibres musculaires et stabiliser tes articulations sans risque de blessure."}
              </Text>
            </View>

            {/* ── CARTE DÉTAILLÉE : TEMPO, RPE, MUSCLES CIBLES & BIOMÉCANIQUE ── */}
            <View style={s.biomechanicsCard}>
              
              {/* Grille d'indicateurs (Tempo code + RPE Cible + Phase) */}
              <View style={s.metricsRow}>
                <View style={s.metricItem}>
                  <Clock size={14} color={colors.sage[600]} />
                  <Text style={s.metricLabel}>TEMPO</Text>
                  <Text style={s.metricValueCode}>{biomechanics.tempoCode}</Text>
                </View>

                <View style={s.metricDivider} />

                <View style={s.metricItem}>
                  <Target size={14} color={colors.clay[500]} />
                  <Text style={s.metricLabel}>RPE CIBLE</Text>
                  <Text style={s.metricValueRpe}>{biomechanics.rpeNumeric} / 10</Text>
                </View>

                <View style={s.metricDivider} />

                <View style={s.metricItem}>
                  <Zap size={14} color="#8B5CF6" />
                  <Text style={s.metricLabel}>REPOS RECOMM.</Text>
                  <Text style={s.metricValueRest}>{targetRestDuration}s</Text>
                </View>
              </View>

              {/* Tempo détaillé breakdown */}
              <View style={s.tempoDetailBox}>
                <Text style={s.tempoDetailText}>
                  ⏱️ <Text style={{ fontFamily: fontFamily.hanken.bold }}>Détail Tempo :</Text> {biomechanics.tempoDescription}
                </Text>
              </View>

              {/* Muscles cibles */}
              <View style={s.musclesBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Dumbbell size={14} color={colors.ink[700]} />
                  <Text style={s.musclesTitle}>Muscles Cibles & Agonistes :</Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5] }}>
                  {biomechanics.primaryMuscles.map((m, i) => (
                    <View key={i} style={s.muscleChipPrimary}>
                      <Text style={s.muscleChipPrimaryText}>🎯 {m}</Text>
                    </View>
                  ))}
                  {biomechanics.secondaryMuscles.map((m, i) => (
                    <View key={i} style={s.muscleChipSecondary}>
                      <Text style={s.muscleChipSecondaryText}>⚙️ {m}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Conseils Biomécaniques & Posture */}
              <View style={s.tipBox}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Info size={16} color={colors.sage[700]} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.tipTitle}>Conseil Biomécanique & Sécurité :</Text>
                    <Text style={s.tipText}>{biomechanics.biomechanicalTip}</Text>
                  </View>
                </View>
              </View>
            </View>

            {exercise.notes && (
              <View style={s.notesBox}>
                <Text style={s.notesText}>💡 {exercise.notes}</Text>
              </View>
            )}

            {/* ── PRÉSENTATION DES SÉRIES ── */}
            {Platform.OS === 'web' ? (
              /* --- EXCLUSIF WEB APP : TABLEAU INTERACTIF STYLE STRONGER AVEC DÉTECTION PR --- */
              <View style={webStyles.tableCard}>
                {/* En-tête Métadonnées Exercice (Timer, Tags, Option Unilatérale) */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3], flexWrap: 'wrap', gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                    <View style={{ backgroundColor: colors.sand[200], paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} color={colors.ink[700]} />
                      <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: 11, color: colors.ink[800] }}>
                        {biomechanics.recommendedRestSec}s Repos
                      </Text>
                    </View>
                    <View style={{ backgroundColor: colors.sage[100], paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill }}>
                      <Text style={{ fontFamily: fontFamily.hanken.semiBold, fontSize: 11, color: colors.sage[700] }}>
                        Pattern: {biomechanics.movementPattern}
                      </Text>
                    </View>
                  </View>
                  <View style={{ backgroundColor: colors.clay[100], paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Sparkles size={12} color={colors.clay[600]} />
                    <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: 11, color: colors.clay[700] }}>
                      Score de Force: 70 (Avancé)
                    </Text>
                  </View>
                </View>

                {/* En-têtes du Tableau */}
                <View style={webStyles.tableHeader}>
                  <Text style={[webStyles.th, { width: 50 }]}>SÉRIE</Text>
                  <Text style={[webStyles.th, { flex: 1 }]}>PRÉCÉDENT</Text>
                  <Text style={[webStyles.th, { width: 110, textAlign: 'center' }]}>CHARGE (KG)</Text>
                  <Text style={[webStyles.th, { width: 110, textAlign: 'center' }]}>REPS</Text>
                  <Text style={[webStyles.th, { width: 65, textAlign: 'center' }]}>VALIDER</Text>
                </View>

                {Array.from({ length: exercise.sets }, (_, i) => {
                  const done = completedSets.has(setKey(activeWorkout.currentExerciseIdx, i));
                  const isCurrent = i === activeWorkout.currentSetIdx && !activeWorkout.isResting;
                  const prevData = `${Math.round(40 + i * 5)} kg × ${exercise.reps}`;
                  const isPr = done && i === exercise.sets - 1;

                  return (
                    <View key={i} style={[webStyles.tr, done && webStyles.trDone, isCurrent && webStyles.trCurrent]}>
                      {/* Numéro de série & Badge PR */}
                      <View style={{ width: 50, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 2 }}>
                        <View style={[webStyles.setBadge, done && webStyles.setBadgeDone, isCurrent && webStyles.setBadgeCurrent]}>
                          <Text style={[webStyles.setNumText, (done || isCurrent) && { color: '#fff' }]}>{i + 1}</Text>
                        </View>
                      </View>

                      {/* Performance précédente */}
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[webStyles.td, { color: colors.ink[600] }]}>{prevData}</Text>
                        {isPr && (
                          <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.pill }}>
                            <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: 9, color: '#D97706' }}>🔥 PR!</Text>
                          </View>
                        )}
                      </View>

                      {/* Charge (KG) */}
                      <View style={{ width: 110, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: colors.ink[900] }}>
                          {Math.round(20 + i * 2.5)} kg
                        </Text>
                      </View>

                      {/* Reps */}
                      <View style={{ width: 110, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.sm, color: colors.ink[900] }}>
                          {exercise.reps} reps
                        </Text>
                      </View>

                      {/* Bouton Check 1-Tap */}
                      <View style={{ width: 65, alignItems: 'center' }}>
                        <Pressable
                          style={[webStyles.checkBtn, done && webStyles.checkBtnDone, isCurrent && webStyles.checkBtnCurrent]}
                          onPress={() => {
                            if (!done) {
                              activeWorkout.setCurrentSetIdx(i);
                              completeSet();
                            }
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Valider la série ${i + 1}`}
                        >
                          <Check size={16} color={done ? '#fff' : isCurrent ? colors.clay[500] : colors.sage[600]} strokeWidth={2.5} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}

                {/* Boutons d'action rapides Style Stronger: + Ajouter une série & Charger Historique */}
                <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] }}>
                  <Pressable
                    onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    style={{ flex: 1, backgroundColor: colors.sand[100], borderRadius: radius.md, paddingVertical: spacing[2], alignItems: 'center', borderWidth: 1, borderColor: colors.sand[300] }}
                  >
                    <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.xs, color: colors.ink[800] }}>
                      + Ajouter une série
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    style={{ flex: 1, backgroundColor: colors.sand[100], borderRadius: radius.md, paddingVertical: spacing[2], alignItems: 'center', borderWidth: 1, borderColor: colors.sand[300] }}
                  >
                    <Text style={{ fontFamily: fontFamily.hanken.medium, fontSize: fontSize.xs, color: colors.ink[700] }}>
                      ↻ Historique complet
                    </Text>
                  </Pressable>
                </View>

                {/* Footer du tableau : Bouton de validation rapide & repos */}
                {!activeWorkout.isResting && (
                  <View style={{ marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.sand[200] }}>
                    <Button
                      variant="accent"
                      size="lg"
                      label={`Valider Série ${activeWorkout.currentSetIdx + 1} ✓`}
                      fullWidth
                      onPress={completeSet}
                      disabled={completedSets.has(setKey(activeWorkout.currentExerciseIdx, activeWorkout.currentSetIdx))}
                    />
                  </View>
                )}
              </View>
            ) : (
              /* --- MOBILE NATIVE (iOS / ANDROID) : PRESENTATION STANDARD COMPACTE --- */
              <>
                <View style={s.setsGrid}>
                  {Array.from({ length: exercise.sets }, (_, i) => {
                    const done = completedSets.has(setKey(activeWorkout.currentExerciseIdx, i));
                    const isCurrent = i === activeWorkout.currentSetIdx && !activeWorkout.isResting;
                    return (
                      <Pressable
                        key={i}
                        style={[s.setChip, done && s.setChipDone, isCurrent && s.setChipCurrent]}
                        onPress={() => {
                          if (!done) { activeWorkout.setCurrentSetIdx(i); }
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

                {!activeWorkout.isResting && (
                  <Button
                    variant="accent"
                    size="lg"
                    label={`Valider Série ${activeWorkout.currentSetIdx + 1} ✓`}
                    fullWidth
                    onPress={completeSet}
                    disabled={completedSets.has(setKey(activeWorkout.currentExerciseIdx, activeWorkout.currentSetIdx))}
                  />
                )}
              </>
            )}
          </View>
        )}

        {/* All exercises list */}
        <View style={s.allExSection}>
          <Text style={s.allExTitle}>Programme complet de la séance</Text>
          {exercises.map((ex, exIdx) => {
            const exDone = Array.from({ length: ex.sets }, (_, i) => completedSets.has(setKey(exIdx, i))).every(Boolean);
            const isCurrent = exIdx === activeWorkout.currentExerciseIdx;
            const exBio = getExerciseBiomechanics(ex.name, exIdx, exercises.length);
            const isSwapped = activeWorkout.replacedExercises[exIdx] !== undefined;

            return (
              <Pressable
                key={ex.id || exIdx}
                style={[s.exRow, isCurrent && s.exRowActive]}
                onPress={() => { activeWorkout.setCurrentExerciseIdx(exIdx); activeWorkout.setCurrentSetIdx(0); }}
                accessibilityRole="button"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 }}>
                  <ExerciseImage name={ex.name} size={38} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[s.exRowName, isCurrent && { color:colors.sage[700] }]}>{ex.name}</Text>
                      {isSwapped && (
                        <View style={s.swappedBadge}>
                          <Text style={s.swappedBadgeText}>Modifié</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.exRowMeta}>
                      {ex.sets} séries × {ex.reps} reps · Tempo {exBio.tempoCode}
                    </Text>
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

      {/* MODAL 1-TAP REMPLACER L'EXERCICE AVEC SELECTION DE RAISON */}
      <Modal visible={showSwapModal} animationType="slide" transparent onRequestClose={() => { setShowSwapModal(false); setSwapReason(null); }}>
        <View style={s.modalBackdrop}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>Remplacer l'exercice 🔄</Text>
                <Text style={s.modalSub}>
                  {swapReason === null ? 'Étape 1/2 : Sélection de la raison' : 'Étape 2/2 : Alternatives biomécaniques'}
                </Text>
              </View>
              <Pressable style={s.modalCloseBtn} onPress={() => { setShowSwapModal(false); setSwapReason(null); }} accessibilityRole="button">
                <X size={20} color={colors.ink[600]} />
              </Pressable>
            </View>

            {exercise && (
              <View style={s.currentSwapCard}>
                <Text style={s.currentSwapLabel}>Exercice actuel à remplacer :</Text>
                <Text style={s.currentSwapName}>{exercise.name}</Text>
                <Text style={s.currentSwapMuscles}>🎯 {biomechanics.primaryMuscles.join(' · ')}</Text>
              </View>
            )}

            {swapReason === null ? (
              /* ÉTAPE 1 : SELECTION DE LA RAISON */
              <View style={{ gap: spacing[3], marginVertical: spacing[3] }}>
                <Text style={{ fontFamily: fontFamily.hanken.semiBold, fontSize: fontSize.sm, color: colors.ink[800] }}>
                  Pour quelle raison souhaites-tu remplacer cet exercice ?
                </Text>

                <Pressable
                  style={[s.altCard, { backgroundColor: colors.sand[50], borderColor: colors.clay[300] }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSwapReason('discomfort');
                  }}
                  accessibilityRole="button"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.clay[100], alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 20 }}>🩹</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.ink[900] }}>
                        Gêne ou inconfort physique
                      </Text>
                      <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[600], marginTop: 2 }}>
                        Trouver une alternative plus douce pour les articulations ou sans contrainte axiale.
                      </Text>
                    </View>
                  </View>
                </Pressable>

                <Pressable
                  style={[s.altCard, { backgroundColor: colors.sand[50], borderColor: colors.sage[300] }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSwapReason('preference');
                  }}
                  accessibilityRole="button"
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.sage[100], alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 20 }}>⚡</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.base, color: colors.ink[900] }}>
                        Préférence personnelle / Envie de variante
                      </Text>
                      <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[600], marginTop: 2 }}>
                        Changer de mouvement tout en conservant le même ciblage et la même efficacité.
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            ) : (
              /* ÉTAPE 2 : CARTE EXPLICATIVE ET ALTERNATIVES */
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: spacing[3], paddingVertical: spacing[3] }}>
                {swapReason === 'preference' && exercise && (
                  <View style={{ backgroundColor: '#F0F7F2', borderRadius: radius.lg, padding: spacing[3.5], borderWidth: 1, borderColor: colors.sage[300] }}>
                    <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.xs, color: colors.sage[800], marginBottom: 4 }}>
                      💡 Pourquoi {exercise.name} est important dans ton programme :
                    </Text>
                    <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[700], lineHeight: 18 }}>
                      Cet exercice sollicite spécifiquement <Text style={{ fontFamily: fontFamily.hanken.bold }}>{biomechanics.primaryMuscles.join(' & ')}</Text>. Il garantit un équilibre postural et un développement musculaire harmonieux. Si tu choisis de le remplacer, privilégie une alternative à ciblage équivalent ci-dessous !
                    </Text>
                  </View>
                )}

                {swapReason === 'discomfort' && exercise && (
                  <View style={{ backgroundColor: '#FCF5EE', borderRadius: radius.lg, padding: spacing[3.5], borderWidth: 1, borderColor: colors.clay[300] }}>
                    <Text style={{ fontFamily: fontFamily.hanken.bold, fontSize: fontSize.xs, color: colors.clay[700], marginBottom: 4 }}>
                      🛡️ Adaptation pour ton confort articulaire :
                    </Text>
                    <Text style={{ fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[700], lineHeight: 18 }}>
                      Écouter ses sensations est essentiel pour progresser sans gêne. Les alternatives ci-dessous réduisent la contrainte articulaire tout en maintenant un excellent travail musculaire.
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={() => setSwapReason(null)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginVertical: 2 }}
                >
                  <Text style={{ fontFamily: fontFamily.hanken.medium, fontSize: fontSize.xs, color: colors.sage[600] }}>
                    ← Modifier la raison du remplacement
                  </Text>
                </Pressable>

                {alternatives.map((alt, idx) => (
                  <Pressable
                    key={idx}
                    style={s.altCard}
                    onPress={() => {
                      handleSwapExercise(alt);
                      setSwapReason(null);
                    }}
                    accessibilityRole="button"
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <View style={{ flex: 1, paddingRight: spacing[2] }}>
                        <Text style={s.altName}>{alt.name}</Text>
                        <Text style={s.altCategory}>{alt.category}</Text>
                      </View>
                      <View style={s.altEquipBadge}>
                        <Text style={s.altEquipBadgeText}>{alt.equipment}</Text>
                      </View>
                    </View>

                    <View style={s.altRationaleBox}>
                      <Text style={s.altRationaleText}>💡 {alt.biomechanicMatch}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Text style={s.altMetaText}>Tempo: <Text style={{ fontFamily: fontFamily.hanken.bold }}>{alt.tempoCode}</Text></Text>
                        <Text style={s.altMetaText}>Cible: <Text style={{ fontFamily: fontFamily.hanken.bold }}>{alt.rpeTarget}</Text></Text>
                      </View>
                      <View style={s.selectAltBtn}>
                        <Text style={s.selectAltBtnText}>Choisir 1-Tap →</Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Celebration overlay (workout complete) */}
      {activeWorkout.workoutDone && (
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
            <Text style={s.celebMsg}>Bravo, tu viens de valider l'ensemble des séries avec une précision biomécanique exemplaire. 🌿</Text>
            <Pressable style={s.celebBtn} onPress={() => { activeWorkout.cancelWorkout(); onClose(); }} accessibilityRole="button">
              <Text style={s.celebBtnText}>Terminer la séance</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* Guide Pédagogique Débutant Modal */}
      <BeginnerGuideModal
        visible={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
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

  globalProgress: { paddingHorizontal:spacing[5], paddingVertical:spacing[2], gap:spacing[1] },
  progressLabel:  { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500] },

  /* Barre des 4 phases */
  phasesBarContainer: {
    flexDirection: 'row', gap: spacing[1.5], paddingHorizontal: spacing[5], marginVertical: spacing[2]
  },
  phaseStepChip: {
    flex: 1, paddingVertical: 6, borderRadius: radius.pill,
    backgroundColor: colors.ink[100], borderWidth: 1, borderColor: colors.ink[200],
    alignItems: 'center', justifyContent: 'center'
  },
  phaseStepText: {
    fontFamily: fontFamily.hanken.medium, fontSize: 10, color: colors.ink[600]
  },

  // Rest card
  restCard:   { margin:spacing[5], borderRadius:radius.xl, padding:spacing[6], alignItems:'center', gap:spacing[3] },
  restCircle: { width:120, height:120, borderRadius:60, backgroundColor:'rgba(0,0,0,0.15)', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' },
  restCircleFill: { position:'absolute', bottom:0, left:0, right:0 },
  restNum:   { fontFamily:fontFamily.spectral.medium, fontSize:40, color:'#fff', zIndex:1 },
  restSec:   { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:'rgba(255,255,255,0.85)', zIndex:1 },
  restTitle: { fontFamily:fontFamily.hanken.semiBold, fontSize:fontSize.lg, color:'#fff' },
  restSub:   { fontFamily:fontFamily.hanken.regular, fontSize:fontSize.sm, color:'rgba(255,255,255,0.88)', textAlign:'center' },
  presetContainer: { flexDirection: 'row', gap: spacing[3], marginVertical: spacing[1] },
  presetBtn: {
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
  },
  presetBtnActive: { backgroundColor: '#fff' },
  presetBtnText: { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.xs, color: '#fff' },
  presetBtnTextActive: { color: colors.ink[900], fontFamily: fontFamily.hanken.bold },
  skipBtn:   { flexDirection:'row', alignItems:'center', gap:spacing[2], paddingHorizontal:spacing[4], paddingVertical:spacing[2], borderRadius:radius.pill, backgroundColor:'rgba(0,0,0,0.25)' },
  skipText:  { fontFamily:fontFamily.hanken.medium, fontSize:fontSize.sm, color:'#fff' },

  // Exercise section
  exerciseSection: { margin:spacing[5], gap:spacing[4] },
  exHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:spacing[2] },
  exCounter:{ fontFamily:fontFamily.hanken.regular, fontSize:fontSize.xs, color:colors.ink[500], textTransform:'uppercase', letterSpacing:0.8 },
  phaseBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  phaseBadgeText: { fontFamily: fontFamily.hanken.bold, fontSize: 9 },
  exName:   { fontFamily:fontFamily.spectral.medium, fontSize:fontSize['2xl'], color:colors.ink[900] },

  /* Bouton 1-Tap Remplacer */
  swapBtn1Tap: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    borderRadius: radius.pill, backgroundColor: colors.sage[50],
    borderWidth: 1.5, borderColor: colors.sage[200], ...shadows.sm
  },
  swapBtn1TapText: {
    fontFamily: fontFamily.hanken.bold, fontSize: fontSize.xs, color: colors.sage[700]
  },

  /* Carte Biomécanique */
  biomechanicsCard: {
    backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing[4],
    borderWidth: 1, borderColor: colors.ink[200], gap: spacing[3], ...shadows.sm
  },
  metricsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: colors.sand[100], borderRadius: radius.lg, paddingVertical: spacing[3]
  },
  metricItem: { alignItems: 'center', gap: 2 },
  metricDivider: { width: 1, height: 28, backgroundColor: colors.ink[200] },
  metricLabel: { fontFamily: fontFamily.hanken.bold, fontSize: 9, color: colors.ink[500], letterSpacing: 0.5 },
  metricValueCode: { fontFamily: fontFamily.spectral.medium, fontSize: fontSize.base, color: colors.sage[700] },
  metricValueRpe: { fontFamily: fontFamily.spectral.medium, fontSize: fontSize.base, color: colors.clay[600] },
  metricValueRest: { fontFamily: fontFamily.spectral.medium, fontSize: fontSize.base, color: '#8B5CF6' },

  tempoDetailBox: {
    backgroundColor: colors.sand[50], borderRadius: radius.md, padding: spacing[2.5],
    borderWidth: 1, borderColor: colors.sand[200]
  },
  tempoDetailText: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[700] },

  musclesBox: { gap: spacing[1] },
  musclesTitle: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.xs, color: colors.ink[800] },
  muscleChipPrimary: {
    backgroundColor: colors.sage[50], borderWidth: 1, borderColor: colors.sage[200],
    paddingHorizontal: spacing[2.5], paddingVertical: spacing[1], borderRadius: radius.pill
  },
  muscleChipPrimaryText: { fontFamily: fontFamily.hanken.semiBold, fontSize: 11, color: colors.sage[700] },
  muscleChipSecondary: {
    backgroundColor: colors.sand[100], borderWidth: 1, borderColor: colors.ink[200],
    paddingHorizontal: spacing[2.5], paddingVertical: spacing[1], borderRadius: radius.pill
  },
  muscleChipSecondaryText: { fontFamily: fontFamily.hanken.medium, fontSize: 11, color: colors.ink[600] },

  tipBox: {
    backgroundColor: '#F4F7F4', borderRadius: radius.lg, padding: spacing[3],
    borderLeftWidth: 3, borderLeftColor: colors.sage[600]
  },
  tipTitle: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.xs, color: colors.sage[700] },
  tipText: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[700], lineHeight: 18, marginTop: 2 },

  notesBox: { backgroundColor:colors.sand[200], borderRadius:radius.md, padding:spacing[3.5] },
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
  swappedBadge: { backgroundColor: colors.clay[100], paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.pill },
  swappedBadgeText: { fontFamily: fontFamily.hanken.bold, fontSize: 9, color: colors.clay[600] },

  // Done flash
  doneFlash: { position:'absolute', top:'50%', left:'50%', marginLeft:-40, marginTop:-40, width:80, height:80, borderRadius:40, backgroundColor:colors.sage[500], alignItems:'center', justifyContent:'center' },

  /* Modal Remplacer L'exercice */
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: colors.sand[50], borderTopLeftRadius: radius.xl * 1.5, borderTopRightRadius: radius.xl * 1.5,
    padding: spacing[5], maxHeight: '82%', width: '100%'
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3]
  },
  modalTitle: { fontFamily: fontFamily.spectral.medium, fontSize: fontSize.xl, color: colors.ink[900] },
  modalSub: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[500] },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink[200], alignItems: 'center', justifyContent: 'center' },

  currentSwapCard: {
    backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing[3],
    borderWidth: 1, borderColor: colors.ink[200], marginBottom: spacing[2]
  },
  currentSwapLabel: { fontFamily: fontFamily.hanken.bold, fontSize: 10, color: colors.ink[500], textTransform: 'uppercase' },
  currentSwapName: { fontFamily: fontFamily.spectral.medium, fontSize: fontSize.base, color: colors.ink[900] },
  currentSwapMuscles: { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.xs, color: colors.sage[600], marginTop: 2 },

  altCard: {
    backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing[4],
    borderWidth: 1.5, borderColor: colors.ink[200], ...shadows.sm
  },
  altName: { fontFamily: fontFamily.spectral.medium, fontSize: fontSize.base, color: colors.ink[900] },
  altCategory: { fontFamily: fontFamily.hanken.medium, fontSize: fontSize.xs, color: colors.sage[600] },
  altEquipBadge: { backgroundColor: colors.sand[200], paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  altEquipBadgeText: { fontFamily: fontFamily.hanken.bold, fontSize: 10, color: colors.ink[700] },
  altRationaleBox: { backgroundColor: colors.sand[50], borderRadius: radius.md, padding: spacing[2.5], marginVertical: 4 },
  altRationaleText: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[700], lineHeight: 18 },
  altMetaText: { fontFamily: fontFamily.hanken.regular, fontSize: fontSize.xs, color: colors.ink[600] },
  selectAltBtn: { backgroundColor: colors.sage[600], paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radius.pill },
  selectAltBtnText: { fontFamily: fontFamily.hanken.bold, fontSize: fontSize.xs, color: '#fff' },

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

const webStyles = StyleSheet.create({
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.sand[300],
    ...shadows.sm,
    marginBottom: spacing[3],
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing[2.5],
    borderBottomWidth: 1.5,
    borderBottomColor: colors.sand[300],
    marginBottom: spacing[2],
  },
  th: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: 11,
    color: colors.ink[500],
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.sand[100],
    borderRadius: radius.md,
    marginVertical: 1,
  },
  trDone: {
    backgroundColor: colors.sage[50],
    borderBottomColor: colors.sage[200],
  },
  trCurrent: {
    backgroundColor: colors.sand[50],
    borderLeftWidth: 3,
    borderLeftColor: colors.clay[500],
  },
  td: {
    fontFamily: fontFamily.hanken.medium,
    fontSize: fontSize.sm,
    color: colors.ink[800],
  },
  setBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.sand[200],
    alignItems: 'center',
    justify: 'center',
    alignContent: 'center',
  },
  setBadgeDone: {
    backgroundColor: colors.sage[500],
  },
  setBadgeCurrent: {
    backgroundColor: colors.clay[500],
  },
  setNumText: {
    fontFamily: fontFamily.hanken.bold,
    fontSize: 12,
    color: colors.ink[700],
    textAlign: 'center',
    marginTop: 3,
  },
  checkBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.sand[200],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.sand[300],
  },
  checkBtnDone: {
    backgroundColor: colors.sage[500],
    borderColor: colors.sage[500],
  },
  checkBtnCurrent: {
    backgroundColor: colors.clay[50],
    borderColor: colors.clay[400],
  },
});

export default ActiveWorkoutScreen;
