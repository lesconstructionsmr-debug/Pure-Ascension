/**
 * CalorieContext — suivi calorique journalier
 * Gère les entrées alimentaires + objectif + totaux macro.
 * Persiste localement via AsyncStorage et se synchronise avec Firestore.
 */
import React, { createContext, useCallback, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../services/firebase';
import { saveDailyCalories, getTodayProgress } from '../services/dbService';

export interface FoodEntry {
  id:        string;
  name:      string;
  kcal:      number;
  proteins:  number;
  carbs:     number;
  fats:      number;
  fibers?:   number;
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
  addEntry:     (e: FoodEntry | Omit<FoodEntry, 'id' | 'time'>) => void;
  removeEntry:  (id: string) => void;
  setGoal:      (kcal: number) => void;
}

const Ctx = createContext<CalorieCtx | null>(null);

function todayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export const CalorieProvider: React.FC<{ children: React.ReactNode; initialGoal?: number }> = ({
  children, initialGoal = 1800,
}) => {
  const [entries,  setEntries] = useState<FoodEntry[]>([]);
  const [goalKcal, setGoalKcal] = useState(initialGoal);

  const entriesRef = useRef<FoodEntry[]>(entries);
  entriesRef.current = entries;
  const goalKcalRef = useRef<number>(goalKcal);
  goalKcalRef.current = goalKcal;

  // Charger les calories du jour au démarrage et à la connexion
  useEffect(() => {
    let isMounted = true;

    const loadCaloriesForUser = async (uid: string | null) => {
      const storageKey = `daily_calories_${todayKey()}`;
      try {
        // 1. Charger d'abord localement pour affichage immédiat
        const local = await AsyncStorage.getItem(storageKey);
        let currentLocalEntries: FoodEntry[] = [];
        let currentLocalGoal = initialGoal;

        if (local && isMounted) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed.entries)) {
            setEntries(parsed.entries);
            currentLocalEntries = parsed.entries;
          }
          if (parsed.goalKcal !== undefined) {
            setGoalKcal(parsed.goalKcal);
            currentLocalGoal = parsed.goalKcal;
          }
        }

        // 2. Si connecté, synchroniser avec Firestore sans écraser les données locales
        if (uid) {
          const remote = await getTodayProgress(uid);
          if (remote && isMounted) {
            let finalEntries = currentLocalEntries;
            if (Array.isArray(remote.foodEntries)) {
              const localMap = new Map(currentLocalEntries.map(e => [e.id, e]));
              remote.foodEntries.forEach((rEntry: FoodEntry) => {
                if (!localMap.has(rEntry.id)) {
                  localMap.set(rEntry.id, rEntry);
                }
              });
              finalEntries = Array.from(localMap.values());
            }
            const finalGoal = remote.goalKcal !== undefined ? remote.goalKcal : currentLocalGoal;

            setEntries(finalEntries);
            setGoalKcal(finalGoal);

            await AsyncStorage.setItem(storageKey, JSON.stringify({
              entries: finalEntries,
              goalKcal: finalGoal,
            }));
          }
        }
      } catch (err) {
        console.error('Erreur chargement calories quotidiennes:', err);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      loadCaloriesForUser(user ? user.uid : null);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const persistState = useCallback(async (newEntries: FoodEntry[], newGoal: number) => {
    const storageKey = `daily_calories_${todayKey()}`;
    const dataToSave = {
      entries: newEntries,
      goalKcal: newGoal,
    };

    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(dataToSave));
      const uid = auth.currentUser?.uid;
      if (uid) {
        await saveDailyCalories(uid, {
          entries: newEntries,
          goalKcal: newGoal,
        });
      }
    } catch (err) {
      console.error('Erreur sauvegarde calories quotidiennes:', err);
    }
  }, []);

  const addEntry = useCallback((e: FoodEntry | Omit<FoodEntry, 'id' | 'time'>) => {
    setEntries(prev => {
      const entryId = ('id' in e && e.id) ? e.id : Date.now().toString();
      const entryTime = ('time' in e && e.time) ? e.time : nowHHMM();
      const newEntry: FoodEntry = {
        id: entryId,
        name: e.name,
        kcal: Number(e.kcal) || 0,
        proteins: Number(e.proteins) || 0,
        carbs: Number(e.carbs) || 0,
        fats: Number(e.fats) || 0,
        ...(e.fibers !== undefined && e.fibers > 0 ? { fibers: Number(e.fibers) || 0 } : {}),
        time: entryTime,
      };
      const next = [...prev, newEntry];
      persistState(next, goalKcalRef.current);
      return next;
    });
  }, [persistState]);

  const removeEntry = useCallback((id: string) => {
    setEntries(prev => {
      const next = prev.filter(e => e.id !== id);
      persistState(next, goalKcalRef.current);
      return next;
    });
  }, [persistState]);

  const setGoal = useCallback((kcal: number) => {
    setGoalKcal(kcal);
    persistState(entriesRef.current, kcal);
  }, [persistState]);

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
