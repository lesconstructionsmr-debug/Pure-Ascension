/**
 * useWearableStore — Store Zustand pour la gestion des montres connectées (Apple Watch & Garmin).
 * Pure Ascension — Expo SDK 56
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WearableState {
  appleWatchConnected: boolean;
  garminConnected: boolean;
  currentHeartRate: number;
  todaySteps: number;
  todayActiveKcal: number;
  sleepHours: number;
  lastSyncTimestamp: string | null;

  // Actions
  setAppleWatchConnected: (connected: boolean) => void;
  setGarminConnected: (connected: boolean) => void;
  updateLiveMetrics: (metrics: {
    heartRate?: number;
    steps?: number;
    activeKcal?: number;
    sleepHours?: number;
  }) => void;
  disconnectAll: () => void;
}

export const useWearableStore = create<WearableState>()(
  persist(
    (set) => ({
      appleWatchConnected: false,
      garminConnected: false,
      currentHeartRate: 0,
      todaySteps: 0,
      todayActiveKcal: 0,
      sleepHours: 0,
      lastSyncTimestamp: null,

      setAppleWatchConnected: (connected: boolean) =>
        set({
          appleWatchConnected: connected,
          lastSyncTimestamp: new Date().toISOString(),
        }),

      setGarminConnected: (connected: boolean) =>
        set({
          garminConnected: connected,
          lastSyncTimestamp: new Date().toISOString(),
        }),

      updateLiveMetrics: (metrics) =>
        set((state) => ({
          currentHeartRate: metrics.heartRate ?? state.currentHeartRate,
          todaySteps: metrics.steps ?? state.todaySteps,
          todayActiveKcal: metrics.activeKcal ?? state.todayActiveKcal,
          sleepHours: metrics.sleepHours ?? state.sleepHours,
          lastSyncTimestamp: new Date().toISOString(),
        })),

      disconnectAll: () =>
        set({
          appleWatchConnected: false,
          garminConnected: false,
          currentHeartRate: 0,
          todaySteps: 0,
          todayActiveKcal: 0,
          sleepHours: 0,
          lastSyncTimestamp: null,
        }),
    }),
    {
      name: 'pure_ascension_wearable_store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
