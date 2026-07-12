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
}

export const mockUser: User = {
  id: 'u-001', firstName: 'Sophie', lastName: 'Moreau',
  programName: 'Équilibre', memberTier: 'Ascension',
  stats: { streakDays: 24, weightChange: -3.2, totalSessions: 47 },
};

export const mockProgram: Program = {
  id: 'prog-equilibre', name: 'Programme Équilibre', eyebrow: 'PROGRAMME ÉQUILIBRE',
  currentDay: 24, totalDays: 56, currentWeek: 4, totalWeeks: 8,
  completionPct: 62, streakDays: 4, tagline: 'tu avances bien.',
};

export const mockDailyProgress: DailyProgress = {
  nutrition: { completed: 3, total: 4, pct: 75 },
  training:  { completed: 1, total: 2, pct: 50 },
  hydration: { currentL: 1.8, targetL: 2.0, pct: 90 },
};

export const mockMealDay: MealDay = {
  date: new Date().toISOString(),
  targetCalories: 1850,
  consumedCalories: 1380,
  meals: [
    {
      id: 'm-1', name: 'Porridge aux myrtilles', type:'Petit-déjeuner', time: '07:30',
      calories: 420, protein:22, carbs:58, fat:12, macros: { proteins: 22, carbs: 58, fats: 12 },
      done: true, completed:true, order: 1, prepTime: '10 min',
      ingredients: [
        { name:'Flocons d\'avoine',     qty:'80 g'   },
        { name:'Lait végétal (avoine)', qty:'200 ml' },
        { name:'Banane',                qty:'1 moyenne' },
        { name:'Myrtilles fraîches',    qty:'80 g'   },
        { name:'Beurre d\'amande',      qty:'1 c. à s.' },
        { name:'Graines de chia',       qty:'10 g'   },
        { name:'Miel ou sirop d\'agave',qty:'1 c. à c.' },
        { name:'Cannelle',              qty:'1 pincée' },
      ],
      steps: [
        'Chauffer le lait végétal à feu moyen dans une casserole.',
        'Ajouter les flocons d\'avoine et remuer 5 min jusqu\'à consistance crémeuse.',
        'Transvaser dans un bol, déposer les myrtilles et la banane tranchée.',
        'Ajouter le beurre d\'amande et parsemer de graines de chia.',
        'Finir avec un filet de miel et une pincée de cannelle.',
      ],
      nutritionNote: 'Glucides complexes pour une énergie stable, fibres pour la satiété, et bonnes graisses via le beurre d\'amande. Idéal avant une matinée active.',
    },
    {
      id: 'm-2', name: 'Bowl de quinoa', type:'Déjeuner', time: '12:30',
      calories: 540, protein:38, carbs:52, fat:18, macros: { proteins: 38, carbs: 52, fats: 18 },
      done: true, completed:true, order: 2, prepTime: '20 min',
      ingredients: [
        { name:'Quinoa',              qty:'90 g (sec)' },
        { name:'Poulet grillé',       qty:'150 g'      },
        { name:'Avocat',              qty:'½'          },
        { name:'Concombre',           qty:'½'          },
        { name:'Tomates cerises',     qty:'80 g'       },
        { name:'Épinards frais',      qty:'40 g'       },
        { name:'Citron',              qty:'½'          },
        { name:'Huile d\'olive',      qty:'1 c. à s.'  },
        { name:'Sel, poivre, herbes', qty:'au goût'    },
      ],
      steps: [
        'Rincer le quinoa et le cuire dans 180 ml d\'eau salée pendant 12 min.',
        'Laisser reposer 5 min à couvert, puis égrener à la fourchette.',
        'Trancher le poulet grillé, couper l\'avocat et le concombre en dés.',
        'Disposer tous les ingrédients sur le quinoa dans un bol.',
        'Arroser de jus de citron et d\'huile d\'olive, assaisonner.',
      ],
      nutritionNote: 'Protéines complètes du quinoa et du poulet, graisses saines de l\'avocat. Repas équilibré qui soutient la récupération musculaire.',
    },
    {
      id: 'm-3', name: 'Yaourt & noix', type:'Collation', time: '16:00',
      calories: 210, protein:14, carbs:24, fat:6, macros: { proteins: 14, carbs: 24, fats: 6 },
      done: false, completed:false, order: 3, prepTime: '3 min',
      ingredients: [
        { name:'Yaourt grec nature 0%', qty:'200 g'    },
        { name:'Noix de cajou',         qty:'20 g'     },
        { name:'Amandes effilées',      qty:'10 g'     },
        { name:'Miel',                  qty:'1 c. à c.' },
        { name:'Cannelle',              qty:'1 pincée'  },
      ],
      steps: [
        'Verser le yaourt grec dans un bol.',
        'Répartir les noix de cajou et les amandes effilées.',
        'Ajouter un filet de miel et une pincée de cannelle.',
        'Mélanger légèrement et déguster immédiatement.',
      ],
      nutritionNote: 'Collation riche en protéines pour éviter le coup de barre de l\'après-midi. Les noix apportent des bonnes graisses et minéraux.',
    },
    {
      id: 'm-4', name: 'Saumon & légumes verts', type:'Dîner', time: '19:30',
      calories: 480, protein:32, carbs:44, fat:16, macros: { proteins: 32, carbs: 44, fats: 16 },
      done: false, completed:false, order: 4, prepTime: '25 min',
      ingredients: [
        { name:'Filet de saumon',      qty:'160 g'     },
        { name:'Brocolis',             qty:'200 g'     },
        { name:'Haricots verts',       qty:'150 g'     },
        { name:'Patate douce',         qty:'120 g'     },
        { name:'Ail',                  qty:'2 gousses'  },
        { name:'Huile d\'olive',       qty:'1 c. à s.'  },
        { name:'Citron',               qty:'½'          },
        { name:'Aneth frais',          qty:'quelques brins' },
        { name:'Sel, poivre',          qty:'au goût'    },
      ],
      steps: [
        'Préchauffer le four à 200°C. Couper la patate douce en cubes et enfourner 20 min.',
        'Cuire les brocolis et haricots verts à la vapeur 8 min.',
        'Poêler le saumon côté peau 4 min, retourner et cuire 3 min.',
        'Faire revenir l\'ail haché dans l\'huile d\'olive, ajouter les légumes.',
        'Dresser le saumon avec les légumes et la patate douce, citronner et décorer d\'aneth.',
      ],
      nutritionNote: 'Oméga-3 du saumon pour la récupération et l\'anti-inflammation. Patate douce pour recharger le glycogène. Dîner léger mais complet.',
    },
  ],
};

export const mockWorkouts: WorkoutSession[] = [
  {
    id: 'w-1', title: 'Bas du corps · Force', category: 'Force',
    duration: 35, exerciseCount: 6, completionPct: 50, isToday: true,
    badgeLabel: 'Séance du jour',
    exercises: [
      { id: 'e-1', name: 'Squat barre',             sets: 4, reps: '8–10',     done: true  },
      { id: 'e-2', name: 'Fentes marchées',          sets: 3, reps: '12/jambe', done: true  },
      { id: 'e-3', name: 'Soulevé de terre roumain', sets: 4, reps: 8,          done: false },
      { id: 'e-4', name: 'Leg press',                sets: 3, reps: 12,         done: false },
      { id: 'e-5', name: 'Mollets debout',           sets: 4, reps: 15,         done: false },
      { id: 'e-6', name: 'Gainage latéral',          sets: 3, reps: '40 s',     done: false },
    ],
  },
  {
    id: 'w-2', title: 'Haut du corps · Tirage', category: 'Endurance',
    duration: 40, exerciseCount: 5, completionPct: 0, isToday: false,
    exercises: [
      { id: 'e-7',  name: 'Tractions assistées', sets: 4, reps: 8,       done: false },
      { id: 'e-8',  name: 'Rowing haltères',      sets: 3, reps: 10,      done: false },
      { id: 'e-9',  name: 'Pull-down câble',      sets: 3, reps: 12,      done: false },
      { id: 'e-10', name: 'Face pull',            sets: 3, reps: 15,      done: false },
      { id: 'e-11', name: 'Curl biceps',          sets: 3, reps: '10–12', done: false },
    ],
  },
];

// Aliases used by ActiveWorkoutScreen
export const mockWorkoutSession = mockWorkouts[0];
export const mockExercises = mockWorkouts[0].exercises.map(e => ({
  ...e,
  sets: e.sets,
  notes: e.id === 'e-1' ? 'Descends jusqu\'à 90° de flexion. Dos droit, regard devant.' : undefined,
}));

export function formatNumber(n: number, decimals = 0): string {
  const parts = n.toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join(',');
}

export const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
