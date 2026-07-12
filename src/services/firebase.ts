import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDeycItIcKPO5aGxcxjXa6wwEYoFK4Qa68",
  authDomain: "pure-ascension.firebaseapp.com",
  projectId: "pure-ascension",
  storageBucket: "pure-ascension.firebasestorage.app",
  messagingSenderId: "311570100137",
  appId: "1:311570100137:web:1bb06bca9e1b4683e45eb8",
  measurementId: "G-6DB5T60L6V",
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
