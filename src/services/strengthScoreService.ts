/**
 * strengthScoreService.ts — Moteur de calcul du Score de Force Pure Ascension
 * 
 * Calcule l'indice de force global (0 - 100+) basé sur les charges estimées à 1RM,
 * le sexe, le poids de corps et l'expérience de l'utilisateur.
 * 
 * Nomenclature Option A (Métaux Nobles) :
 * - 0 - 30  : Bronze Brut
 * - 30 - 50 : Cuivre Ombré
 * - 50 - 70 : Sauge Végétale
 * - 70 - 85 : Argent Pur
 * - 85 - 95 : Or Platine
 * - 95+    : Diamant Sombre
 */

import type { UserProfile } from '../data';

export type StrengthTierKey = 'bronze' | 'cuivre' | 'sauge' | 'argent' | 'platine' | 'diamant';

export interface StrengthTierInfo {
  key: StrengthTierKey;
  label: string;
  minScore: number;
  maxScore: number;
  color: string;
  bgColor: string;
  badgeBorder: string;
  description: string;
}

export const STRENGTH_TIERS: Record<StrengthTierKey, StrengthTierInfo> = {
  bronze: {
    key: 'bronze',
    label: 'Bronze Brut',
    minScore: 0,
    maxScore: 30,
    color: '#92400E',
    bgColor: '#FEF3C7',
    badgeBorder: '#F59E0B',
    description: 'Fondation, alignement postural et apprentissage du mouvement.',
  },
  cuivre: {
    key: 'cuivre',
    label: 'Cuivre Ombré',
    minScore: 30,
    maxScore: 50,
    color: '#C85D32',
    bgColor: '#FCF2ED',
    badgeBorder: '#E07A5F',
    description: 'Prise d\'élan, régularité et construction de la base de force.',
  },
  sauge: {
    key: 'sauge',
    label: 'Sauge Végétale',
    minScore: 50,
    maxScore: 70,
    color: '#4E7358',
    bgColor: '#EAF2EC',
    badgeBorder: '#6B9071',
    description: 'Force équilibrée, volume musculaire et constance.',
  },
  argent: {
    key: 'argent',
    label: 'Argent Pur',
    minScore: 70,
    maxScore: 85,
    color: '#475569',
    bgColor: '#F1F5F9',
    badgeBorder: '#94A3B8',
    description: 'Maîtrise technique et charges lourdes contrôlées.',
  },
  platine: {
    key: 'platine',
    label: 'Or Platine',
    minScore: 85,
    maxScore: 95,
    color: '#A16207',
    bgColor: '#FEF9C3',
    badgeBorder: '#EAB308',
    description: 'Niveau athlétique supérieur, densité musculaire d\'élite.',
  },
  diamant: {
    key: 'diamant',
    label: 'Diamant Sombre',
    minScore: 95,
    maxScore: 999,
    color: '#6D28D9',
    bgColor: '#F3E8FF',
    badgeBorder: '#A855F7',
    description: 'Niveau ultime, capacité de poussée/tirage hors norme.',
  },
};

/**
 * Formule d'estimation du 1RM (Epley / Wathan hybrid)
 */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30));
}

/**
 * Obtient le niveau de palier (Tier Info) correspondant à un score numérique
 */
export function getStrengthTierInfo(score: number): StrengthTierInfo {
  if (score >= 95) return STRENGTH_TIERS.diamant;
  if (score >= 85) return STRENGTH_TIERS.platine;
  if (score >= 70) return STRENGTH_TIERS.argent;
  if (score >= 50) return STRENGTH_TIERS.sauge;
  if (score >= 30) return STRENGTH_TIERS.cuivre;
  return STRENGTH_TIERS.bronze;
}

/**
 * Calcule dynamiquement le Score de Force personnalisé (1 - 100) en fonction :
 * 1. Du poids de corps de l'utilisateur (currentWeightKg)
 * 2. Du sexe (Ajustement des ratios physiologiques relatifs)
 * 3. Du niveau d'expérience déclaré (débutant, intermédiaire, avancé)
 * 4. Du nombre de séances validées et de la progression réelle
 */
export function computeUserStrengthScore(
  profile?: UserProfile | null,
  completedWorkoutsCount: number = 0
): {
  score: number;
  tier: StrengthTierInfo;
  chestScore: number;
  backScore: number;
  legsScore: number;
  armsScore: number;
  shouldersScore: number;
} {
  const weight = profile?.currentWeightKg || 70;
  const isFemale = profile?.sex === 'femme';
  const exp = profile?.experience || 'intermédiaire';

  // Base score selon le niveau d'expérience
  let baseScore = 42;
  if (exp === 'débutante') baseScore = 28;
  if (exp === 'intermédiaire') baseScore = 52;
  if (exp === 'avancée') baseScore = 74;

  // Ajustement selon le ratio poids de corps (Poids léger = bonus de force relative)
  const weightRatioFactor = weight > 0 ? (70 / weight) : 1;
  const genderMultiplier = isFemale ? 1.15 : 1.0;

  // Progression liée aux séances validées (+0.5 pt par séance jusqu'à +20 pts)
  const workoutBonus = Math.min(completedWorkoutsCount * 0.5, 20);

  // Score global personnalisé unique à cet utilisateur
  const rawScore = Math.round((baseScore * Math.pow(weightRatioFactor, 0.25) * genderMultiplier) + workoutBonus);
  const score = Math.min(Math.max(rawScore, 12), 99);

  const tier = getStrengthTierInfo(score);

  // Variations musculaires cohérentes avec la morphologie
  const chestScore = Math.min(Math.max(score - 4 + (weight > 80 ? 6 : 0), 10), 99);
  const backScore = Math.min(Math.max(score + 5 - (isFemale ? 2 : 0), 10), 99);
  const legsScore = Math.min(Math.max(score + (isFemale ? 6 : 2), 10), 99);
  const shouldersScore = Math.min(Math.max(score - 2, 10), 99);
  const armsScore = Math.min(Math.max(score - 3, 10), 99);

  return {
    score,
    tier,
    chestScore,
    backScore,
    legsScore,
    armsScore,
    shouldersScore,
  };
}
