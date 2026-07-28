/**
 * useWorkoutHistoryStore — historique local des séances terminées.
 * Chaque séance validée est écrite ici en premier (AsyncStorage), puis
 * synchronisée vers Firestore. Sans cela, une séance terminée hors-ligne
 * ou hors session authentifiée serait définitivement perdue.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CompletedWorkout {
  id: string;
  sessionId: string;
  sessionTitle: string;
  durationSec: number;
  totalSets: number;
  completedAt: number;
  dateKey: string;
  synced: boolean;
}

export type CompletedWorkoutInput = Pick<
  CompletedWorkout,
  'sessionId' | 'sessionTitle' | 'durationSec' | 'totalSets'
>;

export function workoutDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Fenêtre anti-doublon : un re-render ne doit pas créer deux entrées. */
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

const MAX_HISTORY = 400;

interface WorkoutHistoryStore {
  history: CompletedWorkout[];
  /** Retourne l'entrée créée, ou null si c'est un doublon immédiat. */
  addCompleted: (workout: CompletedWorkoutInput) => CompletedWorkout | null;
  markSynced: (id: string) => void;
  getPending: () => CompletedWorkout[];
  isSessionCompletedOn: (sessionId: string, dateKey?: string) => boolean;
  getCompletedOn: (sessionId: string, dateKey?: string) => CompletedWorkout | null;
  clear: () => void;
}

export const useWorkoutHistoryStore = create<WorkoutHistoryStore>()(
  persist(
    (set, get) => ({
      history: [],

      addCompleted: (workout) => {
        const now = Date.now();
        const duplicate = get().history.find(
          (w) => w.sessionId === workout.sessionId && now - w.completedAt < DUPLICATE_WINDOW_MS
        );
        if (duplicate) return null;

        const entry: CompletedWorkout = {
          ...workout,
          id: `w_${now}_${Math.random().toString(36).slice(2, 8)}`,
          completedAt: now,
          dateKey: workoutDateKey(),
          synced: false,
        };

        set((state) => ({ history: [entry, ...state.history].slice(0, MAX_HISTORY) }));
        return entry;
      },

      markSynced: (id) =>
        set((state) => ({
          history: state.history.map((w) => (w.id === id ? { ...w, synced: true } : w)),
        })),

      getPending: () => get().history.filter((w) => !w.synced),

      isSessionCompletedOn: (sessionId, dateKey = workoutDateKey()) =>
        get().history.some((w) => w.sessionId === sessionId && w.dateKey === dateKey),

      getCompletedOn: (sessionId, dateKey = workoutDateKey()) =>
        get().history.find((w) => w.sessionId === sessionId && w.dateKey === dateKey) ?? null,

      clear: () => set({ history: [] }),
    }),
    {
      name: 'pure-ascension-workout-history-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
