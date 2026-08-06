/**
 * useProgramStore — source unique du programme réel côté front.
 * Hydraté depuis AsyncStorage et Firestore.
 * Persiste localement pour garantir l'accès hors-ligne.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GeneratedProgram } from '../services/programService';
import type { UserProfile } from '../data';

interface ProgramStore {
  program:                GeneratedProgram | null;
  profile:                UserProfile | null;
  activeSessionId:        string | null;
  isPremium:              boolean;
  showPaywall:            boolean;
  userName:               string;
  userEmail:              string;
  completedWorkoutsCount: number;
  streakDays:             number;
  setProgram:                 (p: GeneratedProgram | null) => void;
  setProfile:                 (p: UserProfile | null) => void;
  setActiveSession:           (id: string | null) => void;
  setPremium:                 (isPremium: boolean) => void;
  setShowPaywall:             (show: boolean) => void;
  setUserData:                (userName: string, userEmail: string) => void;
  setCompletedWorkoutsCount:  (count: number) => void;
  setStreakDays:              (days: number) => void;
  incrementCompletedWorkouts: () => void;
  clear:                      () => void;
}

export const useProgramStore = create<ProgramStore>()(
  persist(
    (set) => ({
      program:                null,
      profile:                null,
      activeSessionId:        null,
      isPremium:              false,
      showPaywall:            false,
      userName:               '',
      userEmail:              '',
      completedWorkoutsCount: 0,
      streakDays:             1,
      setProgram:                 (program) => set({ program }),
      setProfile:                 (profile) => set({ profile }),
      setActiveSession:           (activeSessionId) => set({ activeSessionId }),
      setPremium:                 (isPremium) => set({ isPremium }),
      setShowPaywall:             (showPaywall) => set({ showPaywall }),
      setUserData:                (userName, userEmail) => set({ userName, userEmail }),
      setCompletedWorkoutsCount:  (completedWorkoutsCount) => set({ completedWorkoutsCount }),
      setStreakDays:              (streakDays) => set({ streakDays }),
      incrementCompletedWorkouts: () => set((state) => ({ completedWorkoutsCount: state.completedWorkoutsCount + 1 })),
      clear:                      () => set({ 
        program: null, 
        profile: null, 
        activeSessionId: null, 
        isPremium: false, 
        showPaywall: false, 
        userName: '', 
        userEmail: '',
        completedWorkoutsCount: 0,
        streakDays: 1,
      }),
    }),
    {
      name: 'pure-ascension-program-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('Erreur réhydratation AsyncStorage useProgramStore:', error);
          state?.clear();
        }
      },
    }
  )
);
