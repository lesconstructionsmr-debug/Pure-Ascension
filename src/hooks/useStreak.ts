/**
 * useStreak & calculateAndUpdateStreak
 * Gestion réactive du Streak (série de jours consécutifs d'utilisation).
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../services/firebase';
import { updateStreak } from '../services/dbService';
import { useProgramStore } from '../store/useProgramStore';

const KEY_STREAK     = '@pureascension:streak';
const KEY_LAST_DATE  = '@pureascension:lastDate';

function todayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function calculateAndUpdateStreak(): Promise<number> {
  try {
    const [savedStreak, lastDate] = await Promise.all([
      AsyncStorage.getItem(KEY_STREAK),
      AsyncStorage.getItem(KEY_LAST_DATE),
    ]);

    const today     = todayStr();
    const yesterday = yesterdayStr();
    const current   = savedStreak ? parseInt(savedStreak, 10) : 0;

    let newStreak = 1;

    if (lastDate === today) {
      // Déjà connecté aujourd'hui : on conserve au moins le streak courant (minimum 1)
      newStreak = Math.max(1, current);
    } else if (lastDate === yesterday) {
      // Connexion le jour suivant : on incrémente la série
      newStreak = Math.max(1, current) + 1;
      await AsyncStorage.setItem(KEY_STREAK, String(newStreak));
      await AsyncStorage.setItem(KEY_LAST_DATE, today);
    } else {
      // Premier jour ou jour manqué : on initialise à 1
      newStreak = 1;
      await AsyncStorage.setItem(KEY_STREAK, '1');
      await AsyncStorage.setItem(KEY_LAST_DATE, today);
    }

    // Mettre à jour Zustand localement
    useProgramStore.getState().setStreakDays(newStreak);

    // Synchroniser avec Firestore si connecté
    const uid = auth.currentUser?.uid;
    if (uid) {
      updateStreak(uid, newStreak).catch(() => {});
    }

    return newStreak;
  } catch (err) {
    console.warn('Erreur calculateAndUpdateStreak:', err);
    useProgramStore.getState().setStreakDays(1);
    return 1;
  }
}

export function useStreak() {
  const [streak, setStreak] = useState(1);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    calculateAndUpdateStreak().then((val) => {
      if (isMounted) {
        setStreak(val);
        setLoaded(true);
      }
    });
    return () => { isMounted = false; };
  }, []);

  return { streak, loaded };
}
