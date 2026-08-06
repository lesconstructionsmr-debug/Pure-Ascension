import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'fr' | 'en';

const STORAGE_KEY = 'pure_ascension_language';

const translations = {
  fr: {
    home: "Accueil",
    workouts: "Entraînements",
    nutrition: "Nutrition",
    coach: "Coach IA",
    profile: "Profil",
    wearables: "Appareils Connectés",
    testflight_btn: "Tester sur iOS (TestFlight)",
    scan_meal_btn: "Scanner un repas",
    grocery_btn: "Liste de courses",
    referral_btn: "Inviter un ami (+15j)",
    greeting_morning: "Bonjour",
    greeting_afternoon: "Bon après-midi",
    greeting_evening: "Bonsoir",
    program_completion: "du programme",
    sessions_completed: "séances",
    ascension_score: "Score d'Ascension",
    daily_habits: "Objectifs du Jour",
    water_tracker: "Hydratation (Zone 2)",
    calories_tracker: "Calories & Macros",
    todays_workout: "Séance du jour",
    start_session: "Démarrer la séance",
    active_program: "Programme Actif",
    week: "Semaine",
    day: "Jour",
    membership: "Formule d'Abonnement",
    membership_free: "Accès Libre",
    membership_premium: "Expérience Complète Premium",
    language_switcher: "Langue / Language",
    disclaimer: "Pure Ascension est un outil de coaching fitness et nutrition. Il ne remplace pas un avis médical professionnel.",
    swap_exercise: "Adapter l'exercice",
    joint_comfort: "Gêne articulaire",
    personal_preference: "Préférence personnelle",
    biomechanical_engine: "Moteur Biomécanique",
    close: "Fermer",
    save: "Enregistrer",
    cancel: "Annuler",
    confirm: "Confirmer",
    loading: "Chargement...",
  },
  en: {
    home: "Home",
    workouts: "Workouts",
    nutrition: "Nutrition",
    coach: "AI Coach",
    profile: "Profile",
    wearables: "Connected Devices",
    testflight_btn: "Test on iOS (TestFlight)",
    scan_meal_btn: "Scan meal with AI",
    grocery_btn: "Grocery list",
    referral_btn: "Invite a friend (+15 days)",
    greeting_morning: "Good morning",
    greeting_afternoon: "Good afternoon",
    greeting_evening: "Good evening",
    program_completion: "of program",
    sessions_completed: "sessions",
    ascension_score: "Ascension Score",
    daily_habits: "Daily Objectives",
    water_tracker: "Hydration (Zone 2)",
    calories_tracker: "Calories & Macros",
    todays_workout: "Today's Session",
    start_session: "Start Session",
    active_program: "Active Program",
    week: "Week",
    day: "Day",
    membership: "Subscription Plan",
    membership_free: "Free Access",
    membership_premium: "Premium Full Experience",
    language_switcher: "Language / Langue",
    disclaimer: "Pure Ascension is a fitness and nutrition coaching tool. It does not replace professional medical advice.",
    swap_exercise: "Swap Exercise",
    joint_comfort: "Joint discomfort",
    personal_preference: "Personal preference",
    biomechanical_engine: "Biomechanical Engine",
    close: "Close",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    loading: "Loading...",
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const fallbackContext: LanguageContextType = {
  language: 'fr',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string) => (translations.fr as any)[key] || key,
};

const LanguageContext = createContext<LanguageContextType>(fallbackContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('fr');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved === 'fr' || saved === 'en') {
        setLanguageState(saved);
      }
    }).catch(() => {});
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
  };

  const toggleLanguage = () => {
    const next = language === 'fr' ? 'en' : 'fr';
    setLanguage(next);
  };

  const t = (key: string): string => {
    const dict = translations[language] || translations.fr;
    return (dict as any)[key] || (translations.fr as any)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  return ctx || fallbackContext;
};
