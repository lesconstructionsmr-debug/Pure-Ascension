import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Exercise } from '../data';

interface ActiveWorkoutState {
  sessionId: string | null;
  currentExerciseIdx: number;
  currentSetIdx: number;
  completedSets: string[]; // Exemple : ['0-0', '0-1']
  isPaused: boolean;
  startTime: number | null; // Timestamp ms du début de la période de timer active
  accumulatedTime: number; // Temps accumulé hors période active en secondes
  isResting: boolean;
  restStartTime: number | null; // Timestamp ms du début du repos
  restDuration: number; // 90s vs 45s (durée courante du chronomètre de repos)
  replacedExercises: Record<number, Exercise>; // Ex: { 1: { id: '...', name: '...', ... } }
  workoutDone: boolean;

  // Actions
  startWorkout: (sessionId: string) => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  completeSet: (key: string, nextExIdx: number, nextSetIdx: number, startRest: boolean, restDuration?: number) => void;
  skipRest: () => void;
  checkRestFinished: () => void;
  finishWorkout: () => void;
  cancelWorkout: () => void;
  setCurrentExerciseIdx: (idx: number) => void;
  setCurrentSetIdx: (idx: number) => void;
  replaceExercise: (exIdx: number, newExercise: Exercise) => void;
}

export const useActiveWorkoutStore = create<ActiveWorkoutState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      currentExerciseIdx: 0,
      currentSetIdx: 0,
      completedSets: [],
      isPaused: false,
      startTime: null,
      accumulatedTime: 0,
      isResting: false,
      restStartTime: null,
      restDuration: 90,
      replacedExercises: {},
      workoutDone: false,

      setCurrentExerciseIdx: (currentExerciseIdx) => set({ currentExerciseIdx }),
      setCurrentSetIdx: (currentSetIdx) => set({ currentSetIdx }),

      startWorkout: (sessionId) => {
        const state = get();
        // Si la même session est déjà en cours et non terminée, conservons l'état actif sans réinitialiser !
        if (state.sessionId === sessionId && !state.workoutDone && state.startTime) {
          return;
        }

        set({
          sessionId,
          currentExerciseIdx: 0,
          currentSetIdx: 0,
          completedSets: [],
          isPaused: false,
          startTime: Date.now(),
          accumulatedTime: 0,
          isResting: false,
          restStartTime: null,
          restDuration: 90,
          replacedExercises: {},
          workoutDone: false,
        });
      },

      pauseWorkout: () => {
        const { startTime, accumulatedTime } = get();
        if (startTime) {
          const delta = Math.floor((Date.now() - startTime) / 1000);
          set({
            isPaused: true,
            accumulatedTime: accumulatedTime + delta,
            startTime: null,
          });
        } else {
          set({ isPaused: true });
        }
      },

      resumeWorkout: () => set({
        isPaused: false,
        startTime: Date.now(),
      }),

      completeSet: (key, nextExIdx, nextSetIdx, startRest, restDuration = 90) => set((state) => ({
        completedSets: state.completedSets.includes(key)
          ? state.completedSets
          : [...state.completedSets, key],
        currentSetIdx: nextSetIdx,
        currentExerciseIdx: nextExIdx,
        isResting: startRest,
        restStartTime: startRest ? Date.now() : null,
        restDuration: restDuration,
      })),

      skipRest: () => set({
        isResting: false,
        restStartTime: null,
      }),

      checkRestFinished: () => {
        const { restStartTime, isResting, restDuration } = get();
        if (isResting && restStartTime) {
          const elapsed = Math.floor((Date.now() - restStartTime) / 1000);
          if (elapsed >= (restDuration || 90)) {
            set({ isResting: false, restStartTime: null });
          }
        }
      },

      replaceExercise: (exIdx, newExercise) => set((state) => ({
        replacedExercises: {
          ...state.replacedExercises,
          [exIdx]: newExercise,
        },
      })),

      finishWorkout: () => set({ workoutDone: true }),

      cancelWorkout: () => set({
        sessionId: null,
        currentExerciseIdx: 0,
        currentSetIdx: 0,
        completedSets: [],
        isPaused: false,
        startTime: null,
        accumulatedTime: 0,
        isResting: false,
        restStartTime: null,
        restDuration: 90,
        replacedExercises: {},
        workoutDone: false,
      }),
    }),
    {
      name: 'active-workout-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
