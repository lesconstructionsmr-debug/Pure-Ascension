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
  setProgram:       (p: GeneratedProgram | null) => void;
  setActiveSession: (id: string | null) => void;
  clear:            () => void;
}

export const useProgramStore = create<ProgramStore>((set) => ({
  program:         null,
  activeSessionId: null,
  setProgram:       (program) => set({ program }),
  setActiveSession: (activeSessionId) => set({ activeSessionId }),
  clear:            () => set({ program: null, activeSessionId: null }),
}));
