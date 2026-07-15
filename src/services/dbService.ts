import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from '../data';

export function cleanObject(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => typeof item === 'object' ? cleanObject(item) : item);
  }
  if (typeof obj === 'object') {
    if (obj.constructor && obj.constructor.name !== 'Object' && obj.constructor.name !== 'Array') {
      return obj;
    }
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) {
        cleaned[key] = cleanObject(obj[key]);
      }
    });
    return cleaned;
  }
  return obj;
}

/* ── User profile ─────────────────────────────────────────────────────────── */
export async function saveUserProfile(uid: string, profile: UserProfile, goal: string) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const cleanProfile = cleanObject(profile);
  
  if (snap.exists()) {
    // L'utilisateur existe déjà — mise à jour du profil uniquement (préserve l'abonnement Stripe)
    await setDoc(userRef, {
      profile: cleanProfile,
      goal,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } else {
    // Nouvel utilisateur — création initiale avec champs d'abonnements par défaut
    await setDoc(userRef, {
      profile: cleanProfile,
      goal,
      stripe_subscription_status: 'inactive',
      planLevel: 'none',
      isPremium: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
}

export async function saveUserProfileAndProgram(uid: string, profile: UserProfile, program: any, goal: string) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const cleanProfile = cleanObject(profile);
  const cleanProg = cleanObject(program);
  
  if (snap.exists()) {
    await setDoc(userRef, {
      profile: cleanProfile,
      program: cleanProg,
      goal,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } else {
    await setDoc(userRef, {
      profile: cleanProfile,
      program: cleanProg,
      goal,
      stripe_subscription_status: 'inactive',
      planLevel: 'none',
      isPremium: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
}

export async function getUserData(uid: string) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export function listenToUserData(uid: string, callback: (data: any) => void) {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  }, (err) => {
    console.error('Erreur listenToUserData Firestore:', err);
    callback(null);
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
