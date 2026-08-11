import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

declare var process: any;

/**
 * Projet Firebase réel : pure-ascension / 311570100137
 * Web  → app `pure-ascension-web`
 * iOS  → app `Pure Ascension iOS` (GoogleService-Info.plist)
 */
const webConfig = {
  // Clés client Firebase : via env uniquement (jamais hardcodées — scan Netlify / AGENTS.md).
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'pure-ascension.firebaseapp.com',
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'pure-ascension',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'pure-ascension.firebasestorage.app',
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '311570100137',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

const iosConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_IOS_API_KEY || '',
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
  appId: process.env.EXPO_PUBLIC_FIREBASE_IOS_APP_ID || '',
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
