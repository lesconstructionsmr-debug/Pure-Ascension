/**
 * programService — Le moteur d'IA & Génération Dynamique de Pure Ascension.
 * 
 * 1. Moteur de génération dynamique adapté au matériel exact de l'utilisateur
 *    (Salle complète, Haltères maison, Poids du corps & Kettlebell) et à son niveau réel.
 * 2. Structure chaque séance générée en 4 phases explicites :
 *    1. Échauffement Dynamique & Activation
 *    2. Mouvements Polyarticulaires Principaux
 *    3. Isolation & Supersets Métaboliques
 *    4. Finisher & Récupération P1-P4
 * 3. Périodisation sur 12 semaines (Semaines 1-4 Fondation, 5-8 Intensification, 9-11 Peak, 12 Deload)
 *    et service de substitution d'exercice par équivalence biomécanique.
 */
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { cleanObject } from './dbService';
import type { UserProfile, WorkoutSession, Exercise, GymAccess, TrainingExperience } from '../data';
import {
  isPregnancySafeMode,
  sanitizeExerciseName,
  capRpeForConditions,
} from '../utils/healthExerciseFilters';

/* ─── Types & Interfaces ─────────────────────────────────────────────────── */
export interface ProgramMacros { protein: number; carbs: number; fat: number }

export interface WeekPeriodizationConfig {
  week: number;
  phaseName: 'Fondation' | 'Intensification' | 'Peak' | 'Deload';
  phaseTitle: string;
  description: string;
  volumeMultiplier: number;
  repsCompound: string;
  repsIsolation: string;
  rpeTarget: string;
  tempo: string;
  restCompoundSec: number;
  restIsolationSec: number;
  finisherIntensity: string;
}

export interface GeneratedProgram {
  id:              string;
  name:            string;
  goal:            UserProfile['mainGoal'];
  experience:      UserProfile['experience'];
  frequency:       UserProfile['frequency'];
  sessionDuration: UserProfile['sessionDuration'];
  gymAccess:       UserProfile['gymAccess'];
  calories:        number;
  macros:          ProgramMacros;
  trainingDays:    string[];
  sessions:        WorkoutSession[];
  totalWeeks:      number;
  currentWeek?:    number;
  startDate:       string; // ISO — début du programme
  cardioZones?:    { z2: string; z3: string; z4: string; z5: string };
  cardioSport?:    UserProfile['cardioSport'];
  digestiveProtocol?: { condition: string; recommendation: string }[];
  periodizationConfig?: WeekPeriodizationConfig;
}

export interface BiomechanicalPatternInfo {
  id: string;
  patternName: string;
  primaryMuscles: string[];
  exercises: Record<GymAccess, string[]>;
  defaultNotes: string;
}

/* ─── Nom du programme selon objectif + expérience ──────────────────────── */
export function getProgramName(p: UserProfile): string {
  const names: Record<UserProfile['mainGoal'], Record<UserProfile['experience'], string>> = {
    muscle: { débutante: 'Force Fondation', intermédiaire: 'Force Avancée',     avancée: 'Force Élite'      },
    gras:   { débutante: 'Brûle & Sculpt',  intermédiaire: 'Métabolisme Actif', avancée: 'Fat Burner Pro'   },
    tone:   { débutante: 'Corps Léger',     intermédiaire: 'Corps Sculpté',     avancée: 'Corps Athlétique' },
    force:  { débutante: 'Puissance I',     intermédiaire: 'Puissance II',      avancée: 'Puissance Élite'  },
  };
  const safeGoal = (p.mainGoal && names[p.mainGoal]) ? p.mainGoal : 'muscle';
  const safeExp = (p.experience && names[safeGoal][p.experience]) ? p.experience : 'intermédiaire';
  return names[safeGoal]?.[safeExp] ?? 'Programme Sur-Mesure Pure Ascension';
}

/* ─── Calories cibles (Mifflin-St Jeor) ─────────────────────────────────── */
export function getCalories(p: UserProfile): number {
  const age = Number(p.age) || 28;
  const currentWeightKg = Number(p.currentWeightKg) || 70;
  const heightCm = Number(p.heightCm) || 165;

  const sexConst = p.sex === 'homme' ? 5 : p.sex === 'femme' ? -161 : -78;
  const bmr = 10 * currentWeightKg + 6.25 * heightCm - 5 * age + sexConst;

  const base: Record<NonNullable<UserProfile['activityLevel']>, number> = {
    sedentaire: 1.2, leger: 1.375, actif: 1.55, 'tres-actif': 1.725,
  };
  const activityLevel = p.activityLevel && base[p.activityLevel] ? p.activityLevel : 'leger';
  const frequency = Number(p.frequency) || 3;
  const activityFactor = Math.min(
    1.9,
    base[activityLevel] + Math.max(0, frequency - 3) * 0.03,
  );

  const tdee = bmr * activityFactor;
  const mainGoal = p.mainGoal && ['muscle', 'gras', 'tone', 'force'].includes(p.mainGoal) ? p.mainGoal : 'muscle';
  const adjustments: Record<UserProfile['mainGoal'], number> = {
    muscle: 220, gras: -420, tone: -180, force: 150,
  };
  const targetCals = Math.round((tdee + adjustments[mainGoal]) / 10) * 10;
  return Number.isNaN(targetCals) ? 1800 : targetCals;
}

/* ─── Macros ─────────────────────────────────────────────────────────────── */
export function getMacros(
  calories: number,
  goal: UserProfile['mainGoal'],
  morphotype?: UserProfile['morphotype'],
): ProgramMacros {
  const safeCalories = Number(calories) || 1800;
  const mainGoal = goal && ['muscle', 'gras', 'tone', 'force'].includes(goal) ? goal : 'muscle';
  const splits: Record<UserProfile['mainGoal'], { p: number; c: number; f: number }> = {
    muscle: { p: 0.30, c: 0.45, f: 0.25 },
    gras:   { p: 0.35, c: 0.35, f: 0.30 },
    tone:   { p: 0.32, c: 0.40, f: 0.28 },
    force:  { p: 0.28, c: 0.48, f: 0.24 },
  };
  let { p, c, f } = splits[mainGoal];
  if (morphotype === 'ectomorphe')  { c += 0.05; f -= 0.03; p -= 0.02; }
  if (morphotype === 'endomorphe')  { c -= 0.07; p += 0.04; f += 0.03; }
  
  const protein = Math.round((safeCalories * p) / 4);
  const carbs = Math.round((safeCalories * c) / 4);
  const fat = Math.round((safeCalories * f) / 9);

  return {
    protein: Number.isNaN(protein) ? 140 : protein,
    carbs:   Number.isNaN(carbs) ? 180 : carbs,
    fat:     Number.isNaN(fat) ? 60 : fat,
  };
}

/* ─── Jours d'entraînement ──────────────────────────────────────────────── */
export function getTrainingDays(freq: UserProfile['frequency']): string[] {
  const options: Record<UserProfile['frequency'], string[]> = {
    2: ['Lundi', 'Jeudi'],
    3: ['Lundi', 'Mercredi', 'Vendredi'],
    4: ['Lundi', 'Mardi', 'Jeudi', 'Samedi'],
    5: ['Lundi', 'Mardi', 'Mercredi', 'Vendredi', 'Samedi'],
    6: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  };
  return options[freq] ?? options[3];
}

/* ─── Type de séance ────────────────────────────────────────────────────── */
export function getSessionType(
  goal: UserProfile['mainGoal'],
  dayIdx: number,
  exp: UserProfile['experience'] = 'intermédiaire'
): string {
  const types: Record<UserProfile['mainGoal'], Record<UserProfile['experience'], string[]>> = {
    muscle: {
      débutante: ['Haut du corps — Push Fondations', 'Bas du corps — Squat & Fentes', 'Haut du corps — Pull Fondations', 'Full Body — Volume Doux', 'Bras & Core — Tonification'],
      intermédiaire: ['Push — Force & Hypertrophie', 'Bas du corps — Chaîne antérieure', 'Pull — Épaisseur & Largeur', 'Bas du corps — Chaîne postérieure', 'Haut du corps — Pump & Core'],
      avancée: ['Push Élite — Calisthenics & KB Lourd', 'Bas du corps — Squat Lourd & Deficit RDL', 'Pull Élite — L-Sit & Tractions Lestées', 'Bas du corps — Pistol & Front Squat KB', 'Full Body Élite — Core & Force Biomécanique'],
    },
    gras: {
      débutante: ['Circuit Métabolique Doux', 'Renforcement Fondations', 'Circuit Cardio Sans Impact', 'Musculation Métabolique', 'Full Body Forme'],
      intermédiaire: ['Complexes KB & Haltères', 'Haut du corps Métabolique', 'Bas du corps Puissance', 'Conditionnement Athlétique', 'Full Body Brûle-Graisses'],
      avancée: ['Conditionnement Élite Calisthenics', 'Complex Double KB Métabolique', 'Incinérateur Chaîne Postérieure', 'Conditionnement Haute Densité', 'Full Body Force-Endurance'],
    },
    tone: {
      débutante: ['Fessiers & Sangle Abdominale', 'Haut du corps Sculpteur', 'Bas du corps & Stabilité', 'Sangle Abdominale & Posture', 'Full Body Tonalité'],
      intermédiaire: ['Chaîne Postérieure & Fessiers', 'Haut du corps Athlétique', 'Bas du corps Volume', 'Core Stabilité & Obliques', 'Full Body Sculpture'],
      avancée: ['Pistol Squat & Fessiers Élite', 'Ring Dips & Upper Body Élite', 'Double KB & Core Explosif', 'Dragon Flag & Abdo Élite', 'Athletic Performance Élite'],
    },
    force: {
      débutante: ['Squat & Soulevé de Terre I', 'Développé & Tirage I', 'Développé Militaire & Core I', 'Squat Volume I', 'Accessoires & Stabilité'],
      intermédiaire: ['Force Pure — Squat & SDT', 'Force Pure — Bench & Rows', 'Overhead Press & Grip', 'Squat Volume & RDL', 'Force Accessoires'],
      avancée: ['Force Élite — Heavy Barbell & Pistol', 'Force Élite — Heavy Bench & Ring Dips', 'Force Élite — Double KB & Overhead', 'Force Élite — Deficit RDL & Heavy Squat', 'Force Élite — Dragon Flag & Grip'],
    },
  };
  const goalTypes = types[goal] ?? types['muscle'];
  const expTypes = goalTypes[exp] ?? goalTypes['intermédiaire'];
  return expTypes[dayIdx % expTypes.length];
}

/* ─── BASE DE DONNÉES BIOMÉCANIQUE & SUBSTITUTION ───────────────────────── */
export const BIOMECHANICAL_PATTERNS: Record<string, BiomechanicalPatternInfo> = {
  squat: {
    id: 'squat',
    patternName: 'Squat Genou-Dominant (Quadriceps & Fessiers)',
    primaryMuscles: ['Quadriceps', 'Grand Fessier', 'Adducteurs'],
    exercises: {
      full: ['Squat barre arrière', 'Squat barre avant', 'Hack Squat machine', 'Presse à cuisses 45°'],
      limited: ['Squat gobelet haltère lourd', 'Squat bulgare haltères', 'Fentes marchées haltères'],
      home: ['Squat gobelet kettlebell', 'Squat bulgare poids du corps (sur chaise)', 'Pistol squat assisté', 'Squat sumo tempo lent']
    },
    defaultNotes: 'Garde les talons ancrés au sol, poitrine haute et genoux alignés avec les orteils.'
  },
  hinge: {
    id: 'hinge',
    patternName: 'Extension de Hanche / Hinge (Ischio-Jambiers & Fessiers)',
    primaryMuscles: ['Ischio-Jambiers', 'Grand Fessier', 'Lombaires'],
    exercises: {
      full: ['Soulevé de terre barre', 'Soulevé de terre roumain barre', 'Hip Thrust barre', 'Leg curl allongé machine'],
      limited: ['Soulevé de terre roumain haltères', 'Hip Thrust haltère', 'Soulevé de terre unilatéral haltère'],
      home: ['Kettlebell Swings', 'Soulevé de terre unilatéral KB', 'Leg curl au sol (glissement serviette)', 'Pont fessier unilatéral']
    },
    defaultNotes: 'Charnière de hanche : pousse le bassin vers l\'arrière en maintenant un dos plat.'
  },
  push_horizontal: {
    id: 'push_horizontal',
    patternName: 'Poussée Horizontale (Pectoraux & Triceps)',
    primaryMuscles: ['Grand Pectoral', 'Deltoïde Antérieur', 'Triceps'],
    exercises: {
      full: ['Développé couché barre', 'Développé couché haltères', 'Développé incliné barre', 'Pec Deck machine'],
      limited: ['Développé couché haltères', 'Développé incliné haltères', 'Développé au sol haltères (Floor Press)'],
      home: ['Pompes classiques', 'Pompes déclinées (pieds surélevés)', 'Pompes diamant', 'Floor Press kettlebell unilatéral']
    },
    defaultNotes: 'Omoplates rétractées et baissées. Contrôle la descente sur 2 à 3 secondes.'
  },
  push_vertical: {
    id: 'push_vertical',
    patternName: 'Poussée Verticale (Épaules & Triceps)',
    primaryMuscles: ['Deltoïdes', 'Triceps', 'Haut des pectoraux'],
    exercises: {
      full: ['Développé militaire barre', 'Développé militaire haltères assis', 'Shoulder Press machine'],
      limited: ['Développé militaire haltères debout', 'Arnold Press haltères'],
      home: ['Press militaire unilatéral Kettlebell', 'Pompes piquées (Pike Push-ups)', 'Pompes piquées pieds surélevés']
    },
    defaultNotes: 'Garde le buste gainé, ne cambre pas le bas du dos pendant la poussée overhead.'
  },
  pull_horizontal: {
    id: 'pull_horizontal',
    patternName: 'Tirage Horizontal (Grand Dorsal & Rhomboïdes)',
    primaryMuscles: ['Grand Dorsal', 'Rhomboïdes', 'Trapeze Moyen/Inférieur', 'Biceps'],
    exercises: {
      full: ['Rowing barre buste penché', 'Rowing poulie basse', 'Rowing T-Bar', 'Rowing haltère unilatéral'],
      limited: ['Rowing haltères buste penché', 'Rowing haltère unilatéral appuyé banc'],
      home: ['Rowing Kettlebell Gorilla', 'Rowing inversé sous une table', 'Rowing unilatéral KB', 'Tirage élastique porte']
    },
    defaultNotes: 'Tire les coudes vers les hanches en resserrant les omoplates à la fin du mouvement.'
  },
  pull_vertical: {
    id: 'pull_vertical',
    patternName: 'Tirage Vertical (Grand Dorsal & Biceps)',
    primaryMuscles: ['Grand Dorsal', 'Grand Rond', 'Biceps'],
    exercises: {
      full: ['Tractions prises pronation', 'Tirage vertical poulie haute', 'Tirage vertical prise neutre'],
      limited: ['Tractions assistées élastique', 'Tirage vertical élastique haut'],
      home: ['Tractions poids du corps (barre porte)', 'Tirage élastique ancrage haut', 'Kettlebell High Pull']
    },
    defaultNotes: 'Engage les dorsaux en tirant les coudes vers le bas et vers l\'arrière.'
  },
  glute_isolation: {
    id: 'glute_isolation',
    patternName: 'Isolation Fessiers & Abduction (Moyen Fessier & Isolation)',
    primaryMuscles: ['Moyen Fessier', 'Grand Fessier (Isolation)'],
    exercises: {
      full: ['Hip Thrust machine / barre', 'Abduction hanche poulie', 'Kickback poulie'],
      limited: ['Hip Thrust unilatéral haltère', 'Abduction élastique debout'],
      home: ['Frog Pumps', 'Clamshell avec élastique', 'Abduction hanche allongée', 'Hip Thrust unilatéral au sol']
    },
    defaultNotes: 'Presse à travers le talon, contraction maximale de 1-2 s en haut.'
  },
  core_stability: {
    id: 'core_stability',
    patternName: 'Stabilité du Tronc & Anti-Extension / Anti-Rotation',
    primaryMuscles: ['Transverse', 'Grand Droit', 'Obliques'],
    exercises: {
      full: ['Pallof Press poulie', 'Ab Wheel Rollout', 'Farmer Walk lourd avec haltères'],
      limited: ['Farmer Walk haltères', 'Pallof Press avec élastique', 'Planche avec charge'],
      home: ['Gainage planche dynamique', 'Deadbug contrôlé', 'Bird-Dog avec pause', 'Farmer Walk KB unilatéral (Suitcase Carry)']
    },
    defaultNotes: 'Garde la ceinture abdominale verrouillée et respire par le diaphragme.'
  },
  metabolic_finisher: {
    id: 'metabolic_finisher',
    patternName: 'Finisher Métabolique & Conditionnement',
    primaryMuscles: ['Système Cardiovasculaire', 'Full Body'],
    exercises: {
      full: ['Sled Push (Traîneau)', 'Assault Bike sprint', 'Rameur intervalle 200m'],
      limited: ['Thrusters haltères', 'Burpees avec haltères légers', 'Dumbbell Snatch alterné'],
      home: ['Kettlebell Swings explosifs', 'Burpees', 'Mountain Climbers rapide', 'Squats sautés']
    },
    defaultNotes: 'Donne une intensité maximale tout en conservant une posture sécuritaire.'
  },
  warmup_mobility: {
    id: 'warmup_mobility',
    patternName: 'Échauffement Dynamique & Activation Neuromusculaire',
    primaryMuscles: ['Mobilité Articulaire', 'Transverse', 'Fessiers'],
    exercises: {
      full: ['World\'s Greatest Stretch', 'Rotations thoraciques à genoux', 'Activation fessiers poulie/élastique'],
      limited: ['World\'s Greatest Stretch', 'Mobilité hanches 90/90', 'Band Pull-Apart élastique'],
      home: ['World\'s Greatest Stretch', 'Mobilité hanches 90/90', 'Bird-Dog activation', 'Cat-Cow dynamique']
    },
    defaultNotes: 'Mouvement fluide, respire profondément sans forcer les amplitudes.'
  }
};

/** Recherche le patron biomécanique à partir du nom d'un exercice */
export function getBiomechanicalPattern(exerciseName: string): BiomechanicalPatternInfo {
  const name = exerciseName.toLowerCase();
  if (name.includes('squat') || name.includes('fente') || name.includes('presse') || name.includes('pistol')) return BIOMECHANICAL_PATTERNS.squat;
  if (name.includes('terre') || name.includes('deadlift') || name.includes('thrust') || name.includes('swing') || name.includes('ischio') || name.includes('hinge')) return BIOMECHANICAL_PATTERNS.hinge;
  if (name.includes('couché') || name.includes('pompe') || name.includes('push-up') || name.includes('pec') || name.includes('incliné')) return BIOMECHANICAL_PATTERNS.push_horizontal;
  if (name.includes('militaire') || name.includes('overhead') || name.includes('pike') || name.includes('arnold') || name.includes('shoulder')) return BIOMECHANICAL_PATTERNS.push_vertical;
  if (name.includes('rowing') || name.includes('inversé') || name.includes('t-bar')) return BIOMECHANICAL_PATTERNS.pull_horizontal;
  if (name.includes('traction') || name.includes('tirage') || name.includes('lat pulldown') || name.includes('high pull')) return BIOMECHANICAL_PATTERNS.pull_vertical;
  if (name.includes('abduction') || name.includes('frog') || name.includes('clamshell') || name.includes('kickback')) return BIOMECHANICAL_PATTERNS.glute_isolation;
  if (name.includes('gainage') || name.includes('planche') || name.includes('deadbug') || name.includes('bird-dog') || name.includes('farmer') || name.includes('pallof')) return BIOMECHANICAL_PATTERNS.core_stability;
  if (name.includes('burpee') || name.includes('climber') || name.includes('thruster') || name.includes('snatch') || name.includes('sled') || name.includes('bike')) return BIOMECHANICAL_PATTERNS.metabolic_finisher;
  return BIOMECHANICAL_PATTERNS.warmup_mobility;
}

/** Trouve l'exercice équivalent selon le matériel exact du sportif */
export function getEquivalentExercise(exerciseName: string, targetAccess: GymAccess): { name: string; notes: string; alternatives: string[] } {
  const pattern = getBiomechanicalPattern(exerciseName);
  const options = pattern.exercises[targetAccess] ?? pattern.exercises.home;
  const mainEquiv = options[0] || exerciseName;
  const alternatives = options.slice(1);
  return {
    name: mainEquiv,
    notes: pattern.defaultNotes,
    alternatives,
  };
}

/** Substitue un exercice dans une séance donnée par son équivalent biomécanique */
export function substituteExerciseInSession(session: WorkoutSession, exerciseId: string, targetAccess: GymAccess): WorkoutSession {
  const updatedExercises = session.exercises.map(ex => {
    if (ex.id === exerciseId) {
      const equiv = getEquivalentExercise(ex.name, targetAccess);
      return {
        ...ex,
        name: equiv.name,
        notes: equiv.notes,
        alternativeExercises: equiv.alternatives,
      };
    }
    return ex;
  });

  return {
    ...session,
    exercises: updatedExercises,
  };
}

/* ─── CONFIGURATION DE LA PÉRIODISATION SUR 12 SEMAINES ──────────────────── */
export const PERIODIZATION_WEEKS: Record<number, WeekPeriodizationConfig> = {
  1:  { week: 1,  phaseName: 'Fondation', phaseTitle: 'Semaine 1 — Adaptation Anatomique', description: 'Volume modéré, apprentissage moteur et conditionnement des tendons.', volumeMultiplier: 1.0, repsCompound: '10–12', repsIsolation: '12–15', rpeTarget: 'RPE 6.5 - 7.0', tempo: '3010', restCompoundSec: 90, restIsolationSec: 60, finisherIntensity: '70% VMA' },
  2:  { week: 2,  phaseName: 'Fondation', phaseTitle: 'Semaine 2 — Consolidation Technique', description: 'Augmentation progressive de la tension sans atteindre l\'échec.', volumeMultiplier: 1.0, repsCompound: '10–12', repsIsolation: '12–15', rpeTarget: 'RPE 7.0', tempo: '3010', restCompoundSec: 90, restIsolationSec: 60, finisherIntensity: '72% VMA' },
  3:  { week: 3,  phaseName: 'Fondation', phaseTitle: 'Semaine 3 — Surcharge Progressive Initiale', description: 'Ajout de charge légère ou 1 rép supplémentaire par série.', volumeMultiplier: 1.05, repsCompound: '10–12', repsIsolation: '12–15', rpeTarget: 'RPE 7.5', tempo: '3010', restCompoundSec: 90, restIsolationSec: 60, finisherIntensity: '75% VMA' },
  4:  { week: 4,  phaseName: 'Fondation', phaseTitle: 'Semaine 4 — Culmination du Bloc Fondation', description: 'Dernière semaine de base avant la montée en charge.', volumeMultiplier: 1.1, repsCompound: '10', repsIsolation: '12', rpeTarget: 'RPE 7.5 - 8.0', tempo: '2010', restCompoundSec: 90, restIsolationSec: 60, finisherIntensity: '78% VMA' },

  5:  { week: 5,  phaseName: 'Intensification', phaseTitle: 'Semaine 5 — Hypertrophie & Tension Mécanique', description: 'Charges plus lourdes, accent sur la tension mécanique maximale.', volumeMultiplier: 1.15, repsCompound: '8–10', repsIsolation: '10–12', rpeTarget: 'RPE 8.0', tempo: '2010', restCompoundSec: 90, restIsolationSec: 60, finisherIntensity: '82% VMA' },
  6:  { week: 6,  phaseName: 'Intensification', phaseTitle: 'Semaine 6 — Supersets Métaboliques', description: 'Surcharge métabolique accrue sur les phases d\'isolation.', volumeMultiplier: 1.2, repsCompound: '8', repsIsolation: '10', rpeTarget: 'RPE 8.0 - 8.5', tempo: '2010', restCompoundSec: 75, restIsolationSec: 45, finisherIntensity: '85% VMA' },
  7:  { week: 7,  phaseName: 'Intensification', phaseTitle: 'Semaine 7 — Recrutement Neuro-Musculaire', description: 'Répétitions plus basses sur polyarticulaires, tempo contrôlé.', volumeMultiplier: 1.2, repsCompound: '6–8', repsIsolation: '8–10', rpeTarget: 'RPE 8.5', tempo: '2010', restCompoundSec: 90, restIsolationSec: 60, finisherIntensity: '88% VMA' },
  8:  { week: 8,  phaseName: 'Intensification', phaseTitle: 'Semaine 8 — Peak du Bloc Intensification', description: 'Volumétrie et intensité maximale du bloc d\'hypertrophie.', volumeMultiplier: 1.25, repsCompound: '6–8', repsIsolation: '8–10', rpeTarget: 'RPE 8.5 - 9.0', tempo: '2010', restCompoundSec: 90, restIsolationSec: 60, finisherIntensity: '90% VMA' },

  9:  { week: 9,  phaseName: 'Peak', phaseTitle: 'Semaine 9 — Conversion Puissance & Force', description: 'Charges lourdes, recrutement des unités motrices de haut seuil.', volumeMultiplier: 1.1, repsCompound: '5–6', repsIsolation: '8', rpeTarget: 'RPE 9.0', tempo: '1010', restCompoundSec: 120, restIsolationSec: 60, finisherIntensity: '92% VMA' },
  10: { week: 10, phaseName: 'Peak', phaseTitle: 'Semaine 10 — Overreach Contrôlé', description: 'Semaine la plus exigeante. Focus total sur chaque répétition.', volumeMultiplier: 1.15, repsCompound: '4–6', repsIsolation: '6–8', rpeTarget: 'RPE 9.0 - 9.5', tempo: '1010', restCompoundSec: 120, restIsolationSec: 60, finisherIntensity: '95% VMA' },
  11: { week: 11, phaseName: 'Peak', phaseTitle: 'Semaine 11 — Peak Performance Maximale', description: 'Test de capacité maximale sur les mouvements principaux.', volumeMultiplier: 1.0, repsCompound: '4–5', repsIsolation: '6–8', rpeTarget: 'RPE 9.5', tempo: '1010', restCompoundSec: 120, restIsolationSec: 60, finisherIntensity: '95% VMA' },

  12: { week: 12, phaseName: 'Deload', phaseTitle: 'Semaine 12 — Décharge & Supercompensation', description: 'Réduction de 40% du volume, dissipation de la fatigue centrale.', volumeMultiplier: 0.6, repsCompound: '8–10', repsIsolation: '10–12', rpeTarget: 'RPE 5.5 - 6.0', tempo: '2020', restCompoundSec: 60, restIsolationSec: 45, finisherIntensity: 'Récupération active' }
};

export function getWeekPeriodizationConfig(weekNumber: number): WeekPeriodizationConfig {
  const safeWeek = Math.min(12, Math.max(1, Math.round(weekNumber)));
  return PERIODIZATION_WEEKS[safeWeek] ?? PERIODIZATION_WEEKS[1];
}

/** Calcule les paramètres exacts d'une séance selon la semaine de périodisation (1-12) */
export function getPeriodizedSession(
  session: WorkoutSession,
  weekNumber: number,
  experience?: TrainingExperience
): WorkoutSession {
  const config = getWeekPeriodizationConfig(weekNumber);
  const expFactor = experience === 'débutante' ? 0.85 : experience === 'avancée' ? 1.15 : 1.0;

  const periodizedExercises: Exercise[] = session.exercises.map(ex => {
    let sets = ex.sets;
    let reps = ex.reps;
    let rest = ex.restSeconds ?? 60;
    let rpe = ex.rpe ?? config.rpeTarget;
    let tempo = ex.tempo ?? config.tempo;

    if (ex.phase === 1) {
      // Phase 1 : Échauffement Dynamique & Activation
      sets = 2;
      reps = ex.reps || '10 reps';
      rest = 30;
    } else if (ex.phase === 2) {
      // Phase 2 : Mouvements Polyarticulaires Principaux
      sets = Math.max(2, Math.round(ex.sets * config.volumeMultiplier * expFactor));
      if (config.phaseName === 'Deload') sets = 2; // Deload strict
      reps = config.repsCompound;
      rest = config.restCompoundSec;
    } else if (ex.phase === 3) {
      // Phase 3 : Isolation & Supersets Métaboliques
      sets = Math.max(2, Math.round(ex.sets * config.volumeMultiplier));
      if (config.phaseName === 'Deload') sets = 2;
      reps = config.repsIsolation;
      rest = config.restIsolationSec;
    } else if (ex.phase === 4) {
      // Phase 4 : Finisher & Récupération P1-P4
      sets = config.phaseName === 'Deload' ? 1 : ex.sets;
      rest = 40;
    }

    return {
      ...ex,
      sets,
      reps,
      restSeconds: rest,
      rpe,
      tempo,
      notes: ex.notes ? `${ex.notes} | Tempo : ${tempo} | ${rpe}` : `Tempo : ${tempo} | ${rpe}`,
    };
  });

  return {
    ...session,
    exercises: periodizedExercises,
  };
}

/** Adapte tout un programme à une semaine de périodisation spécifique */
export function getPeriodizedProgram(program: GeneratedProgram, weekNumber: number): GeneratedProgram {
  const config = getWeekPeriodizationConfig(weekNumber);
  const periodizedSessions = program.sessions.map(s => getPeriodizedSession(s, weekNumber, program.experience));
  return {
    ...program,
    currentWeek: weekNumber,
    periodizationConfig: config,
    sessions: periodizedSessions,
  };
}

/* ─── TEMPLATES DE SÉANCES STRUCTUREES EN 4 PHASES (P1-P4) ───────────────── */

interface PhaseDef {
  phase: 1 | 2 | 3 | 4;
  phaseName: string;
  category: 'warmup' | 'compound' | 'isolation' | 'finisher';
  name: Record<GymAccess, string>;
  reps: string | number;
  tempo?: string;
  rpe?: string;
  rest?: string;
  restSeconds?: number;
  supersetGroup?: string;
  muscles?: string[];
  biomechanicsTip?: string;
  notes?: string;
}

const GOAL_TEMPLATES_4PHASES: Record<UserProfile['mainGoal'], PhaseDef[][]> = {
  muscle: [
    // Séance 1 : Haut du corps — Push
    [
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Rotations d\'épaules & Ouverture thoracique', limited: 'Rotations d\'épaules & Ouverture thoracique', home: 'Rotations d\'épaules & Ouverture thoracique' }, reps: '2 min', restSeconds: 30, notes: 'Activation de la coiffe des rotateurs.' },
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Band Pull-Apart élastique', limited: 'Band Pull-Apart élastique', home: 'Pompes murales lentes & rétraction scapulaire' }, reps: '12–15', restSeconds: 30, notes: 'Activation de la ceinture scapulaire.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Développé couché barre', limited: 'Développé couché haltères', home: 'Pompes déclinées (pieds sur élevés)' }, reps: '8–10', tempo: '3010', restSeconds: 90, notes: 'Poussée lourde. Omoplates resserrées, coudes à ~45°.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Développé militaire haltères assis', limited: 'Développé militaire haltères debout', home: 'Pompes piquées (Pike Push-ups)' }, reps: '8–10', tempo: '2010', restSeconds: 90, notes: 'Presse verticale. Gainage abdominal ferme.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'A1', name: { full: 'Élévations latérales poulie', limited: 'Élévations latérales haltères', home: 'Élévations latérales avec bouteilles / bande' }, reps: '12–15', restSeconds: 45, notes: 'Superset A1 — Deltoïde latéral.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'A2', name: { full: 'Extensions triceps corde poulie', limited: 'Extensions triceps au-dessus de la tête', home: 'Dips sur chaise' }, reps: '12–15', restSeconds: 60, notes: 'Superset A2 — Isolation triceps.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Finisher Pompes Tabata (4 min)', limited: 'Finisher Pompes Tabata (4 min)', home: 'Finisher Pompes & Gainage Tabata' }, reps: '4 min (20s/10s)', restSeconds: 40, notes: 'Pulsations maximales.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Respiration diaphragmatique & étirement pecs', limited: 'Respiration diaphragmatique & étirement pecs', home: 'Respiration diaphragmatique & étirement pecs' }, reps: '3 min', restSeconds: 0, notes: 'Retour au calme nerveux.' }
    ],
    // Séance 2 : Bas du corps — Legs
    [
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Mobilité hanches 90/90', limited: 'Mobilité hanches 90/90', home: 'Mobilité hanches 90/90' }, reps: '2 min', restSeconds: 30, notes: 'Déverrouillage des hanches.' },
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Pont fessier d\'activation', limited: 'Pont fessier d\'activation', home: 'Pont fessier unilatéral' }, reps: '15', restSeconds: 30, notes: 'Activation grand fessier.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Squat barre arrière', limited: 'Squat gobelet haltère lourd', home: 'Squat gobelet Kettlebell / Sac lesté' }, reps: '6–8', tempo: '3010', restSeconds: 90, notes: 'Flexion profonde à 90°. Genoux alignés.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Soulevé de terre roumain barre', limited: 'Soulevé de terre roumain haltères', home: 'Kettlebell Swings / Soulevé de terre unilatéral' }, reps: '8–10', tempo: '2010', restSeconds: 90, notes: 'Tension maximale sur ischio-jambiers.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'B1', name: { full: 'Fentes marchées haltères', limited: 'Fentes arrières haltères', home: 'Squat bulgare sur chaise' }, reps: '10/jambe', restSeconds: 45, notes: 'Superset B1 — Quadriceps & fessiers.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'B2', name: { full: 'Leg curl machine', limited: 'Leg curl haltère entre les pieds', home: 'Leg curl au sol (glissement serviette)' }, reps: '12', restSeconds: 60, notes: 'Superset B2 — Isolation ischios.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Finisher Kettlebell Swings / Burpees', limited: 'Finisher Kettlebell Swings / Burpees', home: 'Finisher Burpees & Squats sautés' }, reps: '3 min (30s effort / 15s repos)', restSeconds: 40, notes: 'Épuisement métabolique bas du corps.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Étirements statiques psoas & ischios', limited: 'Étirements statiques psoas & ischios', home: 'Étirements statiques psoas & ischios' }, reps: '3 min', restSeconds: 0, notes: 'Décompression articulaire.' }
    ],
    // Séance 3 : Haut du corps — Pull
    [
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Cat-Cow & Rotations thoraciques', limited: 'Cat-Cow & Rotations thoraciques', home: 'Cat-Cow & Rotations thoraciques' }, reps: '2 min', restSeconds: 30, notes: 'Mobilité de la colonne vertébrale.' },
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'YTWL d\'activation dorsale', limited: 'YTWL d\'activation dorsale', home: 'Bird-Dog avec contraction 2s' }, reps: '12', restSeconds: 30, notes: 'Activation de la chaîne postérieure.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Tractions prises pronation', limited: 'Tractions assistées élastique', home: 'Rowing inversé sous une table' }, reps: '6–8', tempo: '2010', restSeconds: 90, notes: 'Tirage vertical lourd. Coudes vers les hanches.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Rowing barre buste penché', limited: 'Rowing haltères buste penché', home: 'Rowing Kettlebell Gorilla' }, reps: '8–10', tempo: '2010', restSeconds: 90, notes: 'Tirage horizontal. Omoplates serrées.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'C1', name: { full: 'Face pull poulie', limited: 'Oiseau haltères buste penché', home: 'Tirage élastique ancrage porte' }, reps: '15', restSeconds: 45, notes: 'Superset C1 — Deltoïde postérieur.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'C2', name: { full: 'Curl biceps barre EZ', limited: 'Curl biceps haltères supination', home: 'Curl biceps Kettlebell / bouteilles' }, reps: '10–12', restSeconds: 60, notes: 'Superset C2 — Biceps.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Farmer Walk lourd avec haltères', limited: 'Farmer Walk haltères', home: 'Farmer Walk KB unilatéral (Suitcase)' }, reps: '3 × 40 m', restSeconds: 40, notes: 'Grip & stabilité du buste.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Suspension barre & Étirements dorsaux', limited: 'Étirements dorsaux & suspension', home: 'Étirements grands dorsaux au sol' }, reps: '3 min', restSeconds: 0, notes: 'Décompression vertébrale.' }
    ],
    // Séance 4 : Full Body Hypertrophie
    [
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'World\'s Greatest Stretch', limited: 'World\'s Greatest Stretch', home: 'World\'s Greatest Stretch' }, reps: '2 min', restSeconds: 30, notes: 'Ouverture hanches & cheville.' },
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Gainage planche avec touches d\'épaules', limited: 'Gainage planche touches épaules', home: 'Gainage planche touches épaules' }, reps: '12/côté', restSeconds: 30, notes: 'Anti-rotation du tronc.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Squat gobelet lourd', limited: 'Squat gobelet haltère lourd', home: 'Squat gobelet Kettlebell' }, reps: '10', tempo: '3010', restSeconds: 90, notes: 'Posture verticale parfaite.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Développé couché haltères', limited: 'Développé couché haltères', home: 'Pompes classique tempo 3-1-1' }, reps: '10', tempo: '3010', restSeconds: 90, notes: 'Volume pectoral et triceps.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'D1', name: { full: 'Hip Thrust machine / barre', limited: 'Hip Thrust haltère', home: 'Hip Thrust unilatéral au sol' }, reps: '12', restSeconds: 45, notes: 'Superset D1 — Extension fessiers.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'D2', name: { full: 'Rowing unilatéral haltère', limited: 'Rowing unilatéral haltère', home: 'Rowing unilatéral KB' }, reps: '10/bras', restSeconds: 60, notes: 'Superset D2 — Grand dorsal unilatéral.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Complex Métabolique (Thrusters & Swings)', limited: 'Thrusters haltères', home: 'Complex Burpees & KB Swings' }, reps: '3 tours x 10 reps', restSeconds: 40, notes: 'Burn métabolique ultime.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Respiration guidée 4-7-8 & étirements', limited: 'Respiration guidée 4-7-8 & étirements', home: 'Respiration guidée 4-7-8 & étirements' }, reps: '3 min', restSeconds: 0, notes: 'Resynthèse du système nerveux.' }
    ],
    // Séance 5 : Cardio & Core Métabolique
    [
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Jumping Jacks & Mobilité dynamique', limited: 'Jumping Jacks & Mobilité', home: 'Jumping Jacks & Mobilité' }, reps: '2 min', restSeconds: 30, notes: 'Activation cardiovasculaire.' },
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Deadbug contrôlé', limited: 'Deadbug contrôlé', home: 'Deadbug contrôlé' }, reps: '10/côté', restSeconds: 30, notes: 'Activation du transverse.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Kettlebell Swings balistiques', limited: 'Swings avec haltère', home: 'Kettlebell Swings balistiques' }, reps: '15–20', tempo: 'Explosif', restSeconds: 75, notes: 'Extension dynamique de hanche.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Mountain Climbers dynamique', limited: 'Mountain Climbers dynamique', home: 'Mountain Climbers dynamique' }, reps: '45 s', restSeconds: 75, notes: 'Rythme élevé, dos droit.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'E1', name: { full: 'Gainage planche dynamique', limited: 'Gainage planche dynamique', home: 'Gainage planche dynamique' }, reps: '45 s', restSeconds: 30, notes: 'Superset E1 — Gainage frontal.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'E2', name: { full: 'Planche latérale', limited: 'Planche latérale', home: 'Planche latérale' }, reps: '30 s/côté', restSeconds: 60, notes: 'Superset E2 — Obliques.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Tabata Burpees (4 min)', limited: 'Tabata Burpees (4 min)', home: 'Tabata Burpees (4 min)' }, reps: '4 min', restSeconds: 40, notes: 'Intensité maximale.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Étirements chaîne antérieure & respiration', limited: 'Étirements & respiration', home: 'Étirements & respiration' }, reps: '3 min', restSeconds: 0, notes: 'Récupération intégrale.' }
    ]
  ],
  gras: [
    // Séance 1 : Haut du corps & Poussée Métabolique
    [
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Jumping Jacks & Mobilité hanches', limited: 'Jumping Jacks & Mobilité', home: 'Jumping Jacks & Mobilité' }, reps: '2 min', restSeconds: 30, notes: 'Mise en route cardiovasculaire.' },
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Band pull-apart & Squats air', limited: 'Band pull-apart & Squats air', home: 'Squats air & Rotations' }, reps: '15', restSeconds: 30, notes: 'Activation articulaire.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Squat gobelet tempo rapide', limited: 'Squat gobelet haltère', home: 'Squat au poids du corps tempo soutenu' }, reps: '12–15', tempo: '2010', restSeconds: 60, notes: 'Maintien de la masse musculaire sous déficit.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Développé militaire haltères', limited: 'Développé militaire haltères', home: 'Pompes piquées / Pompes genoux' }, reps: '12–15', restSeconds: 60, notes: 'Poussée métabolique.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'F1', name: { full: 'Fentes alternées rapides', limited: 'Fentes alternées', home: 'Fentes sautées ou alternées' }, reps: '12/jambe', restSeconds: 30, notes: 'Superset F1 — Circuit cardio bas du corps.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'F2', name: { full: 'Rowing haltères buste penché', limited: 'Rowing haltères', home: 'Rowing inversé sous table' }, reps: '12', restSeconds: 45, notes: 'Superset F2 — Tirage haut volume.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Circuit Burpees & Mountain Climbers', limited: 'Circuit Burpees & Mountain Climbers', home: 'Burpees & Mountain Climbers' }, reps: '4 min (30s/15s)', restSeconds: 40, notes: 'Consommation d\'oxygène post-effort (EPOC).' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Respiration diaphragmatique', limited: 'Respiration diaphragmatique', home: 'Respiration diaphragmatique' }, reps: '3 min', restSeconds: 0, notes: 'Baisser le cortisol.' }
    ],
    // Séance 2 : Bas du corps & Puissance Brûle-Graisses
    [
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Skater Jumps & Mobilité cheville', limited: 'Skater Jumps & Mobilité', home: 'Skater Jumps sans impact' }, reps: '2 min', restSeconds: 30, notes: 'Activation de la chaîne latérale.' },
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Pont fessier unilatéral', limited: 'Pont fessier au sol', home: 'Pont fessier au sol' }, reps: '12/côté', restSeconds: 30, notes: 'Activation grand fessier.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Soulevé de terre roumain haltères', limited: 'Soulevé de terre roumain haltères', home: 'Soulevé de terre KB / Sac' }, reps: '12–15', tempo: '3010', restSeconds: 60, notes: 'Tension ischios & fessiers.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Fentes marchées avec haltères', limited: 'Fentes marchées haltères', home: 'Fentes arrières explosives' }, reps: '10/jambe', restSeconds: 60, notes: 'Volume quadriceps & fessiers.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'F3', name: { full: 'Kettlebell Swings balistiques', limited: 'Swings haltère', home: 'Swings sac ou KB' }, reps: '15–20', restSeconds: 30, notes: 'Superset F3 — Extension dynamique.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'F4', name: { full: 'Mountain Climbers rapide', limited: 'Mountain Climbers', home: 'Mountain Climbers' }, reps: '40 s', restSeconds: 45, notes: 'Superset F4 — Gainage métabolique.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Finisher Squats sautés Tabata', limited: 'Squats sautés / Air Squats Tabata', home: 'Air Squats Tabata' }, reps: '4 min (20s/10s)', restSeconds: 40, notes: 'Épuisement des réserves de glycogène.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Étirements quadriceps & psoas', limited: 'Étirements quadriceps & psoas', home: 'Étirements quadriceps & psoas' }, reps: '3 min', restSeconds: 0, notes: 'Retour à l\'état de repos.' }
    ],
    // Séance 3 : Core & Tirage Métabolique
    [
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Rotations thoraciques & Cat-Cow', limited: 'Rotations thoraciques', home: 'Cat-Cow & Rotations' }, reps: '2 min', restSeconds: 30, notes: 'Mobilité de la colonne vertébrale.' },
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Deadbug dynamique', limited: 'Deadbug dynamique', home: 'Deadbug dynamique' }, reps: '10/côté', restSeconds: 30, notes: 'Activation de la sangle abdominale.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Rowing unilatéral haltère lourd', limited: 'Rowing unilatéral haltère', home: 'Rowing inversé sous table' }, reps: '10/bras', tempo: '2010', restSeconds: 60, notes: 'Travail dorsal unilatéral.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Développé couché haltères', limited: 'Développé couché haltères', home: 'Pompes classiques' }, reps: '12', restSeconds: 60, notes: 'Poussée pectoraux & triceps.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'F5', name: { full: 'Gainage planche avec touches d\'épaules', limited: 'Gainage planche touches épaules', home: 'Gainage planche touches épaules' }, reps: '45 s', restSeconds: 30, notes: 'Superset F5 — Anti-rotation.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'F6', name: { full: 'Oiseau avec haltères légers', limited: 'Oiseau haltères', home: 'Tirage serviette / élastique' }, reps: '15', restSeconds: 45, notes: 'Superset F6 — Deltoïde postérieur.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Finisher High Knees & Jumping Jacks', limited: 'High Knees & Jumping Jacks', home: 'High Knees sur place' }, reps: '3 min (30s/15s)', restSeconds: 40, notes: 'Pulsations soutenues.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Décompression vertébrale', limited: 'Décompression vertébrale', home: 'Décompression au sol' }, reps: '3 min', restSeconds: 0, notes: 'Relâchement du dos.' }
    ],
    // Séance 4 : Full Body Conditioning
    [
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'World\'s Greatest Stretch', limited: 'World\'s Greatest Stretch', home: 'World\'s Greatest Stretch' }, reps: '2 min', restSeconds: 30, notes: 'Ouverture complète.' },
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Gainage commando (Plank to Push-up)', limited: 'Gainage commando', home: 'Gainage commando' }, reps: '10 reps', restSeconds: 30, notes: 'Stabilité épaules & tronc.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Thrusters haltères', limited: 'Thrusters haltères', home: 'Thrusters avec sacs ou KB' }, reps: '12', tempo: 'Explosif', restSeconds: 75, notes: 'Mouvement polyarticulaire total.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Step-ups sur banc avec haltères', limited: 'Step-ups sur chaise', home: 'Step-ups poids du corps' }, reps: '10/jambe', restSeconds: 60, notes: 'Travail unilatéral bas du corps.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'F7', name: { full: 'Farmer Walk avec haltères', limited: 'Farmer Walk haltères', home: 'Farmer Walk unilatéral KB' }, reps: '3 × 45 s', restSeconds: 30, notes: 'Superset F7 — Gainage & poigne.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'F8', name: { full: 'Planche latérale avec élévation', limited: 'Planche latérale', home: 'Planche latérale sur genoux' }, reps: '30 s/côté', restSeconds: 45, notes: 'Superset F8 — Obliques.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Complex Burpees & KB Swings', limited: 'Complex Burpees & Swings', home: 'Burpees & Squats sautés' }, reps: '3 tours x 10 reps', restSeconds: 40, notes: 'Burn out total.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Respiration guidée & stretching', limited: 'Respiration & stretching', home: 'Respiration & stretching' }, reps: '3 min', restSeconds: 0, notes: 'Récupération post-séance.' }
    ],
    // Séance 5 : Circuit Incinérateur & Agilité
    [
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'World\'s Greatest Stretch & Jumping Jacks', limited: 'World\'s Greatest Stretch & Jumping Jacks', home: 'World\'s Greatest Stretch & Jumping Jacks' }, reps: '2 min', restSeconds: 30, notes: 'Activation générale cardiovasculaire.' },
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Bird-Dog & Rotations thoraciques', limited: 'Bird-Dog & Rotations', home: 'Bird-Dog & Rotations' }, reps: '10/côté', restSeconds: 30, notes: 'Stabilité vertébrale & centre.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Dumbbell Snatch alterné', limited: 'Dumbbell Snatch alterné', home: 'Kettlebell Snatch / Clean & Press' }, reps: '12', tempo: 'Explosif', restSeconds: 60, notes: 'Puissance globale & dépense énergétique.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Squats sautés / Air Squats tempo', limited: 'Air Squats tempo', home: 'Air Squats tempo' }, reps: '15', restSeconds: 60, notes: 'Haute fréquence respiratoire.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'F9', name: { full: 'Mountain Climbers rapide', limited: 'Mountain Climbers', home: 'Mountain Climbers' }, reps: '45 s', restSeconds: 30, notes: 'Superset F9 — Gainage métabolique.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'F10', name: { full: 'Rowing inversé TRX / Table', limited: 'Rowing haltères', home: 'Rowing inversé sous table' }, reps: '12', restSeconds: 45, notes: 'Superset F10 — Tirage haut volume.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Tabata Burpees & Jumping Jacks', limited: 'Tabata Burpees', home: 'Tabata Burpees' }, reps: '4 min (20s/10s)', restSeconds: 40, notes: 'Finisher haute intensité.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Respiration diaphragmatique & décompression', limited: 'Respiration & décompression', home: 'Respiration & décompression' }, reps: '3 min', restSeconds: 0, notes: 'Retour au calme.' }
    ]
  ],
  tone: [
    // Séance 1 : Bas du corps Glutes & Quads
    [
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Mobilité hanches & activation fessiers', limited: 'Mobilité hanches & fessiers', home: 'Mobilité hanches & fessiers' }, reps: '2 min', restSeconds: 30, notes: 'Préparation du bassin.' },
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Clamshell avec élastique', limited: 'Clamshell élastique', home: 'Clamshell poids du corps' }, reps: '15/côté', restSeconds: 30, notes: 'Activation moyen fessier.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Hip Thrust machine / barre', limited: 'Hip Thrust haltère', home: 'Hip Thrust unilatéral au sol' }, reps: '12', tempo: '2011', restSeconds: 75, notes: 'Pause 1s en haut, contraction fessiers.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Squat sumo haltère lourd', limited: 'Squat sumo haltère', home: 'Squat sumo Kettlebell / sac' }, reps: '12', tempo: '3010', restSeconds: 75, notes: 'Accent adductions et fessiers.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'G1', name: { full: 'Fentes bulgares', limited: 'Fentes bulgares avec chaise', home: 'Fentes bulgares au sol' }, reps: '10/jambe', restSeconds: 45, notes: 'Superset G1 — Galbe fessier.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'G2', name: { full: 'Abduction hanche élastique / poulie', limited: 'Abduction élastique', home: 'Abduction hanche allongée' }, reps: '15/côté', restSeconds: 60, notes: 'Superset G2 — Fessier latéral.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Frog Pumps Finisher', limited: 'Frog Pumps Finisher', home: 'Frog Pumps Finisher' }, reps: '50 reps', restSeconds: 40, notes: 'Brûlure fessière ciblée.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Étirements fessiers & relaxation', limited: 'Étirements fessiers', home: 'Étirements fessiers' }, reps: '3 min', restSeconds: 0, notes: 'Relâchement musculaire.' }
    ],
    // Séance 2 : Haut du corps Sculpte & Posture
    [
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Rotations d\'épaules & Ouverture thoracique', limited: 'Rotations d\'épaules & Ouverture', home: 'Rotations d\'épaules & Ouverture' }, reps: '2 min', restSeconds: 30, notes: 'Ouverture de posture.' },
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'YTWL d\'activation scapulaire', limited: 'YTWL d\'activation scapulaire', home: 'Bird-dog contrôlé' }, reps: '12', restSeconds: 30, notes: 'Renforcement du haut du dos.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Développé couché haltères', limited: 'Développé couché haltères', home: 'Pompes inclines / classiques' }, reps: '10–12', tempo: '3010', restSeconds: 75, notes: 'Galbe poitrine et bras.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Rowing unilatéral haltère', limited: 'Rowing unilatéral haltère', home: 'Rowing inversé sous table' }, reps: '10–12/bras', tempo: '2010', restSeconds: 75, notes: 'Dos dessiné et posture.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'G3', name: { full: 'Élévations latérales haltères', limited: 'Élévations latérales haltères', home: 'Élévations latérales avec bouteilles' }, reps: '15', restSeconds: 45, notes: 'Superset G3 — Galbe des épaules.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'G4', name: { full: 'Extensions triceps au-dessus de la tête', limited: 'Extensions triceps haltère', home: 'Dips sur chaise' }, reps: '12–15', restSeconds: 60, notes: 'Superset G4 — Tonification triceps.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Gainage commando & touches d\'épaules', limited: 'Gainage commando', home: 'Gainage commando' }, reps: '3 × 30 s', restSeconds: 40, notes: 'Finisher sangle abdominale.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Respiration guidée & stretching pecs/dorsaux', limited: 'Respiration & stretching', home: 'Respiration & stretching' }, reps: '3 min', restSeconds: 0, notes: 'Récupération.' }
    ],
    // Séance 3 : Full Body Tonique & Galbe
    [
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'World\'s Greatest Stretch', limited: 'World\'s Greatest Stretch', home: 'World\'s Greatest Stretch' }, reps: '2 min', restSeconds: 30, notes: 'Mobilité générale.' },
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Deadbug contrôlé', limited: 'Deadbug contrôlé', home: 'Deadbug contrôlé' }, reps: '10/côté', restSeconds: 30, notes: 'Activation du centre.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Squat gobelet avec pause 2s', limited: 'Squat gobelet haltère', home: 'Squat gobelet KB / Sac' }, reps: '10', tempo: '3210', restSeconds: 75, notes: 'Tension continue sur les cuisses.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Développé militaire debout', limited: 'Développé militaire haltères', home: 'Pompes piquées' }, reps: '10', tempo: '2010', restSeconds: 75, notes: 'Force & galbe haut du corps.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'G5', name: { full: 'Soulevé de terre unilatéral (Single Leg RDL)', limited: 'Single Leg RDL haltère', home: 'Single Leg RDL sans charge' }, reps: '10/jambe', restSeconds: 45, notes: 'Superset G5 — Équilibre & ischios.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'G6', name: { full: 'Rowing barre / haltères buste penché', limited: 'Rowing haltères', home: 'Rowing sac / KB' }, reps: '12', restSeconds: 60, notes: 'Superset G6 — Épaisseur du dos.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Tabata Mountain Climbers & Gainage', limited: 'Tabata Mountain Climbers', home: 'Tabata Mountain Climbers' }, reps: '4 min (20s/10s)', restSeconds: 40, notes: 'Brûleur métabolique.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Étirements complets & respiration', limited: 'Étirements complets', home: 'Étirements complets' }, reps: '3 min', restSeconds: 0, notes: 'Retour au calme.' }
    ],
    // Séance 4 : Core Stabilité & Obliques
    [
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Cat-Cow & Rotations thoraciques', limited: 'Cat-Cow & Rotations', home: 'Cat-Cow & Rotations' }, reps: '2 min', restSeconds: 30, notes: 'Mobilité vertébrale.' },
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Deadbug avec contraction 2s', limited: 'Deadbug contrôlé', home: 'Deadbug contrôlé' }, reps: '12/côté', restSeconds: 30, notes: 'Activation du transverse.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Gainage Pallof Press élastique', limited: 'Pallof Press élastique', home: 'Planche latérale avec élévation' }, reps: '12/côté', tempo: 'Contrôlé', restSeconds: 60, notes: 'Gainage anti-rotation & posture.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Fentes arrières avec rotation du buste', limited: 'Fentes arrières avec rotation', home: 'Fentes arrières avec rotation' }, reps: '10/jambe', restSeconds: 60, notes: 'Travail dynamique de stabilité.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'G7', name: { full: 'Gainage commando (Plank to Push-up)', limited: 'Gainage commando', home: 'Gainage commando' }, reps: '10 reps', restSeconds: 30, notes: 'Superset G7 — Renforcement tronc & épaules.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'G8', name: { full: 'Relevé de bassin au sol (Reverse Crunch)', limited: 'Reverse Crunch', home: 'Reverse Crunch' }, reps: '15', restSeconds: 45, notes: 'Superset G8 — Bas des abdominaux.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Planche dynamique Tabata', limited: 'Planche dynamique Tabata', home: 'Planche dynamique Tabata' }, reps: '4 min (20s/10s)', restSeconds: 40, notes: 'Tension maximale abdos.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Étirements sangle abdominale & dorsaux', limited: 'Étirements sangle abdominale', home: 'Étirements sangle abdominale' }, reps: '3 min', restSeconds: 0, notes: 'Relâchement musculaire.' }
    ],
    // Séance 5 : Full Body Sculpture & Définition
    [
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'World\'s Greatest Stretch', limited: 'World\'s Greatest Stretch', home: 'World\'s Greatest Stretch' }, reps: '2 min', restSeconds: 30, notes: 'Ouverture articulaire.' },
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Glute Bridge unilatéral', limited: 'Glute Bridge au sol', home: 'Glute Bridge au sol' }, reps: '12/côté', restSeconds: 30, notes: 'Activation fessiers.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Squat bulgare avec haltères', limited: 'Squat bulgare sur chaise', home: 'Squat bulgare au sol' }, reps: '10/jambe', tempo: '3010', restSeconds: 75, notes: 'Galbe unilatéral quadriceps & fessiers.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Développé incliné haltères', limited: 'Développé incliné haltères', home: 'Pompes déclinées / normales' }, reps: '10–12', tempo: '2010', restSeconds: 75, notes: 'Dessin de la ligne scapulaire & poitrine.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'G9', name: { full: 'Oiseau haltères buste penché', limited: 'Oiseau haltères', home: 'Tirage élastique ancrage porte' }, reps: '15', restSeconds: 45, notes: 'Superset G9 — Arrière d\'épaule & posture.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'G10', name: { full: 'Curl biceps & press épaules combiné', limited: 'Curl & press haltères', home: 'Curl & press bouteilles / KB' }, reps: '12', restSeconds: 60, notes: 'Superset G10 — Tonification combinée bras.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Circuit Fentes alternées & Swings', limited: 'Fentes & Swings', home: 'Fentes & Swings' }, reps: '3 min (30s/15s)', restSeconds: 40, notes: 'Brûlure globale.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Respiration & étirements doux', limited: 'Respiration & étirements', home: 'Respiration & étirements' }, reps: '3 min', restSeconds: 0, notes: 'Retour au calme.' }
    ]
  ],
  force: [
    // Séance 1 : Force Poussée & Tronc
    [
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'World\'s Greatest Stretch', limited: 'World\'s Greatest Stretch', home: 'World\'s Greatest Stretch' }, reps: '2 min', restSeconds: 30, notes: 'Mobilité articulaire complète.' },
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Gainage planche avec charge', limited: 'Gainage planche', home: 'Gainage planche' }, reps: '40 s', restSeconds: 30, notes: 'Verrouillage de la sangle abdominale.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Squat barre arrière', limited: 'Squat gobelet lourd', home: 'Pistol squat assisté / Squat lourd KB' }, reps: '5', tempo: '2010', restSeconds: 120, notes: 'Charge lourde. Technique irréprochable.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Soulevé de terre conventionnel', limited: 'Soulevé de terre haltères lourds', home: 'Kettlebell Swings lourds / SDT unilatéral' }, reps: '5', tempo: '1010', restSeconds: 120, notes: 'Tension maximale du système nerveux.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'H1', name: { full: 'Fentes arrières barre', limited: 'Fentes arrières haltères', home: 'Fentes arrières KB' }, reps: '8/jambe', restSeconds: 60, notes: 'Superset H1 — Accessoire de force unilatéral.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'H2', name: { full: 'Gainage Pallof Press', limited: 'Pallof Press avec élastique', home: 'Bird-Dog avec pause 3s' }, reps: '10/côté', restSeconds: 60, notes: 'Superset H2 — Stabilité anti-rotation.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Suspension barre lourde (Grip strength)', limited: 'Serrage serviette / Haltères hold', home: 'KB Hold unilatéral 45s' }, reps: '3 × 45 s', restSeconds: 40, notes: 'Renforcement du grip.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Décompression vertébrale & respiration', limited: 'Décompression vertébrale', home: 'Décompression vertébrale' }, reps: '3 min', restSeconds: 0, notes: 'Récupération du système nerveux central.' }
    ],
    // Séance 2 : Force Tirage & Chaîne Postérieure
    [
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Cat-Cow & Rotations thoraciques', limited: 'Cat-Cow & Rotations', home: 'Cat-Cow & Rotations' }, reps: '2 min', restSeconds: 30, notes: 'Mobilité de la colonne.' },
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Band pull-apart élastique', limited: 'Band pull-apart', home: 'Bird-Dog contrôlé' }, reps: '15', restSeconds: 30, notes: 'Activation dorsale.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Tractions lestées / pronation', limited: 'Tractions assistées élastique', home: 'Rowing inversé sous table' }, reps: '6', tempo: '2010', restSeconds: 120, notes: 'Force de tirage vertical.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Rowing barre lourd buste penché', limited: 'Rowing haltères lourd', home: 'Rowing KB unilatéral lourd' }, reps: '6', tempo: '2010', restSeconds: 120, notes: 'Force de tirage horizontal.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'H3', name: { full: 'Soulevé de terre roumain lourd', limited: 'Soulevé de terre roumain haltères', home: 'Single leg RDL lourd' }, reps: '8', restSeconds: 60, notes: 'Superset H3 — Ischios & lombaires.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'H4', name: { full: 'Face pull poulie lourd', limited: 'Oiseau haltères lourd', home: 'Tirage élastique lourd' }, reps: '12', restSeconds: 60, notes: 'Superset H4 — Arrière d\'épaule & posture.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Farmer Walk lourd avec haltères', limited: 'Farmer Walk lourd', home: 'Suitcase Carry unilatéral KB' }, reps: '3 × 50 m', restSeconds: 40, notes: 'Force de préhension et gainage.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Étirements chaîne postérieure & suspension', limited: 'Étirements & suspension', home: 'Étirements au sol' }, reps: '3 min', restSeconds: 0, notes: 'Relâchement vertébral.' }
    ],
    // Séance 3 : Force Bas du corps & Stabilité
    [
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Mobilité 90/90 & chevilles', limited: 'Mobilité 90/90', home: 'Mobilité 90/90' }, reps: '2 min', restSeconds: 30, notes: 'Amplitude articulaire.' },
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Pont fessier avec pause 3s', limited: 'Pont fessier pause 3s', home: 'Pont fessier pause 3s' }, reps: '12', restSeconds: 30, notes: 'Activation glutes.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Squat bulgare haltères lourds', limited: 'Squat bulgare haltères', home: 'Squat bulgare au sol lourd' }, reps: '6–8/jambe', tempo: '3010', restSeconds: 90, notes: 'Force unilatérale jambes.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Hip Thrust barre lourd', limited: 'Hip Thrust haltère lourd', home: 'Hip Thrust unilatéral lesté' }, reps: '8', tempo: '2011', restSeconds: 90, notes: 'Extension puissante de hanche.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'H5', name: { full: 'Fentes marchantes lourdes', limited: 'Fentes arrières lourdes', home: 'Fentes arrières lourd KB' }, reps: '8/jambe', restSeconds: 60, notes: 'Superset H5 — Stabilité genou/bassin.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'H6', name: { full: 'Abduction poulie / élastique lourd', limited: 'Abduction élastique fort', home: 'Abduction au sol gainée' }, reps: '12/côté', restSeconds: 60, notes: 'Superset H6 — Moyen fessier.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Kettlebell Swings lourds Finisher', limited: 'Swings haltère lourd', home: 'Swings KB lourd' }, reps: '3 × 15 reps', restSeconds: 40, notes: 'Puissance explosive finale.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Étirements fessiers & ischios', limited: 'Étirements fessiers & ischios', home: 'Étirements fessiers & ischios' }, reps: '3 min', restSeconds: 0, notes: 'Décompression.' }
    ],
    // Séance 4 : Force Poussée Verticale & Épaules
    [
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Rotations d\'épaules & Ouverture scapulaire', limited: 'Rotations d\'épaules', home: 'Rotations d\'épaules' }, reps: '2 min', restSeconds: 30, notes: 'Préparation coiffe des rotateurs.' },
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Band Pull-Apart & Pompes wall', limited: 'Band Pull-Apart', home: 'Pompes wall' }, reps: '15', restSeconds: 30, notes: 'Activation dentelé antérieur.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Développé militaire barre lourd', limited: 'Développé militaire haltères lourd', home: 'Pike Push-ups pieds surélevés' }, reps: '5', tempo: '2010', restSeconds: 120, notes: 'Presse verticale lourde. Tronc verrouillé.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Développé couché incliné barre', limited: 'Développé incliné haltères lourd', home: 'Pompes déclinées tempo 3-1-1' }, reps: '6', tempo: '3010', restSeconds: 120, notes: 'Force haut pectoraux & deltoïdes.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'H7', name: { full: 'Élévations latérales lourdes', limited: 'Élévations latérales haltères', home: 'Élévations latérales KB / sacs' }, reps: '10', restSeconds: 60, notes: 'Superset H7 — Massif latéral épaules.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'H8', name: { full: 'Dips lestés / Dips barres parallèles', limited: 'Dips sur banc lestés', home: 'Dips sur chaise' }, reps: '8', restSeconds: 60, notes: 'Superset H8 — Force triceps & pectoraux.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Farmer Carry unilatéral lourd', limited: 'Farmer Carry haltère lourd', home: 'Suitcase Carry KB' }, reps: '3 × 40 m', restSeconds: 40, notes: 'Grip & stabilité anti-inclinaison.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Étirements épaules & décompression', limited: 'Étirements épaules', home: 'Étirements épaules' }, reps: '3 min', restSeconds: 0, notes: 'Relâchement articulaire.' }
    ],
    // Séance 5 : Force Accessoires & Puissance Full Body
    [
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'World\'s Greatest Stretch & Mobilité hanches', limited: 'World\'s Greatest Stretch', home: 'World\'s Greatest Stretch' }, reps: '2 min', restSeconds: 30, notes: 'Déverrouillage complet.' },
      { phase: 1, phaseName: '1. Échauffement Dynamique & Activation', category: 'warmup', name: { full: 'Gainage commando d\'activation', limited: 'Gainage commando', home: 'Gainage commando' }, reps: '10 reps', restSeconds: 30, notes: 'Stabilité tronc.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Soulevé de terre roumain barre lourd', limited: 'SDT roumain haltères lourd', home: 'Single Leg RDL KB lourd' }, reps: '6', tempo: '3010', restSeconds: 120, notes: 'Tension maximale chaîne postérieure.' },
      { phase: 2, phaseName: '2. Mouvements Polyarticulaires Principaux', category: 'compound', name: { full: 'Push Press barre / haltères lourds', limited: 'Push Press haltères lourd', home: 'Thrusters lourds' }, reps: '5', tempo: 'Explosif', restSeconds: 120, notes: 'Puissance explosive synchronisée.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'H9', name: { full: 'Step-ups sur banc lestés', limited: 'Step-ups sur chaise lestés', home: 'Step-ups poids du corps' }, reps: '8/jambe', restSeconds: 60, notes: 'Superset H9 — Force unilatérale quadriceps.' },
      { phase: 3, phaseName: '3. Isolation & Supersets Métaboliques', category: 'isolation', supersetGroup: 'H10', name: { full: 'Rowing T-Bar / Rowing unilatéral lourd', limited: 'Rowing unilatéral haltère lourd', home: 'Rowing KB lourd' }, reps: '8/bras', restSeconds: 60, notes: 'Superset H10 — Épaisseur dos & grip.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Sled Push ou KB Swings lourds', limited: 'KB Swings lourds', home: 'KB Swings lourds' }, reps: '3 × 45 s', restSeconds: 40, notes: 'Explosivité finale.' },
      { phase: 4, phaseName: '4. Finisher & Récupération P1-P4', category: 'finisher', name: { full: 'Décompression vertébrale & stretching', limited: 'Décompression vertébrale', home: 'Décompression vertébrale' }, reps: '3 min', restSeconds: 0, notes: 'Retour au calme.' }
    ]
  ]
};

/* ─── GÉNÉRATION DES SÉANCES NORMALE & HYBRIDE ENDURANCE ──────────────── */

function getEquipmentAccessKey(gymAccess: UserProfile['gymAccess'], equipment?: UserProfile['equipment']): GymAccess {
  if (gymAccess === 'home' || equipment?.includes('poids-corps')) return 'home';
  if (gymAccess === 'limited' || equipment?.includes('halteres')) return 'limited';
  return 'full';
}

function buildStructuredSessions(p: UserProfile): WorkoutSession[] {
  const trainingDays = getTrainingDays(p.frequency);
  const accessKey = getEquipmentAccessKey(p.gymAccess, p.equipment);
  const exp = p.experience ?? 'intermédiaire';

  // Définir la volumétrie initiale basée sur l'expérience
  const mainSets = exp === 'débutante' ? 3 : exp === 'avancée' ? 5 : 4;
  const safeGoal = (p.mainGoal && GOAL_TEMPLATES_4PHASES[p.mainGoal]) ? p.mainGoal : 'muscle';
  const templates = GOAL_TEMPLATES_4PHASES[safeGoal] ?? GOAL_TEMPLATES_4PHASES['muscle'];

  return trainingDays.map((day, i) => {
    const rawTemplates = templates[i % templates.length];
    
    // Calcul de la répartition des phases
    let warmupCount = 0;
    let compoundCount = 0;
    let isolationCount = 0;
    let finisherCount = 0;

    const exercises: Exercise[] = rawTemplates.map((t, j) => {
      if (t.phase === 1) warmupCount++;
      if (t.phase === 2) compoundCount++;
      if (t.phase === 3) isolationCount++;
      if (t.phase === 4) finisherCount++;

      const rawName = t.name[accessKey] || t.name.home;
      const exerciseName = sanitizeExerciseName(rawName, p.healthConditions);
      const sets = t.phase === 1 ? 2 : t.phase === 2 ? mainSets : t.phase === 3 ? 3 : 2;
      const pattern = getBiomechanicalPattern(exerciseName);

      const tempo = t.tempo || '3-1-1-0';
      const baseRpe = t.rpe || (t.phase === 2 ? 'RPE 8.5' : t.phase === 3 ? 'RPE 8' : 'RPE 7');
      const rpe = capRpeForConditions(baseRpe, p.healthConditions) || baseRpe;
      const restSec = t.restSeconds || (t.phase === 2 ? 90 : 60);
      const restStr = t.rest || `${restSec}s`;
      const muscles = t.muscles || pattern.primaryMuscles;
      const biomechanicsTip = t.biomechanicsTip || t.notes || pattern.defaultNotes;
      const pregnancyNote = exerciseName !== rawName
        ? ' Mode grossesse/post-partum : variante sécurisée.'
        : '';

      return {
        id: `s${i}-e${j}`,
        name: exerciseName,
        sets,
        reps: t.reps,
        done: false,
        phase: t.phase,
        phaseName: t.phaseName,
        category: t.category,
        tempo,
        rpe,
        rest: restStr,
        restSeconds: restSec,
        supersetGroup: t.supersetGroup,
        muscles,
        biomechanicsTip,
        level: exp,
        notes: (t.notes || `💡 ${biomechanicsTip}`) + pregnancyNote,
      };
    });

    return {
      id: `session-${i}`,
      title: getSessionType(p.mainGoal, i, exp),
      category: p.mainGoal === 'force' ? 'Force' : p.mainGoal === 'gras' ? 'Cardio' : 'Renforcement',
      duration: p.sessionDuration,
      exerciseCount: exercises.length,
      completionPct: 0,
      isToday: false,
      day,
      exercises,
      phaseBreakdown: {
        warmupCount,
        compoundCount,
        isolationCount,
        finisherCount,
      }
    };
  });
}

function buildEnduranceSessions(p: UserProfile, cardioZones: { z2: string; z3: string; z4: string; z5: string }): WorkoutSession[] {
  const trainingDays = getTrainingDays(p.frequency);
  const accessKey = getEquipmentAccessKey(p.gymAccess, p.equipment);
  const pregnancySafe = isPregnancySafeMode(p.healthConditions);

  return trainingDays.map((day, i) => {
    const isRunning = i % 2 === 0;

    if (isRunning) {
      // Grossesse / post-partum : jamais Zone 5 / VMA
      const isZ2 = pregnancySafe ? true : i % 4 === 0;
      const targetZone = isZ2 ? cardioZones.z2 : cardioZones.z5;
      const title = isZ2
        ? (pregnancySafe
          ? 'Marche / footing Zone 2 — Effort conversationnel (grossesse/post-partum)'
          : 'Sortie Longue — Zone 2 (Endurance Fondamentale)')
        : 'Fractionné VMA — Zone 5 (Haute Intensité)';

      const exercises: Exercise[] = [
        {
          id: `s${i}-e0`,
          name: 'Mobilité & Activation Chevilles / Hanches',
          sets: 2,
          reps: '3 min',
          done: false,
          phase: 1,
          phaseName: '1. Échauffement Dynamique & Activation',
          category: 'warmup',
          notes: 'Dévrouillage des mollets & tendons d\'Achille.',
        },
        {
          id: `s${i}-e1`,
          name: title,
          sets: 1,
          reps: isZ2 ? (pregnancySafe ? '30 à 45 min continuous' : '60 à 90 min continuous') : '8 × 400m à VMA',
          done: false,
          phase: 2,
          phaseName: '2. Mouvements Polyarticulaires Principaux',
          category: 'cardio',
          notes: `🏃 Cible FC : ${targetZone}. Maintain target heart rate continuously.`,
        },
        {
          id: `s${i}-e2`,
          name: pregnancySafe ? 'Deadbug — respiration + plancher pelvien' : 'Gainage dynamique du bassin',
          sets: 3,
          reps: '45 s',
          done: false,
          phase: 3,
          phaseName: '3. Isolation & Supersets Métaboliques',
          category: 'isolation',
          notes: pregnancySafe
            ? 'Priorité transverse & plancher pelvien — éviter les crunchs.'
            : 'Stabilité du bassin en foulée.',
        },
        {
          id: `s${i}-e3`,
          name: 'Récupération active & Étirements mollets / TFL',
          sets: 1,
          reps: '5 min',
          done: false,
          phase: 4,
          phaseName: '4. Finisher & Récupération P1-P4',
          category: 'finisher',
          notes: 'Prévention de la tendinite du TFL et relâchement des soléaires.',
        }
      ];

      return {
        id: `session-${i}`,
        title,
        category: 'Cardio',
        duration: p.sessionDuration,
        exerciseCount: exercises.length,
        completionPct: 0,
        isToday: false,
        day,
        exercises,
        phaseBreakdown: { warmupCount: 1, compoundCount: 1, isolationCount: 1, finisherCount: 1 }
      };
    } else {
      // Renforcement spécifique pour coureur/cycliste
      const exercises: Exercise[] = [
        {
          id: `s${i}-e0`,
          name: 'Mobilité 90/90 & Activation fessiers',
          sets: 2,
          reps: '2 min',
          done: false,
          phase: 1,
          phaseName: '1. Échauffement Dynamique & Activation',
          category: 'warmup',
          notes: 'Activation articulaire des hanches.',
        },
        {
          id: `s${i}-e1`,
          name: accessKey === 'full' ? 'Squat barre arrière' : accessKey === 'limited' ? 'Squat gobelet haltère' : 'Squat Kettlebell / Poids du corps',
          sets: 4,
          reps: '8–10',
          done: false,
          phase: 2,
          phaseName: '2. Mouvements Polyarticulaires Principaux',
          category: 'compound',
          notes: 'Moteur principal de la foulée.',
        },
        {
          id: `s${i}-e2`,
          name: 'Mollets debout (excentrique lent 4s)',
          sets: 3,
          reps: '15',
          done: false,
          phase: 3,
          phaseName: '3. Isolation & Supersets Métaboliques',
          category: 'isolation',
          notes: 'Protection tendon d\'Achille.',
        },
        {
          id: `s${i}-e3`,
          name: 'Foam Roller & Étirements psoas',
          sets: 1,
          reps: '5 min',
          done: false,
          phase: 4,
          phaseName: '4. Finisher & Récupération P1-P4',
          category: 'finisher',
          notes: 'Défibrillation myofasciale.',
        }
      ];

      return {
        id: `session-${i}`,
        title: 'Renforcement Musculaire & Prévention Blessures',
        category: 'Renforcement',
        duration: p.sessionDuration,
        exerciseCount: exercises.length,
        completionPct: 0,
        isToday: false,
        day,
        exercises,
        phaseBreakdown: { warmupCount: 1, compoundCount: 1, isolationCount: 1, finisherCount: 1 }
      };
    }
  });
}

/* ─── GÉNÉRATION DU PROGRAMME COMPLET ────────────────────────────────────── */
export function generateProgram(p: UserProfile): GeneratedProgram {
  const calories = getCalories(p);
  const age = p.age ?? 28;

  const isVelo = p.cardioSport === 'velo';
  const fcMax = isVelo ? (220 - age - 5) : (220 - age);

  const cardioZones = {
    z2: `${Math.round(fcMax * 0.6)} - ${Math.round(fcMax * 0.7)} bpm`,
    z3: `${Math.round(fcMax * 0.7)} - ${Math.round(fcMax * 0.8)} bpm`,
    z4: `${Math.round(fcMax * 0.8)} - ${Math.round(fcMax * 0.9)} bpm`,
    z5: `${Math.round(fcMax * 0.9)} - ${fcMax} bpm`
  };

  const nutritionTips: { condition: string; recommendation: string }[] = [];

  const symptoms = p.digestiveSymptoms ?? [];
  if (symptoms.includes('ballonnements') || symptoms.includes('reflux')) {
    nutritionTips.push({
      condition: 'Confort digestif au quotidien',
      recommendation: 'Mange plus lentement, mastique bien, et privilégie les repas moins gras/ultra-transformés. Bois surtout entre les repas. Si l\'inconfort persiste, consulte un professionnel de santé.',
    });
  }
  if (symptoms.includes('fatigue-post-prandiale') || symptoms.includes('transit-irregulier')) {
    nutritionTips.push({
      condition: 'Énergie stable après les repas',
      recommendation: 'Construis des assiettes avec protéines + fibres + glucides complexes. Limite les sucres rapides seuls. Garde un rythme de repas régulier autour de tes séances.',
    });
  }

  const isEnduranceSport = p.cardioSport === 'course' || p.cardioSport === 'trail';
  if (isEnduranceSport) {
    nutritionTips.push({
      condition: 'Nutrition autour de l\'effort (endurance)',
      recommendation: 'Au-delà de 75 min : 60 à 90 g de glucides / heure + eau avec électrolytes régulièrement. Après l\'effort : protéines + glucides dans l\'heure qui suit.',
    });
  }

  if (isPregnancySafeMode(p.healthConditions)) {
    nutritionTips.push({
      condition: 'Mode grossesse / post-partum',
      recommendation: 'Programme adapté : pas de pliométrie, pas de VMA/Zone 5, core sécurisé (deadbug / bird-dog), RPE plafonné. Consulte toujours un professionnel de santé avant l\'effort.',
    });
  }

  const baseSessions = isEnduranceSport
    ? buildEnduranceSessions(p, cardioZones)
    : buildStructuredSessions(p);

  // Appliquer la périodisation de la semaine 1 par défaut
  const periodizationConfig = getWeekPeriodizationConfig(1);
  const periodizedSessions = baseSessions.map(s => getPeriodizedSession(s, 1, p.experience));

  return {
    id:              `prog-${Date.now()}`,
    name:            isEnduranceSport ? `Plan Hybride Endurance — ${p.cardioSport === 'trail' ? 'Trail' : 'Course'}` : getProgramName(p),
    goal:            p.mainGoal,
    experience:      p.experience,
    frequency:       p.frequency,
    sessionDuration: p.sessionDuration,
    gymAccess:       p.gymAccess,
    calories,
    macros:          getMacros(calories, p.mainGoal, p.morphotype),
    trainingDays:    getTrainingDays(p.frequency),
    sessions:        periodizedSessions,
    totalWeeks:      12,
    currentWeek:     1,
    periodizationConfig,
    startDate:       new Date().toISOString(),
    cardioZones,
    cardioSport:     p.cardioSport ?? 'general',
    digestiveProtocol: nutritionTips,
  };
}

/* ─── PERSISTANCE FIRESTORE ──────────────────────────────────────────────── */
export async function saveProgram(uid: string, program: GeneratedProgram) {
  const cleanProg = cleanObject(program);
  await setDoc(doc(db, 'users', uid), {
    program: cleanProg,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/* ─── AJUSTEMENT DU PROGRAMME ────────────────────────────────────────────── */
export async function adjustProgram(
  uid: string,
  currentProgram: GeneratedProgram,
  feedback: 'too-easy' | 'perfect' | 'too-hard',
  newFrequency?: number
) {
  const adjustedSessions = currentProgram.sessions.map(session => {
    const adjustedExercises = session.exercises.map(ex => {
      let reps = ex.reps;
      if (feedback === 'too-easy') {
        if (typeof reps === 'number') {
          reps = Math.min(15, reps + 2);
        } else if (typeof reps === 'string' && reps.includes('–')) {
          const parts = reps.split('–').map(Number);
          reps = `${parts[0] + 2}–${parts[1] + 2}`;
        }
      } else if (feedback === 'too-hard') {
        if (typeof reps === 'number') {
          reps = Math.max(6, reps - 2);
        } else if (typeof reps === 'string' && reps.includes('–')) {
          const parts = reps.split('–').map(Number);
          reps = `${Math.max(6, parts[0] - 2)}–${Math.max(8, parts[1] - 2)}`;
        }
      }
      return { ...ex, reps };
    });
    return { ...session, exercises: adjustedExercises };
  });

  const adjustedProgram: GeneratedProgram = {
    ...currentProgram,
    sessions: adjustedSessions,
    frequency: (newFrequency as any) || currentProgram.frequency,
    name: currentProgram.name.replace(' (Ajusté)', '') + ' (Ajusté)',
    startDate: new Date().toISOString(),
  };

  await saveProgram(uid, adjustedProgram);
  
  await setDoc(doc(db, 'users', uid), {
    lastProgramAdjustmentDate: new Date().toISOString(),
    adjustmentCount: ((currentProgram as any).adjustmentCount ?? 0) + 1,
  }, { merge: true });

  return adjustedProgram;
}

/* ─── RÉGÉNÉRATION COMPLÈTE DU PROGRAMME SUR-MESURE ─────────────────────── */
export interface RegenerationOptions {
  frictionPoints: string[];
  focusAreas: string[];
  gymAccess: UserProfile['gymAccess'];
  frequency: UserProfile['frequency'];
  intensity: 'light' | 'moderate' | 'intense';
}

export async function regenerateTailoredProgram(
  uid: string,
  currentProgram: GeneratedProgram,
  options: RegenerationOptions,
  currentProfile?: Partial<UserProfile>
) {
  const updatedProfile: UserProfile = {
    gymAccess: options.gymAccess || currentProgram.gymAccess || 'halteres',
    frequency: options.frequency || currentProgram.frequency || 3,
    sessionDuration: options.frictionPoints.includes('too-long') ? 30 : (currentProgram.sessionDuration || 45),
    mainGoal: currentProgram.goal || 'muscle',
    experience: currentProgram.experience || 'intermédiaire',
    age: currentProfile?.age || 28,
    sex: currentProfile?.sex || 'femme',
    currentWeightKg: currentProfile?.currentWeightKg || 70,
    targetWeightKg: currentProfile?.targetWeightKg || 65,
    heightCm: currentProfile?.heightCm || 165,
    activityLevel: currentProfile?.activityLevel || 'actif',
    healthConditions: currentProfile?.healthConditions || '',
    dietaryRestrictions: currentProfile?.dietaryRestrictions || [],
    cardioSport: currentProfile?.cardioSport,
  } as UserProfile;

  const newProgram = generateProgram(updatedProfile);

  const tailoredSessions = newProgram.sessions.map((sess) => {
    let customExercises = [...sess.exercises];

    if (options.gymAccess === 'kettlebell-board') {
      customExercises = customExercises.map(ex => {
        const n = ex.name.toLowerCase();
        if (n.includes('pompe') || n.includes('push-up') || n.includes('développé') || n.includes('pec')) {
          return {
            ...ex,
            name: 'Pompes Push-Up Board (Prise Modulaire & Contrôlée)',
            notes: 'Varier les angles d\'ancrage (Neutre / Large / Serré) pour cibler sous tous les angles',
          };
        }
        if (n.includes('squat') || n.includes('fente')) {
          return {
            ...ex,
            name: 'Goblet Squat Kettlebell',
            notes: 'Maintien de la Kettlebell contre le torse, amplitude complète',
          };
        }
        if (n.includes('soulevé') || n.includes('deadlift') || n.includes('ischio') || n.includes('hips')) {
          return {
            ...ex,
            name: 'Kettlebell Swings Explosifs & Hinge',
            notes: 'Extension dynamique des hanches & engagement de la chaîne postérieure',
          };
        }
        if (n.includes('rowing') || n.includes('tirage')) {
          return {
            ...ex,
            name: 'Rowing Unilatéral Kettlebell (Buste Penché)',
            notes: 'Tirage coude près du corps, contrôle de la phase négative',
          };
        }
        if (n.includes('épaule') || n.includes('développé militaire') || n.includes('press')) {
          return {
            ...ex,
            name: 'Clean & Press Kettlebell Unilatéral',
            notes: 'Épaulé puis poussée verticale au-dessus de la tête',
          };
        }
        return ex;
      });
    }

    if (options.frictionPoints.includes('high-impact')) {
      customExercises = customExercises.map(ex => {
        if (ex.name.toLowerCase().includes('burpee') || ex.name.toLowerCase().includes('jump')) {
          return {
            ...ex,
            name: 'Shadow Boxing Contrôlé',
            notes: 'Alternative sans impact articulaire',
          };
        }
        return ex;
      });
    }

    if (options.intensity === 'light') {
      customExercises = customExercises.map(ex => ({
        ...ex,
        reps: typeof ex.reps === 'number' ? Math.max(8, ex.reps - 2) : ex.reps,
      }));
    } else if (options.intensity === 'intense') {
      customExercises = customExercises.map(ex => ({
        ...ex,
        reps: typeof ex.reps === 'number' ? ex.reps + 2 : ex.reps,
      }));
    }

    return {
      ...sess,
      exercises: customExercises,
    };
  });

  const finalProgram: GeneratedProgram = {
    ...newProgram,
    id: `prog_regen_${Date.now()}`,
    name: `${newProgram.name} (Recalibré)`,
    sessions: tailoredSessions,
    startDate: new Date().toISOString(),
  };

  // Synchronisation Firestore sécurisée (non-bloquante pour la persistance locale)
  if (uid && uid !== 'local_user') {
    try {
      await saveProgram(uid, finalProgram);
      await setDoc(doc(db, 'users', uid), {
        lastProgramRegenerationDate: new Date().toISOString(),
        regenerationCount: ((currentProgram as any).regenerationCount ?? 0) + 1,
        gymAccess: options.gymAccess,
        frequency: options.frequency,
      }, { merge: true });
    } catch (fsErr) {
      console.warn('Sync Firestore non-bloquante lors de la régénération:', fsErr);
    }
  }

  return finalProgram;
}

/* ─── HELPERS D'AFFICHAGE ET PROGRESSION ─────────────────────────────────── */
const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export function getProgramProgress(program: GeneratedProgram) {
  const start = new Date(program.startDate).getTime();
  const totalDays = program.totalWeeks * 7;
  const day  = Math.min(totalDays, Math.max(1, Math.floor((Date.now() - start) / 86_400_000) + 1));
  const week = Math.min(program.totalWeeks, Math.ceil(day / 7));
  return {
    day, week, totalDays,
    totalWeeks: program.totalWeeks,
    completionPct: Math.round((day / totalDays) * 100),
  };
}

export function getTodaySession(program: GeneratedProgram): { session: WorkoutSession; isToday: boolean } | null {
  if (!program.sessions?.length) return null;
  const todayName = DAY_NAMES[new Date().getDay()];
  const todaySession = program.sessions.find(s => s.day === todayName);
  if (todaySession) return { session: todaySession, isToday: true };
  const todayIdx = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const upcoming = program.sessions.find(s => DAY_NAMES.indexOf(s.day ?? '') > todayIdx);
  return { session: upcoming ?? program.sessions[0], isToday: false };
}
