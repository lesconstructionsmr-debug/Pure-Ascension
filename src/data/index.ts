// ─── Questionnaire types ────────────────────────────────────────────────────
export type TrainingExperience = 'débutante' | 'intermédiaire' | 'avancée';
export type MainGoal           = 'muscle' | 'gras' | 'tone' | 'force';
export type TrainingFrequency  = 3 | 4 | 5;
export type GymAccess          = 'full' | 'limited' | 'home';
export type SessionDuration    = 30 | 45 | 60;

export type DietaryRestriction =
  | 'sans-gluten' | 'sans-lactose' | 'végétarien' | 'végétalien'
  | 'sans-noix'   | 'halal'        | 'casher'      | 'sans-porc';

export interface UserProfile {
  // Mesures
  heightCm:       number;
  currentWeightKg: number;
  targetWeightKg:  number;
  currentBFPct:   number;
  targetBFPct:    number;
  // Entraînement
  experience:     TrainingExperience;
  mainGoal:       MainGoal;
  frequency:      TrainingFrequency;
  gymAccess:      GymAccess;
  sessionDuration: SessionDuration;
  // Sport & discipline (optionnel, pertinent si objectif = performance)
  sportDiscipline?:    string;
  // Santé & alimentation
  dietaryRestrictions: DietaryRestriction[];
  healthConditions:    string;   // texte libre + options pré-def
  otherNotes?:         string;
}

export interface User {
  id: string; firstName: string; lastName: string; avatarUri?: string;
  programName: string; memberTier: string;
  profile?: UserProfile;
  stats: { streakDays: number; weightChange: number; totalSessions: number };
}
export interface Program {
  id: string; name: string; eyebrow: string;
  currentDay: number; totalDays: number; currentWeek: number; totalWeeks: number;
  completionPct: number; streakDays: number; tagline: string;
}
export interface DailyProgress {
  nutrition: { completed: number; total: number; pct: number };
  training:  { completed: number; total: number; pct: number };
  hydration: { currentL: number; targetL: number; pct: number };
}
export type Macro = { proteins: number; carbs: number; fats: number };
export interface MealIngredient { name: string; qty: string; }
export interface Meal {
  id: string; name: string; time: string; type: string; calories: number;
  protein: number; carbs: number; fat: number;
  macros: Macro; done: boolean; completed: boolean; order: number;
  prepTime?: string;
  ingredients?: MealIngredient[];
  steps?: string[];
  nutritionNote?: string;
}
export interface MealDay {
  date: string; targetCalories: number; consumedCalories: number; meals: Meal[];
}
export interface Exercise {
  id: string; name: string; sets: number; reps: number | string; done: boolean; notes?: string;
}
export interface WorkoutSession {
  id: string; title: string; category: string; duration: number;
  exerciseCount: number; completionPct: number; isToday: boolean;
  exercises: Exercise[]; badgeLabel?: string;
  day?: string; // "Lundi", "Mardi"… — jour planifié dans la semaine
}

export function formatNumber(n: number, decimals = 0): string {
  const parts = n.toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join(',');
}

export const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
