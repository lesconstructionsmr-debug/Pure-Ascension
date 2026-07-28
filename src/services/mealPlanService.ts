/**
 * mealPlanService — Plan alimentaire hebdomadaire personnalisé & éditable
 * Pure Ascension — coaching fitness / nutrition uniquement
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { DietaryRestriction, MainGoal, UserProfile } from '../data';
import type { ProgramMacros } from './programService';

export type MealSlot = 'petit-dej' | 'dejeuner' | 'collation' | 'diner';

export interface PlannedMeal {
  id: string;
  slot: MealSlot;
  name: string;
  kcal: number;
  proteins: number;
  carbs: number;
  fats: number;
  fibers?: number;
  prepTime: string;
  ingredients: { name: string; qty: string }[];
  steps: string[];
  note?: string;
  logged?: boolean;
}

export interface MealPlanDay {
  date: string; // YYYY-MM-DD
  dayLabel: string; // Lundi…
  meals: PlannedMeal[];
  targetKcal: number;
  targetMacros: ProgramMacros;
}

export interface WeeklyMealPlan {
  id: string;
  weekStart: string; // YYYY-MM-DD (lundi)
  calories: number;
  macros: ProgramMacros;
  goal: MainGoal;
  restrictions: DietaryRestriction[];
  days: MealPlanDay[];
  updatedAt?: string;
}

const STORAGE_KEY = '@pure_ascension_meal_plan_v1';

const SLOT_LABELS: Record<MealSlot, string> = {
  'petit-dej': 'Petit-déjeuner',
  dejeuner: 'Déjeuner',
  collation: 'Collation',
  diner: 'Dîner',
};

const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/** Répartition calorique par créneau (somme = 1) */
const SLOT_SHARES: Record<MealSlot, number> = {
  'petit-dej': 0.25,
  dejeuner: 0.35,
  collation: 0.10,
  diner: 0.30,
};

interface MealTemplate {
  id: string;
  slot: MealSlot;
  name: string;
  baseKcal: number;
  baseP: number;
  baseC: number;
  baseF: number;
  baseFibers?: number;
  prepTime: string;
  ingredients: { name: string; qty: string }[];
  steps: string[];
  note?: string;
  tags: DietaryRestriction[]; // tags = restrictions avec lesquelles ce repas EST compatible
  excludeIf?: DietaryRestriction[]; // si user a ces restrictions, exclure
  goalBias?: MainGoal[]; // favorisé pour ces objectifs
}

/**
 * Banque de repas réalistes — portions pour ~1 personne.
 * Tags = compatible avec ces régimes. excludeIf = incompatible.
 */
const MEAL_BANK: MealTemplate[] = [
  // ── Petit-déj ────────────────────────────────────────────────────────────
  {
    id: 'pd-skyr-avoine',
    slot: 'petit-dej',
    name: 'Skyr, flocons d\'avoine & myrtilles',
    baseKcal: 420, baseP: 32, baseC: 48, baseF: 10, baseFibers: 7,
    prepTime: '5 min',
    ingredients: [
      { name: 'Skyr nature', qty: '200g' },
      { name: 'Flocons d\'avoine', qty: '50g' },
      { name: 'Myrtilles', qty: '80g' },
      { name: 'Graines de chia', qty: '10g' },
    ],
    steps: ['Mélanger skyr et avoine.', 'Ajouter myrtilles et chia.', 'Servir frais.'],
    note: 'Rapide, riche en protéines — idéal avant ou après une séance matinale.',
    tags: ['sans-porc', 'halal', 'casher', 'végétarien'],
    excludeIf: ['végétalien', 'sans-lactose'],
    goalBias: ['muscle', 'force', 'tone'],
  },
  {
    id: 'pd-oeufs-avocat',
    slot: 'petit-dej',
    name: 'Œufs brouillés, avocat & pain de seigle',
    baseKcal: 480, baseP: 28, baseC: 32, baseF: 26, baseFibers: 8,
    prepTime: '10 min',
    ingredients: [
      { name: 'Œufs', qty: '3 unités' },
      { name: 'Avocat', qty: '½ unité' },
      { name: 'Pain de seigle', qty: '40g' },
      { name: 'Huile d\'olive', qty: '5ml' },
    ],
    steps: ['Faire revenir les œufs à feu doux.', 'Toaster le pain.', 'Ajouter avocat et un filet d\'huile.'],
    tags: ['sans-porc', 'halal', 'casher', 'végétarien', 'sans-lactose'],
    excludeIf: ['végétalien'],
    goalBias: ['force', 'tone'],
  },
  {
    id: 'pd-smoothie-proteine',
    slot: 'petit-dej',
    name: 'Smoothie protéiné banane & beurre d\'amande',
    baseKcal: 450, baseP: 35, baseC: 42, baseF: 14, baseFibers: 6,
    prepTime: '5 min',
    ingredients: [
      { name: 'Protéine whey / végétale', qty: '30g' },
      { name: 'Banane', qty: '1 unité' },
      { name: 'Lait d\'amande', qty: '250ml' },
      { name: 'Beurre d\'amande', qty: '15g' },
      { name: 'Flocons d\'avoine', qty: '20g' },
    ],
    steps: ['Mixer tous les ingrédients jusqu\'à texture lisse.', 'Boire immédiatement.'],
    tags: ['sans-porc', 'halal', 'casher', 'sans-lactose', 'végétarien', 'végétalien'],
    excludeIf: ['sans-noix'],
    goalBias: ['muscle', 'force'],
  },
  {
    id: 'pd-tofu-scramble',
    slot: 'petit-dej',
    name: 'Tofu brouillé, épinards & tomates',
    baseKcal: 380, baseP: 28, baseC: 18, baseF: 22, baseFibers: 6,
    prepTime: '12 min',
    ingredients: [
      { name: 'Tofu ferme', qty: '180g' },
      { name: 'Épinards', qty: '100g' },
      { name: 'Tomates cerises', qty: '80g' },
      { name: 'Huile d\'olive', qty: '10ml' },
      { name: 'Curcuma', qty: '1 pincée' },
    ],
    steps: ['Émietter le tofu à la poêle.', 'Ajouter épinards et tomates.', 'Assaisonner.'],
    tags: ['sans-porc', 'halal', 'casher', 'végétarien', 'végétalien', 'sans-lactose', 'sans-gluten'],
    goalBias: ['gras', 'tone'],
  },

  // ── Déjeuner ─────────────────────────────────────────────────────────────
  {
    id: 'dej-poulet-riz-brocoli',
    slot: 'dejeuner',
    name: 'Poulet grillé, riz basmati & brocolis',
    baseKcal: 580, baseP: 48, baseC: 55, baseF: 14, baseFibers: 8,
    prepTime: '25 min',
    ingredients: [
      { name: 'Blanc de poulet', qty: '160g' },
      { name: 'Riz basmati cuit', qty: '180g' },
      { name: 'Brocolis', qty: '150g' },
      { name: 'Huile d\'olive', qty: '8ml' },
    ],
    steps: ['Griller le poulet.', 'Cuire le riz.', 'Vapeur les brocolis.', 'Assembler avec un filet d\'huile.'],
    note: 'Assiette type Pure Ascension : protéines + glucides complexes + légumes.',
    tags: ['sans-porc', 'halal', 'casher', 'sans-lactose', 'sans-gluten', 'sans-noix'],
    excludeIf: ['végétarien', 'végétalien'],
    goalBias: ['muscle', 'force', 'tone'],
  },
  {
    id: 'dej-saumon-patate-asperges',
    slot: 'dejeuner',
    name: 'Saumon, patate douce & asperges',
    baseKcal: 560, baseP: 42, baseC: 40, baseF: 24, baseFibers: 7,
    prepTime: '25 min',
    ingredients: [
      { name: 'Filet de saumon', qty: '150g' },
      { name: 'Patate douce', qty: '180g' },
      { name: 'Asperges', qty: '120g' },
      { name: 'Citron', qty: '½ unité' },
      { name: 'Huile d\'olive', qty: '5ml' },
    ],
    steps: ['Rôtir patate douce et saumon.', 'Cuire asperges.', 'Finir au citron.'],
    tags: ['sans-porc', 'halal', 'casher', 'sans-lactose', 'sans-gluten', 'sans-noix'],
    excludeIf: ['végétarien', 'végétalien'],
    goalBias: ['gras', 'tone', 'force'],
  },
  {
    id: 'dej-bol-pois-chiches',
    slot: 'dejeuner',
    name: 'Bowl pois chiches, quinoa & légumes',
    baseKcal: 540, baseP: 24, baseC: 68, baseF: 18, baseFibers: 14,
    prepTime: '20 min',
    ingredients: [
      { name: 'Pois chiches', qty: '150g' },
      { name: 'Quinoa cuit', qty: '160g' },
      { name: 'Concombre', qty: '80g' },
      { name: 'Tomates cerises', qty: '100g' },
      { name: 'Huile d\'olive', qty: '10ml' },
      { name: 'Citron', qty: '½ unité' },
    ],
    steps: ['Assembler quinoa et pois chiches.', 'Ajouter légumes crus.', 'Assaisonner huile + citron.'],
    tags: ['sans-porc', 'halal', 'casher', 'végétarien', 'végétalien', 'sans-lactose', 'sans-gluten', 'sans-noix'],
    goalBias: ['gras', 'tone'],
  },
  {
    id: 'dej-dinde-patate',
    slot: 'dejeuner',
    name: 'Dinde, riz complet & haricots verts',
    baseKcal: 550, baseP: 46, baseC: 50, baseF: 12, baseFibers: 9,
    prepTime: '25 min',
    ingredients: [
      { name: 'Poitrine de dinde', qty: '160g' },
      { name: 'Riz complet cuit', qty: '170g' },
      { name: 'Haricots verts', qty: '150g' },
      { name: 'Huile d\'olive', qty: '8ml' },
    ],
    steps: ['Saisir la dinde.', 'Cuire riz et haricots.', 'Assembler.'],
    tags: ['sans-porc', 'halal', 'casher', 'sans-lactose', 'sans-gluten', 'sans-noix'],
    excludeIf: ['végétarien', 'végétalien'],
    goalBias: ['muscle', 'gras'],
  },
  {
    id: 'dej-thon-salade',
    slot: 'dejeuner',
    name: 'Salade thon, œuf & légumes croquants',
    baseKcal: 480, baseP: 44, baseC: 18, baseF: 26, baseFibers: 6,
    prepTime: '15 min',
    ingredients: [
      { name: 'Thon au naturel', qty: '120g' },
      { name: 'Œuf dur', qty: '1 unité' },
      { name: 'Salade verte', qty: '100g' },
      { name: 'Concombre', qty: '80g' },
      { name: 'Tomates', qty: '100g' },
      { name: 'Huile d\'olive', qty: '12ml' },
    ],
    steps: ['Assembler la salade.', 'Ajouter thon et œuf.', 'Assaisonner.'],
    tags: ['sans-porc', 'halal', 'casher', 'sans-lactose', 'sans-gluten', 'sans-noix'],
    excludeIf: ['végétarien', 'végétalien'],
    goalBias: ['gras', 'tone'],
  },

  // ── Collation ────────────────────────────────────────────────────────────
  {
    id: 'col-skyr-miel',
    slot: 'collation',
    name: 'Skyr & miel',
    baseKcal: 180, baseP: 20, baseC: 18, baseF: 2,
    prepTime: '2 min',
    ingredients: [
      { name: 'Skyr nature', qty: '150g' },
      { name: 'Miel', qty: '10g' },
    ],
    steps: ['Mélanger et déguster.'],
    tags: ['sans-porc', 'halal', 'casher', 'végétarien'],
    excludeIf: ['végétalien', 'sans-lactose'],
    goalBias: ['muscle', 'force'],
  },
  {
    id: 'col-pomme-amandes',
    slot: 'collation',
    name: 'Pomme & amandes',
    baseKcal: 220, baseP: 6, baseC: 24, baseF: 12, baseFibers: 5,
    prepTime: '1 min',
    ingredients: [
      { name: 'Pomme', qty: '1 unité' },
      { name: 'Amandes', qty: '20g' },
    ],
    steps: ['Couper la pomme, servir avec les amandes.'],
    tags: ['sans-porc', 'halal', 'casher', 'végétarien', 'végétalien', 'sans-lactose', 'sans-gluten'],
    excludeIf: ['sans-noix'],
    goalBias: ['tone', 'gras'],
  },
  {
    id: 'col-hummus-legumes',
    slot: 'collation',
    name: 'Houmous & crudités',
    baseKcal: 200, baseP: 8, baseC: 18, baseF: 10, baseFibers: 6,
    prepTime: '5 min',
    ingredients: [
      { name: 'Houmous', qty: '60g' },
      { name: 'Carottes', qty: '100g' },
      { name: 'Concombre', qty: '80g' },
    ],
    steps: ['Couper les légumes.', 'Servir avec le houmous.'],
    tags: ['sans-porc', 'halal', 'casher', 'végétarien', 'végétalien', 'sans-lactose', 'sans-gluten', 'sans-noix'],
    goalBias: ['gras', 'tone'],
  },
  {
    id: 'col-shake',
    slot: 'collation',
    name: 'Shake protéiné',
    baseKcal: 160, baseP: 28, baseC: 6, baseF: 2,
    prepTime: '2 min',
    ingredients: [
      { name: 'Protéine whey / végétale', qty: '30g' },
      { name: 'Eau ou lait d\'amande', qty: '250ml' },
    ],
    steps: ['Shaker 20 secondes.', 'Boire post-entraînement.'],
    tags: ['sans-porc', 'halal', 'casher', 'végétarien', 'végétalien', 'sans-lactose', 'sans-gluten'],
    goalBias: ['muscle', 'force'],
  },

  // ── Dîner ────────────────────────────────────────────────────────────────
  {
    id: 'din-cabillaud-legumes',
    slot: 'diner',
    name: 'Cabillaud, quinoa & courgettes',
    baseKcal: 480, baseP: 42, baseC: 38, baseF: 14, baseFibers: 7,
    prepTime: '25 min',
    ingredients: [
      { name: 'Filet de cabillaud', qty: '160g' },
      { name: 'Quinoa cuit', qty: '140g' },
      { name: 'Courgettes', qty: '150g' },
      { name: 'Huile d\'olive', qty: '8ml' },
    ],
    steps: ['Cuire le cabillaud au four.', 'Poêler les courgettes.', 'Servir avec quinoa.'],
    tags: ['sans-porc', 'halal', 'casher', 'sans-lactose', 'sans-gluten', 'sans-noix'],
    excludeIf: ['végétarien', 'végétalien'],
    goalBias: ['gras', 'tone'],
  },
  {
    id: 'din-boeuf-legumes',
    slot: 'diner',
    name: 'Bœuf sauté, riz & poivrons',
    baseKcal: 560, baseP: 44, baseC: 48, baseF: 18, baseFibers: 6,
    prepTime: '25 min',
    ingredients: [
      { name: 'Bœuf maigre', qty: '140g' },
      { name: 'Riz basmati cuit', qty: '160g' },
      { name: 'Poivrons', qty: '150g' },
      { name: 'Oignons', qty: '50g' },
      { name: 'Huile d\'olive', qty: '8ml' },
    ],
    steps: ['Sauter le bœuf.', 'Ajouter légumes.', 'Servir sur riz.'],
    tags: ['sans-porc', 'halal', 'casher', 'sans-lactose', 'sans-gluten', 'sans-noix'],
    excludeIf: ['végétarien', 'végétalien'],
    goalBias: ['muscle', 'force'],
  },
  {
    id: 'din-omelette-legumes',
    slot: 'diner',
    name: 'Omelette aux épinards & feta',
    baseKcal: 420, baseP: 30, baseC: 10, baseF: 28, baseFibers: 3,
    prepTime: '12 min',
    ingredients: [
      { name: 'Œufs', qty: '3 unités' },
      { name: 'Épinards', qty: '80g' },
      { name: 'Feta', qty: '40g' },
      { name: 'Huile d\'olive', qty: '5ml' },
    ],
    steps: ['Faire revenir les épinards.', 'Verser les œufs.', 'Ajouter feta en fin de cuisson.'],
    tags: ['sans-porc', 'halal', 'casher', 'végétarien', 'sans-gluten'],
    excludeIf: ['végétalien', 'sans-lactose'],
    goalBias: ['gras', 'tone'],
  },
  {
    id: 'din-lentilles-legumes',
    slot: 'diner',
    name: 'Lentilles, patate douce & légumes rôtis',
    baseKcal: 500, baseP: 24, baseC: 70, baseF: 12, baseFibers: 16,
    prepTime: '30 min',
    ingredients: [
      { name: 'Lentilles cuites', qty: '180g' },
      { name: 'Patate douce', qty: '150g' },
      { name: 'Courgettes', qty: '100g' },
      { name: 'Poivrons', qty: '80g' },
      { name: 'Huile d\'olive', qty: '10ml' },
    ],
    steps: ['Rôtir légumes et patate douce.', 'Réchauffer lentilles.', 'Assembler.'],
    tags: ['sans-porc', 'halal', 'casher', 'végétarien', 'végétalien', 'sans-lactose', 'sans-gluten', 'sans-noix'],
    goalBias: ['gras', 'tone'],
  },
  {
    id: 'din-crevettes-riz',
    slot: 'diner',
    name: 'Crevettes, riz & légumes wok',
    baseKcal: 520, baseP: 38, baseC: 52, baseF: 14, baseFibers: 5,
    prepTime: '20 min',
    ingredients: [
      { name: 'Crevettes', qty: '150g' },
      { name: 'Riz basmati cuit', qty: '160g' },
      { name: 'Courgettes', qty: '80g' },
      { name: 'Poivrons', qty: '80g' },
      { name: 'Huile d\'olive', qty: '8ml' },
      { name: 'Ail', qty: '1 gousse' },
    ],
    steps: ['Sauter crevettes et légumes.', 'Servir sur riz.'],
    tags: ['sans-porc', 'halal', 'casher', 'sans-lactose', 'sans-gluten', 'sans-noix'],
    excludeIf: ['végétarien', 'végétalien'],
    goalBias: ['muscle', 'tone'],
  },
];

export function getSlotLabel(slot: MealSlot): string {
  return SLOT_LABELS[slot];
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getMondayOfWeek(ref = new Date()): Date {
  const d = new Date(ref);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay(); // 0=dim
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function isCompatible(template: MealTemplate, restrictions: DietaryRestriction[]): boolean {
  if (template.excludeIf?.some((r) => restrictions.includes(r))) return false;
  // Si user a une restriction restrictive (végétarien/végétalien/sans-*), le repas doit être taggé compatible
  const hard = restrictions.filter((r) =>
    ['végétarien', 'végétalien', 'sans-lactose', 'sans-gluten', 'sans-noix', 'sans-porc', 'halal', 'casher'].includes(r)
  );
  if (hard.length === 0) return true;
  return hard.every((r) => template.tags.includes(r));
}

function scaleMeal(template: MealTemplate, targetKcal: number): PlannedMeal {
  const factor = Math.max(0.7, Math.min(1.45, targetKcal / Math.max(1, template.baseKcal)));
  const round = (n: number) => Math.max(0, Math.round(n));

  const scaleQty = (qty: string): string => {
    const m = qty.match(/^(\d+(?:[.,]\d+)?)\s*(g|ml|unités?|unité)?$/i);
    if (!m) return qty;
    const n = parseFloat(m[1].replace(',', '.')) * factor;
    const unit = m[2] || '';
    const rounded = unit.match(/unité/i) ? Math.max(1, Math.round(n)) : Math.round(n);
    return `${rounded}${unit ? (unit.startsWith('u') ? ` ${unit}` : unit) : ''}`;
  };

  return {
    id: `${template.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    slot: template.slot,
    name: template.name,
    kcal: round(template.baseKcal * factor),
    proteins: round(template.baseP * factor),
    carbs: round(template.baseC * factor),
    fats: round(template.baseF * factor),
    fibers: template.baseFibers != null ? round(template.baseFibers * factor) : undefined,
    prepTime: template.prepTime,
    ingredients: template.ingredients.map((i) => ({ name: i.name, qty: scaleQty(i.qty) })),
    steps: [...template.steps],
    note: template.note,
    logged: false,
  };
}

function pickTemplate(
  slot: MealSlot,
  restrictions: DietaryRestriction[],
  goal: MainGoal,
  usedIds: Set<string>,
  daySeed: number
): MealTemplate {
  const pool = MEAL_BANK.filter(
    (t) => t.slot === slot && isCompatible(t, restrictions)
  );
  const preferred = pool.filter((t) => !usedIds.has(t.id) && (!t.goalBias || t.goalBias.includes(goal)));
  const fresh = pool.filter((t) => !usedIds.has(t.id));
  const candidates = preferred.length
    ? preferred
    : fresh.length
      ? fresh
      : pool.length
        ? pool
        : MEAL_BANK.filter((t) => t.slot === slot);

  const idx = Math.abs(daySeed) % candidates.length;
  return candidates[idx];
}

function buildDay(
  date: Date,
  dayIndex: number,
  calories: number,
  macros: ProgramMacros,
  goal: MainGoal,
  restrictions: DietaryRestriction[]
): MealPlanDay {
  const used = new Set<string>();
  const slots: MealSlot[] = ['petit-dej', 'dejeuner', 'collation', 'diner'];
  const meals: PlannedMeal[] = [];

  for (const slot of slots) {
    const share = SLOT_SHARES[slot];
    const targetKcal = Math.round(calories * share);
    const template = pickTemplate(slot, restrictions, goal, used, dayIndex * 17 + slot.length * 3 + calories);
    used.add(template.id);
    meals.push(scaleMeal(template, targetKcal));
  }

  return {
    date: toDateKey(date),
    dayLabel: DAY_LABELS[dayIndex] || `Jour ${dayIndex + 1}`,
    meals,
    targetKcal: calories,
    targetMacros: macros,
  };
}

export function generateWeeklyMealPlan(params: {
  calories: number;
  macros: ProgramMacros;
  goal: MainGoal;
  restrictions?: DietaryRestriction[];
  weekStart?: Date;
}): WeeklyMealPlan {
  const calories = Math.max(1400, Math.min(4200, Math.round(params.calories || 2000)));
  const macros = params.macros;
  const goal = params.goal || 'tone';
  const restrictions = params.restrictions || [];
  const monday = params.weekStart ? new Date(params.weekStart) : getMondayOfWeek();
  monday.setHours(12, 0, 0, 0);

  const days: MealPlanDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(buildDay(d, i, calories, macros, goal, restrictions));
  }

  return {
    id: `mealplan_${toDateKey(monday)}`,
    weekStart: toDateKey(monday),
    calories,
    macros,
    goal,
    restrictions,
    days,
    updatedAt: new Date().toISOString(),
  };
}

export function generateFromProfile(
  profile: UserProfile,
  calories: number,
  macros: ProgramMacros
): WeeklyMealPlan {
  return generateWeeklyMealPlan({
    calories,
    macros,
    goal: profile.mainGoal,
    restrictions: profile.dietaryRestrictions || [],
  });
}

export function getTodayPlanDay(plan: WeeklyMealPlan | null, ref = new Date()): MealPlanDay | null {
  if (!plan) return null;
  const key = toDateKey(ref);
  return plan.days.find((d) => d.date === key) || null;
}

export function swapMealInPlan(
  plan: WeeklyMealPlan,
  dateKey: string,
  mealId: string
): WeeklyMealPlan {
  const dayIdx = plan.days.findIndex((d) => d.date === dateKey);
  if (dayIdx < 0) return plan;
  const day = plan.days[dayIdx];
  const mealIdx = day.meals.findIndex((m) => m.id === mealId);
  if (mealIdx < 0) return plan;

  const current = day.meals[mealIdx];
  const used = new Set(day.meals.map((m) => m.name));
  const pool = MEAL_BANK.filter(
    (t) =>
      t.slot === current.slot &&
      isCompatible(t, plan.restrictions) &&
      t.name !== current.name
  );
  const fallback = MEAL_BANK.filter(
    (t) => t.slot === current.slot && isCompatible(t, plan.restrictions)
  );
  const candidates = pool.length ? pool : fallback;
  if (!candidates.length) return plan;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const targetKcal = Math.round(plan.calories * SLOT_SHARES[current.slot]);
  const replacement = scaleMeal(pick, targetKcal);

  // éviter collision de nom dans la journée
  if (used.has(replacement.name) && candidates.length > 1) {
    const alt = candidates.find((c) => c.name !== replacement.name) || pick;
    Object.assign(replacement, scaleMeal(alt, targetKcal));
  }

  const newMeals = [...day.meals];
  newMeals[mealIdx] = replacement;
  const newDays = [...plan.days];
  newDays[dayIdx] = { ...day, meals: newMeals };

  return { ...plan, days: newDays, updatedAt: new Date().toISOString() };
}

export function regenerateDayInPlan(plan: WeeklyMealPlan, dateKey: string): WeeklyMealPlan {
  const dayIdx = plan.days.findIndex((d) => d.date === dateKey);
  if (dayIdx < 0) return plan;
  const date = new Date(dateKey + 'T12:00:00');
  const rebuilt = buildDay(
    date,
    dayIdx,
    plan.calories,
    plan.macros,
    plan.goal,
    plan.restrictions
  );
  const newDays = [...plan.days];
  newDays[dayIdx] = rebuilt;
  return { ...plan, days: newDays, updatedAt: new Date().toISOString() };
}

export function markMealLogged(
  plan: WeeklyMealPlan,
  dateKey: string,
  mealId: string,
  logged = true
): WeeklyMealPlan {
  const dayIdx = plan.days.findIndex((d) => d.date === dateKey);
  if (dayIdx < 0) return plan;
  const day = plan.days[dayIdx];
  const newMeals = day.meals.map((m) => (m.id === mealId ? { ...m, logged } : m));
  const newDays = [...plan.days];
  newDays[dayIdx] = { ...day, meals: newMeals };
  return { ...plan, days: newDays, updatedAt: new Date().toISOString() };
}

export function extractGroceryFromPlan(plan: WeeklyMealPlan): { name: string; quantity?: string }[] {
  const map = new Map<string, string>();
  for (const day of plan.days) {
    for (const meal of day.meals) {
      for (const ing of meal.ingredients) {
        const key = ing.name.toLowerCase();
        if (!map.has(key)) map.set(key, ing.qty);
        else map.set(key, `${map.get(key)} + ${ing.qty}`);
      }
    }
  }
  return Array.from(map.entries()).map(([name, quantity]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    quantity,
  }));
}

export async function saveMealPlanLocal(plan: WeeklyMealPlan): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}

export async function loadMealPlanLocal(): Promise<WeeklyMealPlan | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WeeklyMealPlan;
  } catch {
    return null;
  }
}

export async function saveMealPlan(uid: string | null, plan: WeeklyMealPlan): Promise<void> {
  await saveMealPlanLocal(plan);
  if (!uid) return;
  try {
    await setDoc(
      doc(db, 'users', uid, 'mealPlan', 'current'),
      { ...plan, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (err) {
    console.warn('saveMealPlan Firestore différé:', err);
  }
}

export async function loadMealPlan(uid: string | null): Promise<WeeklyMealPlan | null> {
  const local = await loadMealPlanLocal();
  if (!uid) return local;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'mealPlan', 'current'));
    if (snap.exists()) {
      const remote = snap.data() as WeeklyMealPlan;
      if (remote?.days?.length) {
        await saveMealPlanLocal(remote);
        return remote;
      }
    }
  } catch (err) {
    console.warn('loadMealPlan Firestore fallback local:', err);
  }
  return local;
}

export function plannedMealToFoodEntry(meal: PlannedMeal): {
  name: string;
  kcal: number;
  proteins: number;
  carbs: number;
  fats: number;
  fibers?: number;
} {
  return {
    name: `[Plan] ${meal.name}`,
    kcal: meal.kcal,
    proteins: meal.proteins,
    carbs: meal.carbs,
    fats: meal.fats,
    ...(meal.fibers && meal.fibers > 0 ? { fibers: meal.fibers } : {}),
  };
}
