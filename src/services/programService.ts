/**
 * programService — le "cerveau" local de Pure Ascension.
 * Génère le programme réel (entraînement + cibles nutrition) à partir du
 * profil diagnostic, et le persiste dans Firestore (users/{uid}.program).
 *
 * En Phase 2, le pipeline IA (Make/Claude) pourra écrire le même schéma
 * dans users/{uid}.program — le front n'aura pas à changer.
 */
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { cleanObject } from './dbService';
import type { UserProfile, WorkoutSession, Exercise } from '../data';

/* ─── Types ──────────────────────────────────────────────────────────────── */
export interface ProgramMacros { protein: number; carbs: number; fat: number }

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
  startDate:       string; // ISO — début du programme
  cardioZones?:    { z2: string; z3: string; z4: string; z5: string };
  cardioSport?:    UserProfile['cardioSport'];
  digestiveProtocol?: { condition: string; recommendation: string }[];
}

/* ─── Nom du programme selon objectif + expérience ──────────────────────── */
export function getProgramName(p: UserProfile): string {
  const names: Record<UserProfile['mainGoal'], Record<UserProfile['experience'], string>> = {
    muscle: { débutante: 'Force Fondation', intermédiaire: 'Force Avancée',     avancée: 'Force Élite'      },
    gras:   { débutante: 'Brûle & Sculpt',  intermédiaire: 'Métabolisme Actif', avancée: 'Fat Burner Pro'   },
    tone:   { débutante: 'Corps Léger',     intermédiaire: 'Corps Sculpté',     avancée: 'Corps Athlétique' },
    force:  { débutante: 'Puissance I',     intermédiaire: 'Puissance II',      avancée: 'Puissance Élite'  },
  };
  return names[p.mainGoal][p.experience];
}

/* ─── Calories cibles (Mifflin-St Jeor — sexe, âge et activité réels) ───── */
export function getCalories(p: UserProfile): number {
  const age = Number(p.age) || 28;
  const currentWeightKg = Number(p.currentWeightKg) || 70;
  const heightCm = Number(p.heightCm) || 165;

  // Constante Mifflin : homme +5, femme −161, non précisé → moyenne
  const sexConst = p.sex === 'homme' ? 5 : p.sex === 'femme' ? -161 : -78;
  const bmr = 10 * currentWeightKg + 6.25 * heightCm - 5 * age + sexConst;

  // Facteur d'activité : NEAT quotidien + volume d'entraînement prévu
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

/* ─── Macros en grammes depuis les calories (ajustées au morphotype) ────── */
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
  // Ectomorphe : métabolise vite → plus de glucides. Endomorphe : sensibilité
  // insulinique plus faible → moins de glucides, plus de protéines/lipides.
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

/* ─── Jours d'entraînement selon fréquence ──────────────────────────────── */
export function getTrainingDays(freq: UserProfile['frequency']): string[] {
  const options: Record<UserProfile['frequency'], string[]> = {
    2: ['Lundi', 'Jeudi'],
    3: ['Lundi', 'Mercredi', 'Vendredi'],
    4: ['Lundi', 'Mardi', 'Jeudi', 'Samedi'],
    5: ['Lundi', 'Mardi', 'Mercredi', 'Vendredi', 'Samedi'],
    6: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  };
  return options[freq];
}

/* ─── Type de séance selon objectif + jour ──────────────────────────────── */
export function getSessionType(goal: UserProfile['mainGoal'], dayIdx: number): string {
  const types: Record<UserProfile['mainGoal'], string[]> = {
    muscle: ['Haut du corps — Push', 'Bas du corps', 'Haut du corps — Pull', 'Full Body', 'Cardio HIIT'],
    gras:   ['Circuit training', 'Cardio HIIT', 'Musculation métabolique', 'Cardio steady-state', 'Full Body brûle-graisses'],
    tone:   ['Fessiers & Abdos', 'Haut du corps léger', 'Circuit cardio', 'Bas du corps', 'Pilates fonctionnel'],
    force:  ['Squat & Deadlift', 'Bench & Rows', 'Overhead & Core', 'Squat volume', 'Accessoires & mobilité'],
  };
  const list = types[goal];
  return list[dayIdx % list.length];
}

/* ─── Bibliothèque d'exercices ───────────────────────────────────────────
 * Par objectif : 5 séances × 6 exercices (version salle complète).
 * `main: true` = mouvement principal → volume ajusté selon l'expérience.
 * Les variantes maison / équipement limité sont gérées par substitution.  */
type ExTemplate = { name: string; reps: number | string; main?: boolean; notes?: string };

const LIBRARY: Record<UserProfile['mainGoal'], ExTemplate[][]> = {
  muscle: [
    [ // Haut du corps — Push
      { name: 'Développé couché haltères', reps: '8–10', main: true, notes: 'Coudes à ~45°, contrôle la descente 2 s.' },
      { name: 'Développé militaire haltères', reps: '8–10', main: true },
      { name: 'Développé incliné haltères', reps: 10 },
      { name: 'Élévations latérales', reps: '12–15' },
      { name: 'Dips sur banc', reps: '10–12' },
      { name: 'Extensions triceps corde', reps: 12 },
    ],
    [ // Bas du corps
      { name: 'Squat barre', reps: '6–8', main: true, notes: 'Descends jusqu\'à 90° de flexion. Dos droit, regard devant.' },
      { name: 'Soulevé de terre roumain', reps: '8–10', main: true },
      { name: 'Presse à cuisses', reps: 10 },
      { name: 'Fentes marchées', reps: '10/jambe' },
      { name: 'Mollets debout', reps: 15 },
      { name: 'Gainage planche', reps: '45 s' },
    ],
    [ // Haut du corps — Pull
      { name: 'Tractions assistées', reps: '6–8', main: true },
      { name: 'Rowing barre', reps: '8–10', main: true },
      { name: 'Tirage vertical poulie', reps: 10 },
      { name: 'Rowing haltère unilatéral', reps: '10/bras' },
      { name: 'Face pull', reps: 15 },
      { name: 'Curl biceps haltères', reps: '10–12' },
    ],
    [ // Full Body
      { name: 'Squat gobelet', reps: 10, main: true },
      { name: 'Développé couché haltères', reps: 10, main: true },
      { name: 'Rowing haltères buste penché', reps: 10 },
      { name: 'Hip thrust', reps: 12 },
      { name: 'Planche latérale', reps: '30 s/côté' },
      { name: 'Farmer walk', reps: '30 m' },
    ],
    [ // Cardio HIIT
      { name: 'Burpees', reps: '30 s' },
      { name: 'Mountain climbers', reps: '30 s' },
      { name: 'Squats sautés', reps: '30 s' },
      { name: 'Kettlebell swings', reps: 15 },
      { name: 'Corde à sauter', reps: '60 s' },
      { name: 'Gainage dynamique', reps: '30 s' },
    ],
  ],
  gras: [
    [ // Circuit training
      { name: 'Squat gobelet', reps: 12, main: true },
      { name: 'Pompes (genoux si besoin)', reps: '10–12' },
      { name: 'Rowing haltères', reps: 12 },
      { name: 'Fentes alternées', reps: '10/jambe' },
      { name: 'Mountain climbers', reps: '30 s' },
      { name: 'Planche', reps: '40 s' },
    ],
    [ // Cardio HIIT
      { name: 'Burpees', reps: '30 s' },
      { name: 'Squats sautés', reps: '30 s' },
      { name: 'High knees', reps: '30 s' },
      { name: 'Jumping jacks', reps: '45 s' },
      { name: 'Corde à sauter', reps: '60 s' },
      { name: 'Récupération marche rapide', reps: '60 s' },
    ],
    [ // Musculation métabolique
      { name: 'Soulevé de terre roumain haltères', reps: 12, main: true },
      { name: 'Développé militaire haltères', reps: 12, main: true },
      { name: 'Goblet squat tempo lent', reps: 10 },
      { name: 'Rowing unilatéral', reps: '12/bras' },
      { name: 'Kettlebell swings', reps: 15 },
      { name: 'Gainage latéral', reps: '30 s/côté' },
    ],
    [ // Cardio steady-state
      { name: 'Marche inclinée ou vélo (zone 2)', reps: '20–30 min', main: true, notes: 'Tu dois pouvoir tenir une conversation. C\'est le but.' },
      { name: 'Étirements hanches', reps: '2 min' },
      { name: 'Étirements ischio-jambiers', reps: '2 min' },
      { name: 'Respiration profonde', reps: '2 min' },
    ],
    [ // Full Body brûle-graisses
      { name: 'Thrusters haltères', reps: 12, main: true },
      { name: 'Fentes sautées', reps: '8/jambe' },
      { name: 'Pompes', reps: '10–12' },
      { name: 'Rowing haltères', reps: 12 },
      { name: 'Burpees', reps: 10 },
      { name: 'Planche', reps: '45 s' },
    ],
  ],
  tone: [
    [ // Fessiers & Abdos
      { name: 'Hip thrust', reps: 12, main: true, notes: 'Pause 1 s en haut, serre les fessiers.' },
      { name: 'Squat sumo haltère', reps: 12, main: true },
      { name: 'Fentes bulgares', reps: '10/jambe' },
      { name: 'Abduction hanches élastique', reps: 15 },
      { name: 'Crunch bicyclette', reps: 20 },
      { name: 'Planche', reps: '40 s' },
    ],
    [ // Haut du corps léger
      { name: 'Développé haltères légers', reps: 12, main: true },
      { name: 'Rowing élastique ou haltères', reps: 12 },
      { name: 'Élévations latérales', reps: 15 },
      { name: 'Pompes inclinées', reps: '8–10' },
      { name: 'Curl biceps', reps: 12 },
      { name: 'Extensions triceps', reps: 12 },
    ],
    [ // Circuit cardio
      { name: 'Jumping jacks', reps: '45 s' },
      { name: 'Squats au poids du corps', reps: 15 },
      { name: 'Mountain climbers', reps: '30 s' },
      { name: 'Fentes alternées', reps: '10/jambe' },
      { name: 'High knees', reps: '30 s' },
      { name: 'Gainage', reps: '30 s' },
    ],
    [ // Bas du corps
      { name: 'Squat gobelet', reps: 12, main: true },
      { name: 'Soulevé de terre roumain haltères', reps: 12, main: true },
      { name: 'Leg curl ou pont fessier', reps: 12 },
      { name: 'Fentes marchées', reps: '10/jambe' },
      { name: 'Mollets debout', reps: 15 },
      { name: 'Gainage', reps: '45 s' },
    ],
    [ // Pilates fonctionnel
      { name: 'Dead bug', reps: '10/côté', main: true },
      { name: 'Bird dog', reps: '10/côté' },
      { name: 'Pont fessier tempo lent', reps: 12 },
      { name: 'Planche latérale', reps: '30 s/côté' },
      { name: 'Superman', reps: 12 },
      { name: 'Étirements colonne', reps: '2 min' },
    ],
  ],
  force: [
    [ // Squat & Deadlift
      { name: 'Squat barre', reps: 5, main: true, notes: 'Charge lourde, technique parfaite. Filme-toi si possible.' },
      { name: 'Soulevé de terre', reps: 5, main: true },
      { name: 'Fentes arrières barre', reps: 8 },
      { name: 'Mollets debout', reps: 12 },
      { name: 'Gainage lesté', reps: '30 s' },
      { name: 'Suspension barre (grip)', reps: '30 s' },
    ],
    [ // Bench & Rows
      { name: 'Développé couché barre', reps: 5, main: true },
      { name: 'Rowing barre', reps: 6, main: true },
      { name: 'Développé incliné haltères', reps: 8 },
      { name: 'Tractions', reps: '6–8' },
      { name: 'Face pull', reps: 15 },
      { name: 'Curl marteau', reps: 10 },
    ],
    [ // Overhead & Core
      { name: 'Développé militaire barre', reps: 5, main: true },
      { name: 'Push press', reps: 6, main: true },
      { name: 'Élévations latérales', reps: 12 },
      { name: 'Gainage planche lestée', reps: '40 s' },
      { name: 'Pallof press', reps: '10/côté' },
      { name: 'Farmer walk lourd', reps: '30 m' },
    ],
    [ // Squat volume
      { name: 'Squat barre (volume)', reps: 8, main: true, notes: '70–75 % de ta charge lourde du jour 1.' },
      { name: 'Presse à cuisses', reps: 10 },
      { name: 'Soulevé de terre roumain', reps: 8 },
      { name: 'Fentes marchées', reps: '8/jambe' },
      { name: 'Leg curl', reps: 12 },
      { name: 'Mollets assis', reps: 15 },
    ],
    [ // Accessoires & mobilité
      { name: 'Hip thrust', reps: 10, main: true },
      { name: 'Tirage vertical', reps: 10 },
      { name: 'Rowing unilatéral', reps: '10/bras' },
      { name: 'Mobilité hanches 90/90', reps: '2 min' },
      { name: 'Mobilité épaules bâton', reps: '2 min' },
      { name: 'Étirements complets', reps: '5 min' },
    ],
  ],
};

/* Substitutions maison (pas de matériel lourd) */
const HOME_SUBS: Record<string, string> = {
  'Squat barre': 'Squat au poids du corps (ou sac lesté)',
  'Squat barre (volume)': 'Squat tempo lent 3-1-3',
  'Développé couché haltères': 'Pompes',
  'Développé couché barre': 'Pompes lestées (sac à dos)',
  'Développé incliné haltères': 'Pompes déclinées pieds surélevés',
  'Développé militaire haltères': 'Pompes piquées (pike push-up)',
  'Développé militaire barre': 'Pompes piquées (pike push-up)',
  'Développé haltères légers': 'Pompes inclinées mains surélevées',
  'Push press': 'Pompes piquées explosives',
  'Presse à cuisses': 'Squat bulgare (pied arrière sur chaise)',
  'Tractions assistées': 'Rowing inversé sous une table',
  'Tractions': 'Rowing inversé sous une table',
  'Rowing barre': 'Rowing élastique ou bouteilles d\'eau',
  'Rowing haltères': 'Rowing élastique',
  'Rowing haltères buste penché': 'Rowing élastique buste penché',
  'Tirage vertical poulie': 'Tractions élastique porte',
  'Tirage vertical': 'Tractions élastique porte',
  'Face pull': 'Élastique face pull',
  'Leg curl': 'Leg curl au sol (serviette glissée)',
  'Leg curl ou pont fessier': 'Pont fessier une jambe',
  'Soulevé de terre': 'Soulevé de terre sac lesté',
  'Soulevé de terre roumain': 'Soulevé de terre roumain une jambe',
  'Soulevé de terre roumain haltères': 'Soulevé de terre roumain une jambe',
  'Kettlebell swings': 'Swings avec bouteille/sac',
  'Farmer walk': 'Marche sacs de courses lourds',
  'Farmer walk lourd': 'Marche sacs de courses lourds',
  'Hip thrust': 'Hip thrust au sol une jambe',
  'Mollets assis': 'Mollets debout sur marche',
  'Fentes arrières barre': 'Fentes arrières sautées',
  'Gainage lesté': 'Gainage planche',
  'Gainage planche lestée': 'Gainage planche',
  'Thrusters haltères': 'Squat + pompe enchaînés',
  'Suspension barre (grip)': 'Serrage serviette 30 s',
  'Marche inclinée ou vélo (zone 2)': 'Marche rapide extérieure (zone 2)',
  'Squat sumo haltère': 'Squat sumo poids du corps tempo lent',
  'Squat gobelet': 'Squat gobelet (sac ou bouteille)',
};

/* Substitutions équipement limité (haltères ok, pas de barre/machines) */
const LIMITED_SUBS: Record<string, string> = {
  'Squat barre': 'Squat gobelet haltère lourd',
  'Squat barre (volume)': 'Squat gobelet tempo lent',
  'Développé couché barre': 'Développé couché haltères',
  'Développé militaire barre': 'Développé militaire haltères',
  'Push press': 'Push press haltères',
  'Rowing barre': 'Rowing haltères buste penché',
  'Presse à cuisses': 'Squat bulgare haltères',
  'Tirage vertical poulie': 'Tractions assistées élastique',
  'Tirage vertical': 'Tractions assistées élastique',
  'Leg curl': 'Leg curl au sol (serviette)',
  'Soulevé de terre': 'Soulevé de terre haltères',
  'Fentes arrières barre': 'Fentes arrières haltères',
  'Mollets assis': 'Mollets debout haltères',
  'Face pull': 'Élastique face pull',
};

function adaptExercise(name: string, access: UserProfile['gymAccess']): string {
  if (access === 'home')    return HOME_SUBS[name]    ?? name;
  if (access === 'limited') return LIMITED_SUBS[name] ?? name;
  return name;
}

/* ─── Séances Hybrides Endurance (Course / Trail / Marathon) ─────────────── */
function buildEnduranceSessions(p: UserProfile, cardioZones: { z2: string; z3: string; z4: string; z5: string }): WorkoutSession[] {
  const trainingDays = getTrainingDays(p.frequency);
  
  // Répartition de la semaine d'entraînement endurance (modèle polarisé 80/20)
  // 80% Zone 2 (endurance fondamentale) + 20% haute intensité (Z4/Z5)
  type EnduranceSessionTemplate = {
    title: string;
    category: string;
    type: 'running' | 'strength';
    exercises: ExTemplate[];
    cardioInstructions?: string;
  };

  const ENDURANCE_WEEK: EnduranceSessionTemplate[] = [
    {
      title: 'Sortie Longue — Zone 2 (Endurance Fondamentale)',
      category: 'Cardio',
      type: 'running',
      exercises: [],
      cardioInstructions: `Cible FC : ${cardioZones.z2}. Course à allure conversationnelle. Durée : 60 à 90 min. C'est la pierre angulaire du marathon — brûle les graisses, épargne le glycogène.`
    },
    {
      title: 'Renforcement Musculaire — Prévention Blessures',
      category: 'Force',
      type: 'strength',
      exercises: [
        { name: 'Hip thrust unilatéral', reps: '10–12', main: true, notes: 'Renforcement fessiers — moteur principal de la foulée. Tempo : 2010.' },
        { name: 'Mollets debout sur marche (excentrique lent)', reps: '15–20', main: true, notes: 'Protection tendon d\'Achille. Descente 4 s, montée 1 s.' },
        { name: 'Gainage planche latérale', reps: '30s', notes: 'Stabilité du bassin en foulée. Tempo : tenir 30 s.' },
        { name: 'Fentes arrières haltères', reps: '10–12', main: true, notes: 'Renforcement VMO et gainage dynamique. Tempo : 2010.' },
        { name: 'Good morning haltères', reps: 12, notes: 'Chaîne postérieure des ischio-jambiers — prévention claquage. Tempo : 2010.' },
        { name: 'Gainage planche bras tendus', reps: '30–60s', notes: 'Gainage profond : transverse et érecteurs. Respiration diaphragmatique.' },
      ]
    },
    {
      title: 'Fractionné VMA — Zone 5 (Vitesse Maximale Aérobie)',
      category: 'Cardio',
      type: 'running',
      exercises: [],
      cardioInstructions: `Cible FC : ${cardioZones.z5}. 8 × 400m à allure maximale / 90s de récupération marche. Améliore le VO2max — indispensable pour améliorer ta vitesse de croisière en compétition.`
    },
    {
      title: 'Sortie Récupération Active — Zone 2 (Footing léger)',
      category: 'Cardio',
      type: 'running',
      exercises: [],
      cardioInstructions: `Cible FC : ${cardioZones.z2}. 30 à 45 min à allure très lente. Objectif : favoriser l\'élimination des métabolites post-fractionné et maintenir le volume sans fatigue.`
    },
    {
      title: 'Tempo Run — Zone 4 (Seuil Lactate)',
      category: 'Cardio',
      type: 'running',
      exercises: [],
      cardioInstructions: `Cible FC : ${cardioZones.z4}. 20 à 30 min continus à allure seuil — légèrement inconfortable. Repousse le mur du lactate pour courir plus vite plus longtemps.`
    },
    {
      title: 'Gainage & Mobilité — Récupération Active',
      category: 'Renforcement',
      type: 'strength',
      exercises: [
        { name: 'Étirements psoas-iliaque', reps: '60s chaque côté', notes: 'Indispensable pour les coureurs — prévient la tendinite du TFL.' },
        { name: 'Rotations thoraciques', reps: '10 chaque côté', notes: 'Mobilité vertébrale pour une foulée détendue.' },
        { name: 'Gainage abdo creux', reps: '3 × 30s', notes: 'Respiration diaphragmatique profonde à chaque répétition.' },
        { name: 'Foam roller mollets & IT Band', reps: '2 min chaque zone', notes: 'Défibrillation myofasciale post-effort.' },
      ]
    }
  ];

  return trainingDays.map((day, i) => {
    const template = ENDURANCE_WEEK[i % ENDURANCE_WEEK.length];
    
    if (template.type === 'running') {
      // Séance de course — 1 exercice représentant les instructions cardio
      const exercises: Exercise[] = [{
        id: `s${i}-cardio`,
        name: template.title,
        sets: 1,
        reps: template.cardioInstructions || '',
        done: false,
        notes: `🏃 Zone cible : ${i % 3 === 0 ? cardioZones.z2 : i % 3 === 1 ? cardioZones.z5 : cardioZones.z4}`,
      }];
      return {
        id: `session-${i}`,
        title: template.title,
        category: template.category,
        duration: p.sessionDuration,
        exerciseCount: 1,
        completionPct: 0,
        isToday: false,
        day,
        exercises,
      };
    } else {
      // Séance de renforcement musculaire
      const exercises: Exercise[] = template.exercises.map((t, j) => ({
        id: `s${i}-e${j}`,
        name: adaptExercise(t.name, p.gymAccess),
        sets: t.main ? 3 : 2,
        reps: t.reps,
        done: false,
        notes: t.notes || 'Tempo : 2010 (2s descente, 0s bas, 1s montée, 0s haut)',
      }));
      return {
        id: `session-${i}`,
        title: template.title,
        category: template.category,
        duration: p.sessionDuration,
        exerciseCount: exercises.length,
        completionPct: 0,
        isToday: false,
        day,
        exercises,
      };
    }
  });
}

/* ─── Génération des séances standards ────────────────────────────────────── */
function buildSessions(p: UserProfile): WorkoutSession[] {
  const trainingDays = getTrainingDays(p.frequency);
  // Volume selon durée de séance et expérience
  const exCount   = p.sessionDuration === 30 ? 4 : p.sessionDuration === 45 ? 5 : 6;
  const mainSets  = p.experience === 'débutante' ? 3 : p.experience === 'avancée' ? 5 : 4;
  const accSets   = 3;

  return trainingDays.map((day, i) => {
    const templates = LIBRARY[p.mainGoal][i % LIBRARY[p.mainGoal].length].slice(0, exCount);
    const exercises: Exercise[] = templates.map((t, j) => ({
      id:    `s${i}-e${j}`,
      name:  adaptExercise(t.name, p.gymAccess),
      sets:  t.main ? mainSets : accSets,
      reps:  t.reps,
      done:  false,
      notes: t.notes || 'Tempo : 2010 (2s descente, 0s bas, 1s montée, 0s haut)',
    }));
    return {
      id:            `session-${i}`,
      title:         getSessionType(p.mainGoal, i),
      category:      p.mainGoal === 'force' ? 'Force' : p.mainGoal === 'gras' ? 'Cardio' : 'Renforcement',
      duration:      p.sessionDuration,
      exerciseCount: exercises.length,
      completionPct: 0,
      isToday:       false,
      day,
      exercises,
    };
  });
}

/* ─── Programme complet ──────────────────────────────────────────────────── */
export function generateProgram(p: UserProfile): GeneratedProgram {
  const calories = getCalories(p);
  const age = p.age ?? 28;
  
  // Calcul de la FC Max (Spécificité Vélo : FC Max - 5 bpm)
  const isVelo = p.cardioSport === 'velo';
  const fcMax = isVelo ? (220 - age - 5) : (220 - age);

  // Plages de zones de FC cibles
  const cardioZones = {
    z2: `${Math.round(fcMax * 0.6)} - ${Math.round(fcMax * 0.7)} bpm`,
    z3: `${Math.round(fcMax * 0.7)} - ${Math.round(fcMax * 0.8)} bpm`,
    z4: `${Math.round(fcMax * 0.8)} - ${Math.round(fcMax * 0.9)} bpm`,
    z5: `${Math.round(fcMax * 0.9)} - ${fcMax} bpm`
  };

  // Logique du protocole digestif holistique (V9)
  const digestiveProtocol: { condition: string; recommendation: string }[] = [];
  
  // Toujours proposer le reset métabolique au départ
  digestiveProtocol.push({
    condition: 'Reset Métabolique (14 jours)',
    recommendation: 'Élimination complète des allergènes alimentaires courants (produits laitiers, gluten, sucres raffinés, alcools) pour restaurer la sensibilité à l\'insuline et détoxifier le foie.'
  });

  const symptoms = p.digestiveSymptoms ?? [];
  if (symptoms.includes('ballonnements') || symptoms.includes('reflux')) {
    digestiveProtocol.push({
      condition: 'Hypochlorhydrie (Manque d\'acide gastrique)',
      recommendation: 'Prendre 1 c. à table de vinaigre de cidre de pomme dilué dans un peu d\'eau tiède 10-15 minutes avant les repas principaux pour stimuler la sécrétion d\'acide gastrique et réduire les fermentations.'
    });
  }
  if (symptoms.includes('fatigue-post-prandiale') || symptoms.includes('transit-irregulier')) {
    digestiveProtocol.push({
      condition: 'Hyperperméabilité Intestinale (Leaky Gut)',
      recommendation: 'Éviter les produits ultra-transformés et les sucres rapides. Privilégier la supplémentation en L-Glutamine au réveil, les bouillons d\'os et les apports naturels en collagène.'
    });
  }

  // Protocoles spécifiques endurance marathon (course / trail)
  const isEnduranceSport = p.cardioSport === 'course' || p.cardioSport === 'trail';
  if (isEnduranceSport) {
    digestiveProtocol.push({
      condition: '🏃 Nutrition Intra-Effort (Endurance)',
      recommendation: 'Viser 60 à 90g de glucides par heure de course au-delà de 75 min. Eau enrichie en électrolytes (sodium, magnésium) toutes les 20 min. Éviter les aliments riches en fibres et en graisses dans les 3 heures avant l\'effort pour prévenir l\'ischémie intestinale.'
    });
    digestiveProtocol.push({
      condition: '🏃 Recharge Glycogénique Pré-Compétition',
      recommendation: 'Les 3 jours avant la course : augmenter les glucides complexes (riz, patate douce, avoine) à 60-65% des apports caloriques totaux. Réduire les fibres pour vider le transit intestinal. Hydratation à 3 L+ par jour.'
    });
  }

  // Choisir le type de séances selon le sport cardio
  const sessions = isEnduranceSport
    ? buildEnduranceSessions(p, cardioZones)
    : buildSessions(p);

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
    sessions,
    totalWeeks:      12, // 12 semaines pour un cycle de préparation marathon
    startDate:       new Date().toISOString(),
    cardioZones,
    cardioSport:     p.cardioSport ?? 'general',
    digestiveProtocol,
  };
}

/* ─── Persistance Firestore ──────────────────────────────────────────────── */
export async function saveProgram(uid: string, program: GeneratedProgram) {
  const cleanProg = cleanObject(program);
  await setDoc(doc(db, 'users', uid), {
    program: cleanProg,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/* ─── Ajustement de programme (Phase 2 - Premium) ─────────────────────────── */
export async function adjustProgram(
  uid: string,
  currentProgram: GeneratedProgram,
  feedback: 'too-easy' | 'perfect' | 'too-hard',
  newFrequency?: number
) {
  // Ajuster le volume d'entraînement (reps)
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
    startDate: new Date().toISOString(), // Redémarre le début du programme pour le suivi de progression
  };

  await saveProgram(uid, adjustedProgram);
  
  // Mettre à jour les métadonnées de l'ajustement dans le document de l'utilisateur
  await setDoc(doc(db, 'users', uid), {
    lastProgramAdjustmentDate: new Date().toISOString(),
    adjustmentCount: ((currentProgram as any).adjustmentCount ?? 0) + 1,
  }, { merge: true });

  return adjustedProgram;
}

/* ─── Helpers d'affichage ────────────────────────────────────────────────── */
const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/** Jour / semaine courants depuis la date de début */
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

/** Séance du jour, sinon la prochaine dans la semaine */
export function getTodaySession(program: GeneratedProgram): { session: WorkoutSession; isToday: boolean } | null {
  if (!program.sessions.length) return null;
  const todayName = DAY_NAMES[new Date().getDay()];
  const todaySession = program.sessions.find(s => s.day === todayName);
  if (todaySession) return { session: todaySession, isToday: true };
  // Prochaine séance après aujourd'hui (ordre semaine), sinon première de la semaine suivante
  const todayIdx = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const upcoming = program.sessions.find(s => DAY_NAMES.indexOf(s.day ?? '') > todayIdx);
  return { session: upcoming ?? program.sessions[0], isToday: false };
}
