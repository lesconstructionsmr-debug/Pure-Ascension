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
  const age = p.age ?? 28;
  // Constante Mifflin : homme +5, femme −161, non précisé → moyenne
  const sexConst = p.sex === 'homme' ? 5 : p.sex === 'femme' ? -161 : -78;
  const bmr = 10 * p.currentWeightKg + 6.25 * p.heightCm - 5 * age + sexConst;

  // Facteur d'activité : NEAT quotidien + volume d'entraînement prévu
  const base: Record<NonNullable<UserProfile['activityLevel']>, number> = {
    sedentaire: 1.2, leger: 1.375, actif: 1.55, 'tres-actif': 1.725,
  };
  const activityFactor = Math.min(
    1.9,
    base[p.activityLevel ?? 'leger'] + Math.max(0, p.frequency - 3) * 0.03,
  );

  const tdee = bmr * activityFactor;
  const adjustments: Record<UserProfile['mainGoal'], number> = {
    muscle: 220, gras: -420, tone: -180, force: 150,
  };
  return Math.round((tdee + adjustments[p.mainGoal]) / 10) * 10;
}

/* ─── Macros en grammes depuis les calories (ajustées au morphotype) ────── */
export function getMacros(
  calories: number,
  goal: UserProfile['mainGoal'],
  morphotype?: UserProfile['morphotype'],
): ProgramMacros {
  const splits: Record<UserProfile['mainGoal'], { p: number; c: number; f: number }> = {
    muscle: { p: 0.30, c: 0.45, f: 0.25 },
    gras:   { p: 0.35, c: 0.35, f: 0.30 },
    tone:   { p: 0.32, c: 0.40, f: 0.28 },
    force:  { p: 0.28, c: 0.48, f: 0.24 },
  };
  let { p, c, f } = splits[goal];
  // Ectomorphe : métabolise vite → plus de glucides. Endomorphe : sensibilité
  // insulinique plus faible → moins de glucides, plus de protéines/lipides.
  if (morphotype === 'ectomorphe')  { c += 0.05; f -= 0.03; p -= 0.02; }
  if (morphotype === 'endomorphe')  { c -= 0.07; p += 0.04; f += 0.03; }
  return {
    protein: Math.round((calories * p) / 4),
    carbs:   Math.round((calories * c) / 4),
    fat:     Math.round((calories * f) / 9),
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

/* ─── Génération des séances ─────────────────────────────────────────────── */
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
      notes: t.notes,
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
  return {
    id:              `prog-${Date.now()}`,
    name:            getProgramName(p),
    goal:            p.mainGoal,
    experience:      p.experience,
    frequency:       p.frequency,
    sessionDuration: p.sessionDuration,
    gymAccess:       p.gymAccess,
    calories,
    macros:          getMacros(calories, p.mainGoal, p.morphotype),
    trainingDays:    getTrainingDays(p.frequency),
    sessions:        buildSessions(p),
    totalWeeks:      8,
    startDate:       new Date().toISOString(),
  };
}

/* ─── Persistance Firestore ──────────────────────────────────────────────── */
export async function saveProgram(uid: string, program: GeneratedProgram) {
  await setDoc(doc(db, 'users', uid), {
    program,
    updatedAt: serverTimestamp(),
  }, { merge: true });
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
