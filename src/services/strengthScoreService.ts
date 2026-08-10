/**
 * strengthScoreService.ts — Moteur de calcul du Score de Force Pure Ascension
 * 
 * Calcule l'indice de force global (0 - 100+) basé sur les charges estimées à 1RM
 * et les 3 grands patrons de mouvement (Poussée, Tirage, Jambes).
 * Utilise la nomenclature Option A (Métaux Nobles) :
 * - 0 - 30  : Bronze Brut
 * - 30 - 50 : Cuivre Ombré
 * - 50 - 70 : Sauge Végétale
 * - 70 - 85 : Argent Pur
 * - 85 - 95 : Or Platine
 * - 95+    : Diamant Sombre
 */

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
 * Calcule le Score de Force global (0-100) pondéré par le poids de corps
 */
export function calculateStrengthScore(params: {
  bodyWeightKg: number;
  push1RM: number;
  pull1RM: number;
  legs1RM: number;
}): {
  globalScore: number;
  tier: StrengthTierInfo;
  pushScore: number;
  pullScore: number;
  legsScore: number;
} {
  const bw = Math.max(params.bodyWeightKg || 70, 45);

  const pushRatio = params.push1RM / bw;
  const pullRatio = params.pull1RM / bw;
  const legsRatio = params.legs1RM / bw;

  const pushScore = Math.min(Math.round(pushRatio * 45), 100);
  const pullScore = Math.min(Math.round(pullRatio * 45), 100);
  const legsScore = Math.min(Math.round(legsRatio * 35), 100);

  const globalScore = Math.round(pushScore * 0.3 + pullScore * 0.3 + legsScore * 0.4);
  const tier = getStrengthTierInfo(globalScore);

  return {
    globalScore,
    tier,
    pushScore,
    pullScore,
    legsScore,
  };
}
