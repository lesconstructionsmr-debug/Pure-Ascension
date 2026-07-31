/**
 * DailyProgressContext
 * State partagé pour la progression quotidienne.
 * Sauvegarde et synchronise en temps réel avec AsyncStorage & Firestore.
 */
import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../services/firebase';
import { saveDailyProgress, getTodayProgress, saveCompletedWorkout } from '../services/dbService';
import { useProgramStore } from '../store/useProgramStore';
import { useWorkoutHistoryStore } from '../store/useWorkoutHistoryStore';
import { useCalorie } from './CalorieContext';
import { calculateAndUpdateStreak } from '../hooks/useStreak';

const TOTAL_MEALS   = 3;
const TOTAL_WATER   = 8; // verres

function todayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface DailyProgressCtx {
  // State
  checkedMealIds:   Set<string>;
  workoutCompleted: boolean;
  waterGlasses:     number;
  sleepScore:       number; // 0 to 5
  mentalCheckin:    boolean;
  // Actions
  checkMeal:        (id: string) => void;
  uncheckMeal:      (id: string) => void;
  completeWorkout:  (sessionDetails?: { sessionId: string; sessionTitle: string; durationSec: number; totalSets: number }) => void;
  addWater:         () => void;
  removeWater:      () => void;
  setSleepScore:    (score: number) => void;
  toggleMentalCheckin: () => void;
  // Computed (0–100)
  mealsPct:        number;
  workoutPct:      number;
  waterPct:        number;
  sleepPct:        number;
  mentalPct:       number;
  ascensionScore:  number;
  mealsCount:      number; // nombre cochés
}

const Ctx = createContext<DailyProgressCtx | null>(null);

export const DailyProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [checkedMealIds,   setCheckedMeals]   = useState<Set<string>>(new Set());
  const [workoutCompleted, setWorkoutDone]    = useState(false);
  const [waterGlasses,     setWater]          = useState(0);
  const [sleepScore,       setSleep]          = useState(0);
  const [mentalCheckin,    setMental]         = useState(false);

  const mealsRef = React.useRef(checkedMealIds);
  mealsRef.current = checkedMealIds;
  const workoutRef = React.useRef(workoutCompleted);
  workoutRef.current = workoutCompleted;
  const waterRef = React.useRef(waterGlasses);
  waterRef.current = waterGlasses;
  const sleepRef = React.useRef(sleepScore);
  sleepRef.current = sleepScore;
  const mentalRef = React.useRef(mentalCheckin);
  mentalRef.current = mentalCheckin;

  // Charger la progression du jour au démarrage et à la connexion
  useEffect(() => {
    let isMounted = true;
    
    const loadProgressForUser = async (uid: string | null) => {
      calculateAndUpdateStreak();
      const storageKey = `daily_progress_${todayKey()}`;
      try {
        // 1. Charger d'abord localement pour affichage immédiat
        const local = await AsyncStorage.getItem(storageKey);
        let currentWorkoutDone = false;
        let currentWater = 0;
        let currentMeals: string[] = [];
        let currentSleep = 0;
        let currentMental = false;

        if (local && isMounted) {
          const parsed = JSON.parse(local);
          if (parsed.workoutDone !== undefined) { setWorkoutDone(!!parsed.workoutDone); currentWorkoutDone = !!parsed.workoutDone; }
          if (parsed.waterGlasses !== undefined) { setWater(parsed.waterGlasses || 0); currentWater = parsed.waterGlasses || 0; }
          if (Array.isArray(parsed.mealsDone)) { setCheckedMeals(new Set(parsed.mealsDone)); currentMeals = parsed.mealsDone; }
          if (parsed.sleepScore !== undefined) { setSleep(parsed.sleepScore || 0); currentSleep = parsed.sleepScore || 0; }
          if (parsed.mentalCheckin !== undefined) { setMental(!!parsed.mentalCheckin); currentMental = !!parsed.mentalCheckin; }
        }

        // 2. Si connecté, synchroniser avec Firestore sans écraser les données locales
        if (uid && uid !== 'local_user' && auth.currentUser) {
          const remote = await getTodayProgress(uid);
          if (remote && isMounted) {
            const finalWorkoutDone = currentWorkoutDone || !!remote.workoutDone;
            const finalWater = Math.max(currentWater, remote.waterGlasses || 0);
            const remoteMeals = Array.isArray(remote.mealsDone) ? remote.mealsDone : [];
            const finalMeals = Array.from(new Set([...currentMeals, ...remoteMeals]));
            const finalSleep = currentSleep > 0 ? currentSleep : (remote.sleepScore || 0);
            const finalMental = currentMental || !!remote.mentalCheckin;

            setWorkoutDone(finalWorkoutDone);
            setWater(finalWater);
            setCheckedMeals(new Set(finalMeals));
            setSleep(finalSleep);
            setMental(finalMental);

            await AsyncStorage.setItem(storageKey, JSON.stringify({
              workoutDone: finalWorkoutDone,
              waterGlasses: finalWater,
              mealsDone: finalMeals,
              sleepScore: finalSleep,
              mentalCheckin: finalMental,
            }));
          }
        }
      } catch (err) {
        console.error('Erreur chargement progression quotidienne:', err);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      loadProgressForUser(user ? user.uid : null);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Rejouer vers Firestore les séances terminées hors-ligne / avant connexion
  useEffect(() => {
    const historyStore = useWorkoutHistoryStore.getState();
    const localCount = historyStore.history.length;
    if (localCount > useProgramStore.getState().completedWorkoutsCount) {
      useProgramStore.getState().setCompletedWorkoutsCount(localCount);
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      const pending = useWorkoutHistoryStore.getState().getPending();
      for (const workout of pending) {
        const ok = await saveCompletedWorkout(user.uid, {
          sessionId: workout.sessionId,
          sessionTitle: workout.sessionTitle,
          durationSec: workout.durationSec,
          totalSets: workout.totalSets,
        });
        if (ok) useWorkoutHistoryStore.getState().markSynced(workout.id);
      }
    });

    return unsubscribe;
  }, []);

  const persistState = useCallback(async (meals: string[], workoutDone: boolean, water: number, sleep: number, mental: boolean) => {
    const storageKey = `daily_progress_${todayKey()}`;
    const dataToSave = {
      mealsDone: meals,
      workoutDone,
      waterGlasses: water,
      sleepScore: sleep,
      mentalCheckin: mental,
    };

    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(dataToSave));
      const uid = auth.currentUser?.uid;
      if (uid) {
        await saveDailyProgress(uid, {
          waterGlasses: water,
          mealsDone: meals,
          workoutDone,
          sleepScore: sleep,
          mentalCheckin: mental,
          streakDays: 1,
        });
      }
    } catch (err) {
      console.error('Erreur sauvegarde progression quotidienne:', err);
    }
  }, []);

  const checkMeal = useCallback((id: string) => {
    setCheckedMeals(prev => {
      const next = new Set([...prev, id]);
      persistState(Array.from(next), workoutRef.current, waterRef.current, sleepRef.current, mentalRef.current);
      return next;
    });
  }, [persistState]);

  const uncheckMeal = useCallback((id: string) => {
    setCheckedMeals(prev => {
      const next = new Set(prev);
      next.delete(id);
      persistState(Array.from(next), workoutRef.current, waterRef.current, sleepRef.current, mentalRef.current);
      return next;
    });
  }, [persistState]);

  const completeWorkout = useCallback((sessionDetails?: { sessionId: string; sessionTitle: string; durationSec: number; totalSets: number }) => {
    setWorkoutDone(true);
    persistState(Array.from(mealsRef.current), true, waterRef.current, sleepRef.current, mentalRef.current);

    if (!sessionDetails) return;

    // 1. Écriture locale immédiate : la séance est conservée même hors-ligne / hors compte.
    const entry = useWorkoutHistoryStore.getState().addCompleted(sessionDetails);
    if (!entry) return;

    useProgramStore.getState().incrementCompletedWorkouts();

    // 2. Synchronisation Firestore, marquée seulement si elle aboutit.
    const uid = auth.currentUser?.uid;
    if (uid) {
      saveCompletedWorkout(uid, sessionDetails)
        .then((ok) => {
          if (ok) useWorkoutHistoryStore.getState().markSynced(entry.id);
        })
        .catch((err) => console.warn('Sync séance différée:', err));
    }
  }, [persistState]);

  const addWater = useCallback(() => {
    setWater(prev => {
      const next = Math.min(prev + 1, TOTAL_WATER);
      persistState(Array.from(mealsRef.current), workoutRef.current, next, sleepRef.current, mentalRef.current);
      return next;
    });
  }, [persistState]);

  const removeWater = useCallback(() => {
    setWater(prev => {
      const next = Math.max(prev - 1, 0);
      persistState(Array.from(mealsRef.current), workoutRef.current, next, sleepRef.current, mentalRef.current);
      return next;
    });
  }, [persistState]);

  const setSleepScore = useCallback((score: number) => {
    setSleep(score);
    persistState(Array.from(mealsRef.current), workoutRef.current, waterRef.current, score, mentalRef.current);
  }, [persistState]);

  const toggleMentalCheckin = useCallback(() => {
    setMental(prev => {
      const next = !prev;
      persistState(Array.from(mealsRef.current), workoutRef.current, waterRef.current, sleepRef.current, next);
      return next;
    });
  }, [persistState]);

  const calorieCtx = useCalorie();
  const calorieEntriesCount = calorieCtx?.entries?.length || 0;
  const history = useWorkoutHistoryStore(st => st.history);
  const hasWorkoutToday = history.some(w => w.dateKey === todayKey());
  const isWorkoutDone = workoutCompleted || hasWorkoutToday;

  const totalLoggedMeals = Math.max(checkedMealIds.size, calorieEntriesCount);
  const mealsCount = totalLoggedMeals;
  const targetMealsCount = Math.max(TOTAL_MEALS, mealsCount);
  const mealsPct   = Math.min(100, Math.round((mealsCount / targetMealsCount) * 100));
  const workoutPct = isWorkoutDone ? 100 : 0;
  const waterPct   = Math.min(100, Math.round((waterGlasses / TOTAL_WATER) * 100));
  const sleepPct   = Math.round((sleepScore / 5) * 100);
  const mentalPct  = mentalCheckin ? 100 : 0;

  // Calcul du score global d'Ascension (P1: 30%, P2: 35%, P3: 20%, P4: 15%)
  const p1Score = (mealsPct * 0.6) + (waterPct * 0.4);
  const ascensionScore = Math.round((p1Score * 0.30) + (workoutPct * 0.35) + (sleepPct * 0.20) + (mentalPct * 0.15));

  return (
    <Ctx.Provider value={{
      checkedMealIds, workoutCompleted, waterGlasses, sleepScore, mentalCheckin,
      checkMeal, uncheckMeal, completeWorkout, addWater, removeWater, setSleepScore, toggleMentalCheckin,
      mealsPct, workoutPct, waterPct, sleepPct, mentalPct, ascensionScore, mealsCount,
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
