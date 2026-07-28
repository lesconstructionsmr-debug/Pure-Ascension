import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp, onSnapshot, collection, addDoc, query, where, getDocs
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
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    const cleanProfile = cleanObject(profile);
    
    if (snap.exists()) {
      // L'utilisateur existe déjà — mise à jour du profil uniquement (préserve l'abonnement Stripe & parrainage)
      await setDoc(userRef, {
        profile: cleanProfile,
        goal,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      // Nouvel utilisateur — création initiale avec champs d'abonnements et de parrainage par défaut
      await setDoc(userRef, {
        profile: cleanProfile,
        goal,
        stripe_subscription_status: 'inactive',
        planLevel: 'none',
        isPremium: false,
        referralCode: null,
        referredBy: null,
        referralCount: 0,
        rewardsEarned: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  } catch (err) {
    console.warn('saveUserProfile: erreur réseau/offline Firestore (sauvegarde locale conservée)', err);
  }
}

export async function saveUserProfileAndProgram(uid: string, profile: UserProfile, program: any, goal: string) {
  try {
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
        referralCode: null,
        referredBy: null,
        referralCount: 0,
        rewardsEarned: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  } catch (err) {
    console.warn('saveUserProfileAndProgram: erreur réseau/offline Firestore (sauvegarde locale conservée)', err);
  }
}

export async function getUserData(uid: string) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn('getUserData: erreur réseau/offline Firestore', err);
    return null;
  }
}

export function listenToUserData(uid: string, callback: (data: any, isError?: boolean) => void) {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    callback(snap.exists() ? snap.data() : null, false);
  }, (err) => {
    console.error('Erreur listenToUserData Firestore:', err);
    callback(null, true);
  });
}

/* ── Referral DB Helpers ────────────────────────────────────────────────── */
export async function getUserByReferralCode(code: string) {
  try {
    const cleanCode = code.trim().toUpperCase();
    const q = query(collection(db, 'users'), where('referralCode', '==', cleanCode));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      const userDoc = querySnap.docs[0];
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (err) {
    console.warn('getUserByReferralCode: erreur réseau/offline Firestore', err);
    return null;
  }
}

export async function updateUserReferralInfo(
  uid: string,
  referralData: Partial<{
    referralCode: string;
    referredBy: string | null;
    referralCount: number;
    rewardsEarned: number;
  }>
) {
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      ...referralData,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('updateUserReferralInfo: erreur réseau/offline Firestore', err);
  }
}

export async function getReferralsByReferrer(referrerUid: string) {
  try {
    const q = query(collection(db, 'users'), where('referredBy', '==', referrerUid));
    const querySnap = await getDocs(q);
    return querySnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('getReferralsByReferrer: erreur réseau/offline Firestore', err);
    return [];
  }
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
  sleepScore?: number;
  mentalCheckin?: boolean;
}) {
  try {
    const key = todayKey();
    const payload = { ...data, date: key, updatedAt: serverTimestamp() };
    await setDoc(doc(db, 'users', uid, 'progress', key), payload, { merge: true });
    await setDoc(doc(db, 'users', uid, 'dailyProgress', key), payload, { merge: true });
  } catch (err) {
    console.warn('saveDailyProgress: envoi différé ou hors-ligne Firestore', err);
  }
}

/** Retourne true si la séance a bien été écrite sur Firestore (false = à resynchroniser). */
export async function saveCompletedWorkout(uid: string, workout: {
  sessionId: string;
  sessionTitle: string;
  durationSec: number;
  totalSets: number;
}): Promise<boolean> {
  try {
    const key = todayKey();
    
    // 1. Enregistrer dans la collection d'historique de séances
    await addDoc(collection(db, 'users', uid, 'workouts'), {
      sessionId: workout.sessionId,
      sessionTitle: workout.sessionTitle,
      durationSec: workout.durationSec,
      totalSets: workout.totalSets,
      workoutDone: true,
      completedAt: serverTimestamp(),
      date: key,
    });

    // 2. Mettre à jour la progression quotidienne
    await setDoc(
      doc(db, 'users', uid, 'progress', key),
      { workoutDone: true, date: key, updatedAt: serverTimestamp() },
      { merge: true }
    );

    // 3. Incrémenter le compteur total de séances complétées
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    const currentCount = userSnap.exists() ? (userSnap.data().completedWorkoutsCount || 0) : 0;
    await setDoc(
      userRef,
      { completedWorkoutsCount: currentCount + 1, updatedAt: serverTimestamp() },
      { merge: true }
    );

    return true;
  } catch (err) {
    console.warn('saveCompletedWorkout: envoi différé ou hors-ligne Firestore', err);
    return false;
  }
}

export async function getTodayProgress(uid: string) {
  try {
    const key = todayKey();
    const snap = await getDoc(doc(db, 'users', uid, 'progress', key));
    if (snap.exists()) return snap.data();
    const snap2 = await getDoc(doc(db, 'users', uid, 'dailyProgress', key));
    return snap2.exists() ? snap2.data() : null;
  } catch (err) {
    console.warn('getTodayProgress: erreur réseau/offline Firestore', err);
    return null;
  }
}

export async function updateStreak(uid: string, streakDays: number) {
  try {
    await updateDoc(doc(db, 'users', uid), { streakDays, updatedAt: serverTimestamp() });
  } catch (err) {
    console.warn('updateStreak: envoi différé ou hors-ligne Firestore', err);
  }
}

export async function setUserPlan(uid: string, planLevel: 'free' | 'standard' | 'premium') {
  try {
    await updateDoc(doc(db, 'users', uid), { planLevel, updatedAt: serverTimestamp() });
  } catch (err) {
    console.warn('setUserPlan: envoi différé ou hors-ligne Firestore', err);
  }
}

export async function saveDailyCalories(uid: string, data: {
  entries: any[];
  goalKcal: number;
}) {
  try {
    const key = todayKey();
    const payload = { foodEntries: data.entries, goalKcal: data.goalKcal, date: key, updatedAt: serverTimestamp() };
    await setDoc(doc(db, 'users', uid, 'progress', key), payload, { merge: true });
    await setDoc(doc(db, 'users', uid, 'dailyProgress', key), payload, { merge: true });
  } catch (err) {
    console.warn('saveDailyCalories: envoi différé ou hors-ligne Firestore', err);
  }
}

