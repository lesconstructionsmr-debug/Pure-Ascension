/**
 * useStreak
 * Streak quotidien persisté dans AsyncStorage.
 * Règle : si l'utilisatrice ouvre l'app aujourd'hui → streak monte.
 * Si elle saute un jour → streak repart à 1.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export function useStreak() {
  const [streak, setStreak] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [savedStreak, lastDate] = await Promise.all([
          AsyncStorage.getItem(KEY_STREAK),
          AsyncStorage.getItem(KEY_LAST_DATE),
        ]);

        const today     = todayStr();
        const yesterday = yesterdayStr();
        const current   = savedStreak ? parseInt(savedStreak, 10) : 0;

        let newStreak = current;

        if (lastDate === today) {
          // Déjà compté aujourd'hui — rien à faire
          newStreak = current;
        } else if (lastDate === yesterday) {
          // Hier → on incrémente
          newStreak = current + 1;
          await AsyncStorage.setItem(KEY_STREAK,    String(newStreak));
          await AsyncStorage.setItem(KEY_LAST_DATE, today);
        } else {
          // Raté un jour ou premier lancement → repart à 1
          newStreak = 1;
          await AsyncStorage.setItem(KEY_STREAK,    '1');
          await AsyncStorage.setItem(KEY_LAST_DATE, today);
        }

        setStreak(newStreak);
      } catch {
        setStreak(1); // fallback silencieux
      } finally {
        setLoaded(true);
      }
    };
    init();
  }, []);

  return { streak, loaded };
}
