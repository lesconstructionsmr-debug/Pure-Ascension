import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from '../data';

/* ── User profile ─────────────────────────────────────────────────────────── */
export async function saveUserProfile(uid: string, profile: UserProfile, goal: string) {
  await setDoc(doc(db, 'users', uid), {
    profile,
    goal,
    stripe_subscription_status: 'inactive', // Statut d'abonnement initial par défaut
    planLevel: 'none',                      // Force l'affichage du paywall
    isPremium: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getUserData(uid: string) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export function listenToUserData(uid: string, callback: (data: any) => void) {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

/* ── Daily progress ───────────────────────────────────────────────────────── */
function todayKey() {
  return new Date().toISOString().slice(0, 10); // "2026-06-21"
}

export async function saveDailyProgress(uid: string, data: {
  waterGlasses: number;
  mealsDone: string[];
  workoutDone: boolean;
  streakDays: number;
}) {
  const key = todayKey();
  await setDoc(
    doc(db, 'users', uid, 'progress', key),
    { ...data, date: key, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function getTodayProgress(uid: string) {
  const snap = await getDoc(doc(db, 'users', uid, 'progress', todayKey()));
  return snap.exists() ? snap.data() : null;
}

export async function updateStreak(uid: string, streakDays: number) {
  await updateDoc(doc(db, 'users', uid), { streakDays, updatedAt: serverTimestamp() });
}

export async function setUserPlan(uid: string, planLevel: 'free' | 'standard' | 'premium') {
  await updateDoc(doc(db, 'users', uid), { planLevel, updatedAt: serverTimestamp() });
}
