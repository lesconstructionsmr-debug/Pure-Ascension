/**
 * useProgramStore — source unique du programme réel côté front.
 * Hydraté depuis Firestore au login (RootNavigator), mis à jour après
 * génération du diagnostic. Aucun mock : null = pas de plan.
 */
import { create } from 'zustand';
import type { GeneratedProgram } from '../services/programService';

interface ProgramStore {
  program:         GeneratedProgram | null;
  activeSessionId: string | null;
  isPremium:       boolean;
  showPaywall:     boolean;
  userName:        string;
  userEmail:       string;
  setProgram:       (p: GeneratedProgram | null) => void;
  setActiveSession: (id: string | null) => void;
  setPremium:       (isPremium: boolean) => void;
  setShowPaywall:   (show: boolean) => void;
  setUserData:      (userName: string, userEmail: string) => void;
  clear:            () => void;
}

export const useProgramStore = create<ProgramStore>((set) => ({
  program:         null,
  activeSessionId: null,
  isPremium:       false,
  showPaywall:     false,
  userName:        '',
  userEmail:       '',
  setProgram:       (program) => set({ program }),
  setActiveSession: (activeSessionId) => set({ activeSessionId }),
  setPremium:       (isPremium) => set({ isPremium }),
  setShowPaywall:   (showPaywall) => set({ showPaywall }),
  setUserData:      (userName, userEmail) => set({ userName, userEmail }),
  clear:            () => set({ program: null, activeSessionId: null, isPremium: false, showPaywall: false, userName: '', userEmail: '' }),
}));
