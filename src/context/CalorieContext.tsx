/**
 * CalorieContext — suivi calorique journalier
 * Gère les entrées alimentaires + objectif + totaux macro
 */
import React, { createContext, useCallback, useContext, useState } from 'react';

export interface FoodEntry {
  id:        string;
  name:      string;
  kcal:      number;
  proteins:  number;
  carbs:     number;
  fats:      number;
  time:      string; // "HH:MM"
}

interface CalorieCtx {
  entries:      FoodEntry[];
  goalKcal:     number;
  totalKcal:    number;
  totalProteins: number;
  totalCarbs:   number;
  totalFats:    number;
  remainingKcal: number;
  pct:          number; // 0–100
  addEntry:     (e: Omit<FoodEntry, 'id' | 'time'>) => void;
  removeEntry:  (id: string) => void;
  setGoal:      (kcal: number) => void;
}

const Ctx = createContext<CalorieCtx | null>(null);

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export const CalorieProvider: React.FC<{ children: React.ReactNode; initialGoal?: number }> = ({
  children, initialGoal = 1800,
}) => {
  const [entries,  setEntries] = useState<FoodEntry[]>([]);
  const [goalKcal, setGoalKcal] = useState(initialGoal);

  const addEntry = useCallback((e: Omit<FoodEntry, 'id' | 'time'>) => {
    setEntries(prev => [...prev, { ...e, id: Date.now().toString(), time: nowHHMM() }]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const setGoal = useCallback((kcal: number) => setGoalKcal(kcal), []);

  const totalKcal     = entries.reduce((s, e) => s + e.kcal,     0);
  const totalProteins = entries.reduce((s, e) => s + e.proteins,  0);
  const totalCarbs    = entries.reduce((s, e) => s + e.carbs,     0);
  const totalFats     = entries.reduce((s, e) => s + e.fats,      0);
  const remainingKcal = Math.max(0, goalKcal - totalKcal);
  const pct           = Math.min(100, Math.round((totalKcal / goalKcal) * 100));

  return (
    <Ctx.Provider value={{
      entries, goalKcal, totalKcal, totalProteins, totalCarbs, totalFats,
      remainingKcal, pct, addEntry, removeEntry, setGoal,
    }}>
      {children}
    </Ctx.Provider>
  );
};

export const useCalorie = (): CalorieCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCalorie must be used within CalorieProvider');
  return ctx;
};
