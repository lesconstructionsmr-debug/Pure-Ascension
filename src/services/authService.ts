import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function signUp(email: string, password: string, name: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  
  const referralCode = `ASCEND-${name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)}-${cred.user.uid.slice(-4).toUpperCase()}`;
  await setDoc(doc(db, 'users', cred.user.uid), {
    referralCode,
    stripe_subscription_status: 'inactive',
    planLevel: 'none',
    isPremium: false,
    referralCount: 0,
    rewardsEarned: 0
  });

  return cred.user;
}

export async function signIn(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

/** Envoie un e-mail Firebase de réinitialisation de mot de passe. */
export async function resetPassword(email: string): Promise<void> {
  const trimmed = email.trim();
  if (!trimmed) {
    throw Object.assign(new Error('E-mail requis'), { code: 'auth/missing-email' });
  }
  await sendPasswordResetEmail(auth, trimmed);
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  
  const userRef = doc(db, 'users', cred.user.uid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    const name = cred.user.displayName || 'GUERRIER';
    const referralCode = `ASCEND-${name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)}-${cred.user.uid.slice(-4).toUpperCase()}`;
    await setDoc(userRef, {
      referralCode,
      stripe_subscription_status: 'inactive',
      planLevel: 'none',
      isPremium: false,
      referralCount: 0,
      rewardsEarned: 0
    });
  } else if (!userDoc.data().referralCode) {
    const name = cred.user.displayName || 'GUERRIER';
    const referralCode = `ASCEND-${name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)}-${cred.user.uid.slice(-4).toUpperCase()}`;
    await setDoc(userRef, { referralCode }, { merge: true });
  }

  return cred.user;
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
