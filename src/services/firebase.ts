import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

declare var process: any;

/**
 * Config Web (Netlify) — app Firebase `pure-ascension-web`
 * Config iOS — depuis GoogleService-Info.plist (app `Pure Ascension iOS`)
 *
 * Sur iOS on DOIT utiliser l'appId / apiKey iOS du même projet Firebase.
 */
const webConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyDeycItIcKPO5aGxcxjXa6wwEYoFK4Qa68',
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'pure-ascension.firebaseapp.com',
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'pure-ascension',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'pure-ascension.appspot.com',
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1052601934988',
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    '1:1052601934988:web:75f560e90c64df192931a1',
};

/** Valeurs lues depuis GoogleService-Info.plist (app iOS enregistrée). */
const iosConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_IOS_API_KEY ||
    'AIzaSyBJacqAfNf7MqVMCsDT7YgA9s2Sb-rcqtE',
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'pure-ascension.firebaseapp.com',
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'pure-ascension',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_IOS_STORAGE_BUCKET ||
    'pure-ascension.firebasestorage.app',
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_IOS_MESSAGING_SENDER_ID || '311570100137',
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_IOS_APP_ID ||
    '1:311570100137:ios:ba0a6e3f3f80fdd8e45eb8',
};

const firebaseConfig = Platform.OS === 'ios' ? iosConfig : webConfig;

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

function createAuth() {
  if (Platform.OS === 'web') {
    return getAuth(app);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getReactNativePersistence } = require('firebase/auth');
    if (typeof getReactNativePersistence === 'function') {
      return initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }
  } catch {
    // Auth déjà initialisé (Fast Refresh) ou export absent
  }

  return getAuth(app);
}

export const auth = createAuth();
export const db = getFirestore(app);
