/**
 * DailyProgressContext
 * State partagé pour la progression quotidienne.
 * Sauvegarde et synchronise en temps réel avec AsyncStorage & Firestore.
 * Reset automatique à chaque nouveau jour local.
 */
import React, { createContext, useCallback, useContext, useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
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

const EMPTY_DAY = {
  workoutDone: false,
  waterGlasses: 0,
  mealsDone: [] as string[],
  sleepScore: 0,
  mentalCheckin: false,
};

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

  const mealsRef = useRef(checkedMealIds);
  mealsRef.current = checkedMealIds;
  const workoutRef = useRef(workoutCompleted);
  workoutRef.current = workoutCompleted;
  const waterRef = useRef(waterGlasses);
  waterRef.current = waterGlasses;
  const sleepRef = useRef(sleepScore);
  sleepRef.current = sleepScore;
  const mentalRef = useRef(mentalCheckin);
  mentalRef.current = mentalCheckin;
  const loadedDateRef = useRef<string>(todayKey());

  const applyEmptyDay = useCallback(() => {
    setCheckedMeals(new Set());
    setWorkoutDone(false);
    setWater(0);
    setSleep(0);
    setMental(false);
  }, []);

  const loadProgressForUser = useCallback(async (uid: string | null) => {
    calculateAndUpdateStreak();
    const key = todayKey();
    loadedDateRef.current = key;
    const storageKey = `daily_progress_${key}`;

    try {
      const local = await AsyncStorage.getItem(storageKey);
      let currentWorkoutDone = false;
      let currentWater = 0;
      let currentMeals: string[] = [];
      let currentSleep = 0;
      let currentMental = false;
      const hasLocal = !!local;

      if (local) {
        const parsed = JSON.parse(local);
        currentWorkoutDone = !!parsed.workoutDone;
        currentWater = Number(parsed.waterGlasses) || 0;
        currentMeals = Array.isArray(parsed.mealsDone) ? parsed.mealsDone : [];
        currentSleep = Number(parsed.sleepScore) || 0;
        currentMental = !!parsed.mentalCheckin;
        setWorkoutDone(currentWorkoutDone);
        setWater(currentWater);
        setCheckedMeals(new Set(currentMeals));
        setSleep(currentSleep);
        setMental(currentMental);
      } else {
        // Nouveau jour local : partir de zéro (pas de report d'hier)
        applyEmptyDay();
      }

      if (uid && uid !== 'local_user' && auth.currentUser) {
        const remote = await getTodayProgress(uid);
        // N'accepter le remote que s'il porte bien la date du jour local
        if (remote && (!remote.date || remote.date === key)) {
          // Si aucune donnée locale pour aujourd'hui, ne pas importer un seed "prérempli"
          // sauf si l'utilisateur a réellement progressé (workout / meals).
          const remoteWater = Number(remote.waterGlasses) || 0;
          const remoteSleep = Number(remote.sleepScore) || 0;
          const remoteMeals = Array.isArray(remote.mealsDone) ? remote.mealsDone : [];
          const remoteWorkout = !!remote.workoutDone;
          const remoteMental = !!remote.mentalCheckin;
          const remoteHasUserActivity =
            remoteWorkout || remoteMeals.length > 0 || remoteMental || remoteSleep > 0;

          if (!hasLocal && !remoteHasUserActivity && remoteWater > 0 && remoteSleep === 0) {
            // Seed démo hydratation seule → ignorer pour un 1er open du jour
            await AsyncStorage.setItem(storageKey, JSON.stringify(EMPTY_DAY));
            applyEmptyDay();
            return;
          }

          const finalWorkoutDone = currentWorkoutDone || remoteWorkout;
          const finalMeals = Array.from(new Set([...currentMeals, ...remoteMeals]));
          const finalMental = currentMental || remoteMental;
          // Eau / sommeil : local prioritaire si déjà écrit aujourd'hui ; sinon remote
          const finalWater = hasLocal ? Math.max(currentWater, remoteWater) : (remoteHasUserActivity ? remoteWater : 0);
          const finalSleep = hasLocal
            ? (currentSleep > 0 ? currentSleep : remoteSleep)
            : (remoteHasUserActivity ? remoteSleep : 0);

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
  }, [applyEmptyDay]);

  // Charger au démarrage / auth + reset si le jour a changé
  useEffect(() => {
    let isMounted = true;

    const boot = async () => {
      if (!isMounted) return;
      await loadProgressForUser(auth.currentUser?.uid ?? null);
    };
    boot();

    const unsubAuth = auth.onAuthStateChanged((user) => {
      loadProgressForUser(user ? user.uid : null);
    });

    const onAppState = (state: AppStateStatus) => {
      if (state !== 'active') return;
      const key = todayKey();
      if (key !== loadedDateRef.current) {
        applyEmptyDay();
        loadProgressForUser(auth.currentUser?.uid ?? null);
      }
    };
    const sub = AppState.addEventListener('change', onAppState);

    // Filet de sécurité si l'app reste ouverte après minuit
    const interval = setInterval(() => {
      const key = todayKey();
      if (key !== loadedDateRef.current) {
        applyEmptyDay();
        loadProgressForUser(auth.currentUser?.uid ?? null);
      }
    }, 60_000);

    return () => {
      isMounted = false;
      unsubAuth();
      sub.remove();
      clearInterval(interval);
    };
  }, [loadProgressForUser, applyEmptyDay]);

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
    const key = todayKey();
    // Si on persiste un autre jour que celui chargé, recharger d'abord
    if (key !== loadedDateRef.current) {
      loadedDateRef.current = key;
    }
    const storageKey = `daily_progress_${key}`;
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

    const entry = useWorkoutHistoryStore.getState().addCompleted(sessionDetails);
    if (!entry) return;

    useProgramStore.getState().incrementCompletedWorkouts();

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
