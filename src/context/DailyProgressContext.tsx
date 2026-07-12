/**
 * DailyProgressContext
 * State partagé pour la progression quotidienne.
 * Permet aux rings de l'accueil de réagir en temps réel
 * quand on coche un repas ou termine une séance.
 */
import React, { createContext, useCallback, useContext, useState } from 'react';

const TOTAL_MEALS   = 3;
const TOTAL_WATER   = 8; // verres

interface DailyProgressCtx {
  // State
  checkedMealIds:   Set<string>;
  workoutCompleted: boolean;
  waterGlasses:     number;
  // Actions
  checkMeal:        (id: string) => void;
  uncheckMeal:      (id: string) => void;
  completeWorkout:  () => void;
  addWater:         () => void;
  removeWater:      () => void;
  // Computed (0–100)
  mealsPct:    number;
  workoutPct:  number;
  waterPct:    number;
  mealsCount:  number; // nombre cochés
}

const Ctx = createContext<DailyProgressCtx | null>(null);

export const DailyProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [checkedMealIds,   setCheckedMeals]   = useState<Set<string>>(new Set());
  const [workoutCompleted, setWorkoutDone]    = useState(false);
  const [waterGlasses,     setWater]          = useState(0);

  const checkMeal = useCallback((id: string) => {
    setCheckedMeals(prev => new Set([...prev, id]));
  }, []);

  const uncheckMeal = useCallback((id: string) => {
    setCheckedMeals(prev => { const s = new Set(prev); s.delete(id); return s; });
  }, []);

  const completeWorkout = useCallback(() => setWorkoutDone(true), []);
  const addWater    = useCallback(() => setWater(v => Math.min(v + 1, TOTAL_WATER)), []);
  const removeWater = useCallback(() => setWater(v => Math.max(v - 1, 0)), []);

  const mealsCount = checkedMealIds.size;
  const mealsPct   = Math.round((mealsCount / TOTAL_MEALS) * 100);
  const workoutPct = workoutCompleted ? 100 : 0;
  const waterPct   = Math.round((waterGlasses / TOTAL_WATER) * 100);

  return (
    <Ctx.Provider value={{
      checkedMealIds, workoutCompleted, waterGlasses,
      checkMeal, uncheckMeal, completeWorkout, addWater, removeWater,
      mealsPct, workoutPct, waterPct, mealsCount,
    }}>
      {children}
    </Ctx.Provider>
  );
};

export const useDailyProgress = (): DailyProgressCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDailyProgress must be used within DailyProgressProvider');
  return ctx;
};
