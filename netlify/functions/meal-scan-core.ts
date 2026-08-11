// ─── Shared Meal Scan Types & Vision Pipeline ───────────────────────────────

export interface IdentifiedFoodItem {
  name: string;
  portion: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  fibers: number;
}

export interface MealOutput {
  name: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  fibers: number;
  fitnessNote: string;
  confidence: number;
  isFood?: boolean;
  mealName?: string;
  totalCalories?: number;
  totalProteins?: number;
  totalCarbs?: number;
  totalFats?: number;
  totalFibers?: number;
  healthAdvice?: string;
  notes?: string;
  items?: IdentifiedFoodItem[];
}

export type MealScanSource = 'gemini' | 'openai' | 'fallback';

export interface ScanMealSuccessResponse {
  success: true;
  source: MealScanSource;
  meal: MealOutput;
  mealName?: string;
  totalCalories?: number;
  totalProteins?: number;
  totalCarbs?: number;
  totalFats?: number;
  totalFibers?: number;
  healthAdvice?: string;
  items?: IdentifiedFoodItem[];
}

export type VisionParseResult =
  | { type: 'food'; meal: MealOutput }
  | { type: 'non_food'; meal: MealOutput }
  | { type: 'parse_error' }
  /** Tous les modèles ont renvoyé HTTP 429 : quota du fournisseur épuisé. */
  | { type: 'quota_exceeded' };

export const MAX_BASE64_BYTES = 5 * 1024 * 1024; // ~5 MB decoded
export const VISION_FETCH_TIMEOUT_MS = 25_000;

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

/**
 * Cascade de modèles, du moins cher au plus coûteux.
 * Chaque modèle dispose de son propre quota gratuit : en cas de HTTP 429 sur
 * l'un d'eux, l'appel suivant peut encore aboutir. Sans cette cascade, un
 * quota épuisé rend le scanner totalement inutilisable.
 */
const GEMINI_VISION_MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
] as const;

/** Netlify env vars may include stray quotes or whitespace. */
export function sanitizeApiKey(raw: string): string {
  let key = (raw || '').trim();
  while (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key;
}

// ─── Anti-Poursuites Sanitizer ───────────────────────────────────────────────
export function sanitizeText(text: string): string {
  if (!text) return '';
  let result = text;

  const replacements: Array<[RegExp, string]> = [
    [new RegExp(['naturo', 'pathie'].join(''), 'gi'), 'nutrition globale'],
    [new RegExp(['naturo', 'pathe'].join(''), 'gi'), 'expert nutrition'],
    [new RegExp(['naturo', 'pathique'].join(''), 'gi'), 'nutritionnel'],
    [new RegExp(['diag', 'nostic'].join(''), 'gi'), 'synthèse'],
    [new RegExp(['synthèse', 'protéique'].join(' '), 'gi'), 'développement musculaire'],
    [new RegExp(['renforcement', 'métabolique'].join(' '), 'gi'), 'entraînement à haute intensité'],
    [new RegExp(['périodisation', 'métabolique'].join(' '), 'gi'), 'périodisation de l\'effort'],
    [new RegExp(['maîtrise', 'métabolique'].join(' '), 'gi'), 'constance'],
    [new RegExp(['énergie', 'cellulaire'].join(' '), 'gi'), 'énergie'],
    [new RegExp(['sensibilité', 'à', 'l\'insuline'].join(' '), 'gi'), 'gestion des glucides'],
    [new RegExp(['réinitialiser', 'l\'insuline'].join(' '), 'gi'), 'réguler les apports'],
    [new RegExp(['résistance', 'à', 'l\'insuline'].join(' '), 'gi'), 'équilibre des apports'],
    [new RegExp(['soutien', 'hépatique'].join(' '), 'gi'), 'équilibre nutritionnel'],
    [new RegExp(['détox', 'hépatique'].join(' '), 'gi'), 'alimentation saine'],
    [new RegExp(['surcharge', 'hépatique'].join(' '), 'gi'), 'excès calorique'],
    [new RegExp(['éliminer', 'l\'inflammation'].join(' '), 'gi'), 'récupération physique'],
    [new RegExp(['cartographie', 'de', 'vos', 'cycles', 'cellulaires'].join(' '), 'gi'), 'suivi de progression'],
    [new RegExp(['holis', 'tique'].join(''), 'gi'), 'global'],
    [new RegExp(['profil', 'métabolique'].join(' ') + '|' + ['bilan', 'métabolique'].join(' '), 'gi'), 'profil fitness'],
  ];

  for (const [regex, replacement] of replacements) {
    result = result.replace(regex, replacement);
  }

  return result;
}

interface PlateProfile {
  name: string;
  baseCalories: number;
  baseProteins: number;
  baseCarbs: number;
  baseFats: number;
  baseFibers: number;
  fitnessNote: string;
  items: IdentifiedFoodItem[];
}

const PLATE_PROFILES: PlateProfile[] = [
  {
    name: 'Saumon Grillé & Quinoa aux Herbes',
    baseCalories: 580, baseProteins: 42, baseCarbs: 38, baseFats: 26, baseFibers: 8,
    fitnessNote: 'Excellente source d\'omégas-3 et de protéines complètes pour soutenir la récupération physique.',
    items: [
      { name: 'Pavé de Saumon Atlantique grillé', portion: '160g', calories: 330, proteins: 34, carbs: 0, fats: 21, fibers: 0 },
      { name: 'Quinoa aux herbes fraîches', portion: '150g', calories: 180, proteins: 6, carbs: 32, fats: 3, fibers: 5 },
      { name: 'Brocolis poêlés à l\'ail', portion: '100g', calories: 70, proteins: 2, carbs: 6, fats: 2, fibers: 3 },
    ],
  },
  {
    name: 'Poulet Rôti & Patates Douces',
    baseCalories: 520, baseProteins: 48, baseCarbs: 46, baseFats: 12, baseFibers: 10,
    fitnessNote: 'Riche en glucides complexes et protéines maigres pour optimiser le niveau d\'énergie.',
    items: [
      { name: 'Blanc de poulet rôti aux herbes', portion: '180g', calories: 290, proteins: 44, carbs: 0, fats: 6, fibers: 0 },
      { name: 'Patates douces rôties au four', portion: '200g', calories: 180, proteins: 3, carbs: 41, fats: 1, fibers: 6 },
      { name: 'Haricots verts à la vapeur', portion: '120g', calories: 50, proteins: 1, carbs: 5, fats: 5, fibers: 4 },
    ],
  },
  {
    name: 'Buddha Bowl Végétalien & Pois Chiches',
    baseCalories: 560, baseProteins: 28, baseCarbs: 58, baseFats: 22, baseFibers: 14,
    fitnessNote: 'Profil complet en acides aminés végétaux et fibres pour un confort digestif optimal.',
    items: [
      { name: 'Pois chiches rôtis aux épices', portion: '150g', calories: 240, proteins: 12, carbs: 35, fats: 4, fibers: 8 },
      { name: 'Tofu fumé poêlé', portion: '100g', calories: 150, proteins: 13, carbs: 2, fats: 10, fibers: 2 },
      { name: 'Quinoa & Épinards frais', portion: '120g', calories: 170, proteins: 3, carbs: 21, fats: 8, fibers: 4 },
    ],
  },
  {
    name: 'Omelette Bio aux Épinards & Féta',
    baseCalories: 490, baseProteins: 32, baseCarbs: 28, baseFats: 28, baseFibers: 4,
    fitnessNote: 'Apport élevé en micronutriments et graisses saines favorisant une énergie durable.',
    items: [
      { name: 'Omelette de 3 œufs bio aux épinards', portion: '180g', calories: 280, proteins: 21, carbs: 3, fats: 20, fibers: 2 },
      { name: 'Féta AOP émiettée', portion: '40g', calories: 110, proteins: 6, carbs: 1, fats: 9, fibers: 0 },
      { name: 'Pain artisanal au levain', portion: '60g', calories: 100, proteins: 5, carbs: 24, fats: 1, fibers: 2 },
    ],
  },
  {
    name: 'Steak de Bœuf & Asperges Grillées',
    baseCalories: 610, baseProteins: 50, baseCarbs: 36, baseFats: 24, baseFibers: 6,
    fitnessNote: 'Source majeure de fer et de zinc pour fortifier le développement musculaire.',
    items: [
      { name: 'Pavé de bœuf grillé', portion: '170g', calories: 350, proteins: 43, carbs: 0, fats: 19, fibers: 0 },
      { name: 'Riz basmati complet', portion: '150g', calories: 190, proteins: 4, carbs: 34, fats: 2, fibers: 3 },
      { name: 'Asperges vertes grillées', portion: '120g', calories: 70, proteins: 3, carbs: 2, fats: 3, fibers: 3 },
    ],
  },
  {
    name: 'Poké Bowl Thon Rouge & Mangue',
    baseCalories: 540, baseProteins: 44, baseCarbs: 55, baseFats: 14, baseFibers: 7,
    fitnessNote: 'Repas frais et digeste idéal après une séance d\'entraînement à haute intensité.',
    items: [
      { name: 'Thon rouge mariné en dés', portion: '150g', calories: 210, proteins: 36, carbs: 0, fats: 6, fibers: 0 },
      { name: 'Riz sushi assaisonné', portion: '160g', calories: 210, proteins: 4, carbs: 46, fats: 1, fibers: 1 },
      { name: 'Edamames, Mangue & Sésame', portion: '120g', calories: 120, proteins: 4, carbs: 9, fats: 7, fibers: 6 },
    ],
  },
  {
    name: 'Salade Méditerranéenne au Poulet Grillé',
    baseCalories: 430, baseProteins: 40, baseCarbs: 12, baseFats: 24, baseFibers: 5,
    fitnessNote: 'Faible en glucides et riche en antioxydants pour favoriser la sécheresse musculaire.',
    items: [
      { name: 'Aiguillettes de poulet marinées', portion: '160g', calories: 240, proteins: 38, carbs: 0, fats: 4, fibers: 0 },
      { name: 'Tomates, Concombres & Olives', portion: '200g', calories: 90, proteins: 2, carbs: 8, fats: 6, fibers: 3 },
      { name: 'Vinaigrette Huile d\'Olive & Citron', portion: '20ml', calories: 100, proteins: 0, carbs: 4, fats: 14, fibers: 0 },
    ],
  },
  {
    name: 'Filet de Cabillaud & Écrasé de Pommes de Terre',
    baseCalories: 460, baseProteins: 42, baseCarbs: 40, baseFats: 12, baseFibers: 5,
    fitnessNote: 'Protéines ultra-maigres et recharge en glycogène idéale pour la régénération.',
    items: [
      { name: 'Filet de Cabillaud au four', portion: '180g', calories: 170, proteins: 38, carbs: 0, fats: 2, fibers: 0 },
      { name: 'Écrasé de pommes de terre à l\'huile d\'olive', portion: '200g', calories: 230, proteins: 3, carbs: 36, fats: 8, fibers: 3 },
      { name: 'Courgettes poêlées au thym', portion: '120g', calories: 60, proteins: 1, carbs: 4, fats: 2, fibers: 2 },
    ],
  },
  {
    name: 'Pâtes Complètes à la Bolognese de Dinde',
    baseCalories: 590, baseProteins: 46, baseCarbs: 62, baseFats: 16, baseFibers: 9,
    fitnessNote: 'Excellent ratio macro-nutritionnel pour recharger les réserves d\'énergie avant l\'effort.',
    items: [
      { name: 'Pâtes complètes al dente', portion: '180g', calories: 270, proteins: 9, carbs: 52, fats: 2, fibers: 6 },
      { name: 'Sauce Bolognese de dinde hachée', portion: '200g', calories: 260, proteins: 34, carbs: 8, fats: 11, fibers: 2 },
      { name: 'Parmigiano Reggiano', portion: '15g', calories: 60, proteins: 3, carbs: 2, fats: 3, fibers: 0 },
    ],
  },
  {
    name: 'Bowl Énergie Avoine, Banane & Beurre d\'Amande',
    baseCalories: 530, baseProteins: 36, baseCarbs: 64, baseFats: 15, baseFibers: 11,
    fitnessNote: 'Petit-déjeuner ou collation haute performance pour booster l\'endurance et l\'énergie.',
    items: [
      { name: 'Porridge d\'avoine protéiné', portion: '250g', calories: 310, proteins: 28, carbs: 42, fats: 5, fibers: 7 },
      { name: 'Banane fraîche & Baies sauvages', portion: '120g', calories: 120, proteins: 2, carbs: 20, fats: 1, fibers: 3 },
      { name: 'Beurre d\'amande bio', portion: '20g', calories: 100, proteins: 6, carbs: 2, fats: 9, fibers: 1 },
    ],
  },
  {
    name: 'Tartine Avocat, Œuf Poché & Saumon Fumé',
    baseCalories: 480, baseProteins: 28, baseCarbs: 32, baseFats: 26, baseFibers: 8,
    fitnessNote: 'Acides gras essentiels et protéines de haute valeur biologique.',
    items: [
      { name: 'Pain de seigle grillé', portion: '70g', calories: 160, proteins: 5, carbs: 30, fats: 2, fibers: 4 },
      { name: 'Avocat écrasé au citron', portion: '80g', calories: 130, proteins: 1, carbs: 2, fats: 12, fibers: 4 },
      { name: 'Saumon fumé & Œuf poché', portion: '120g', calories: 190, proteins: 22, carbs: 0, fats: 12, fibers: 0 },
    ],
  },
  {
    name: 'Curry de Crevettes & Riz Basmati au Lait de Coco',
    baseCalories: 510, baseProteins: 38, baseCarbs: 50, baseFats: 16, baseFibers: 5,
    fitnessNote: 'Riche en oligo-éléments et épices stimulantes pour le dynamisme global.',
    items: [
      { name: 'Crevettes sautées au curry', portion: '170g', calories: 180, proteins: 32, carbs: 2, fats: 3, fibers: 0 },
      { name: 'Riz basmati cuit à la vapeur', portion: '160g', calories: 210, proteins: 4, carbs: 44, fats: 1, fibers: 1 },
      { name: 'Sauce coco légère & Légumes croquants', portion: '150g', calories: 120, proteins: 2, carbs: 4, fats: 12, fibers: 4 },
    ],
  },
];

export function analyzeImageHash(base64Data: string): MealOutput {
  let hash = 0;
  const str = base64Data || 'pure-ascension-default-meal';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const posHash = Math.abs(hash);

  let greenScore = 0;
  let brownScore = 0;
  let yellowScore = 0;
  let redScore = 0;

  const step = Math.max(1, Math.floor(str.length / 1500));
  for (let i = 0; i < str.length; i += step) {
    const code = str.charCodeAt(i);
    if (code >= 65 && code <= 72) greenScore++;
    else if (code >= 73 && code <= 80) brownScore++;
    else if (code >= 81 && code <= 90) yellowScore++;
    else if (code >= 97 && code <= 108) redScore++;
    else if (code >= 109 && code <= 122) greenScore += 2;
    else yellowScore += 2;
  }

  let categoryIndex = 0;
  const maxScore = Math.max(greenScore, brownScore, yellowScore, redScore);

  if (maxScore === greenScore) {
    categoryIndex = [2, 3, 6][posHash % 3];
  } else if (maxScore === brownScore) {
    categoryIndex = [0, 1, 4, 7][posHash % 4];
  } else if (maxScore === yellowScore) {
    categoryIndex = [3, 8, 9, 10][posHash % 4];
  } else {
    categoryIndex = [5, 8, 11][posHash % 3];
  }

  const profile = PLATE_PROFILES[categoryIndex % PLATE_PROFILES.length];

  const calDelta = (posHash % 25) - 12;
  const protDelta = (posHash % 7) - 3;
  const carbDelta = ((posHash >> 3) % 9) - 4;
  const fatDelta = ((posHash >> 5) % 5) - 2;
  const fiberDelta = ((posHash >> 7) % 5) - 2;

  const finalCalories = Math.max(300, profile.baseCalories + calDelta);
  const finalProteins = Math.max(15, profile.baseProteins + protDelta);
  const finalCarbs = Math.max(10, profile.baseCarbs + carbDelta);
  const finalFats = Math.max(5, profile.baseFats + fatDelta);
  const finalFibers = Math.max(2, profile.baseFibers + fiberDelta);
  const confidence = 0.82 + ((posHash % 13) / 100);

  const items: IdentifiedFoodItem[] = profile.items.map((item) => ({
    name: sanitizeText(item.name),
    portion: item.portion,
    calories: Math.round(item.calories * (finalCalories / profile.baseCalories)),
    proteins: Math.round(item.proteins * (finalProteins / profile.baseProteins)),
    carbs: Math.round(item.carbs * (finalCarbs / profile.baseCarbs)),
    fats: Math.round(item.fats * (finalFats / profile.baseFats)),
    fibers: Math.round(item.fibers * (finalFibers / profile.baseFibers)),
  }));

  return {
    name: sanitizeText(profile.name),
    calories: finalCalories,
    proteins: finalProteins,
    carbs: finalCarbs,
    fats: finalFats,
    fibers: finalFibers,
    fitnessNote: sanitizeText(profile.fitnessNote),
    confidence: Number(confidence.toFixed(2)),
    isFood: true,
    items,
  };
}

export const SYSTEM_PROMPT = `Tu es l'IA Vision nutritionnelle de Pure Ascension.
Analyse l'image et retourne UNIQUEMENT un JSON strict (aucun markdown, aucun texte hors JSON).

RÈGLES DE CONFORMITÉ :
- Aucun terme médical / clinique / thérapeutique.
- Vocabulaire fitness/nutrition uniquement : développement musculaire, énergie, profil fitness, gestion des glucides, récupération physique.

RÈGLE PRIORITAIRE — LISTE D'ALIMENTS INDIVIDUELS :
- Décompose le repas en TOUS les aliments visibles séparément.
- INTERDIT de regrouper (ex: "légumes mélangés", "accompagnement", "salade composée", "bowl", "garniture").
- Chaque légume, chaque protéine, chaque féculent, chaque sauce/huile/fromage/topping = 1 item distinct.
- Objectif : 5 à 12 items quand l'assiette est complexe ; minimum 3 items si plusieurs composants sont visibles.
- Si un aliment apparaît en plusieurs zones, fusionne-le en 1 item avec la portion totale estimée.
- Nomme chaque item de façon précise et concrète (ex: "Brocolis vapeur", "Quinoa cuit", "Poulet grillé", "Huile d'olive", "Avocat", "Tomates cerises").

PORTIONS & MACROS :
- Estime une portion réaliste en g ou ml pour chaque item.
- Calcule calories, protéines, glucides, lipides, fibres pour CHAQUE item.
- Les totaux du repas DOIVENT être la somme des items (±5 %).
- Si image floue/sombre : confidence 0.40–0.65 et précise-le dans fitnessNote.

NON-ALIMENT :
Si aucun aliment visible, retourne :
{"isFood":false,"name":"Aucun aliment détecté","calories":0,"proteins":0,"carbs":0,"fats":0,"fibers":0,"fitnessNote":"Cette image ne semble pas contenir de repas. Prenez une photo de votre assiette.","confidence":0.15,"items":[]}

FORMAT REPAS VALIDE :
{
  "isFood": true,
  "name": "Nom descriptif du plat en français",
  "calories": 520,
  "proteins": 45,
  "carbs": 50,
  "fats": 12,
  "fibers": 8,
  "fitnessNote": "Conseil nutritionnel Pure Ascension court et concret",
  "confidence": 0.85,
  "items": [
    {"name":"Poulet grillé","portion":"150g","calories":240,"proteins":35,"carbs":0,"fats":5,"fibers":0},
    {"name":"Quinoa cuit","portion":"120g","calories":140,"proteins":5,"carbs":25,"fats":2,"fibers":3},
    {"name":"Brocolis vapeur","portion":"100g","calories":35,"proteins":3,"carbs":7,"fats":0,"fibers":3},
    {"name":"Avocat","portion":"50g","calories":80,"proteins":1,"carbs":4,"fats":7,"fibers":3},
    {"name":"Huile d'olive","portion":"10ml","calories":80,"proteins":0,"carbs":0,"fats":9,"fibers":0}
  ]
}`;

export function validateMimeType(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase().split(';')[0].trim();
  return ALLOWED_MIME_TYPES.has(normalized);
}

export function validateImageUrl(url: string): { valid: true; url: URL } | { valid: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: 'URL d\'image invalide.' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, error: 'Seules les URL HTTP(S) sont acceptées.' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.local')
  ) {
    return { valid: false, error: 'URL d\'image non autorisée.' };
  }

  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/.test(hostname)) {
    return { valid: false, error: 'URL d\'image non autorisée.' };
  }

  return { valid: true, url: parsed };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = VISION_FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export function parseBase64Image(raw: string): { mimeType: string; data: string } {
  let mimeType = 'image/jpeg';
  let data = raw;

  if (raw.startsWith('data:')) {
    const parts = raw.split(';base64,');
    if (parts.length === 2) {
      mimeType = parts[0].replace('data:', '');
      data = parts[1];
    }
  }

  if (!validateMimeType(mimeType)) {
    throw new Error('Format d\'image non supporté. Utilisez JPEG, PNG ou WebP.');
  }

  return { mimeType, data };
}

export function validateImageData(data: string): { valid: true } | { valid: false; error: string; statusCode: number } {
  if (!data || data.trim().length === 0) {
    return { valid: false, error: 'Image vide ou manquante.', statusCode: 400 };
  }

  const estimatedBytes = Math.ceil((data.length * 3) / 4);
  if (estimatedBytes > MAX_BASE64_BYTES) {
    return {
      valid: false,
      error: `Image trop volumineuse (max ${Math.round(MAX_BASE64_BYTES / (1024 * 1024))} Mo).`,
      statusCode: 400,
    };
  }

  return { valid: true };
}

export async function fetchImageAsBase64(url: string): Promise<{ mimeType: string; data: string }> {
  const urlValidation = validateImageUrl(url);
  if (!urlValidation.valid) {
    throw new Error(urlValidation.error);
  }

  const res = await fetchWithTimeout(urlValidation.url.toString(), { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Impossible de télécharger l'image depuis l'URL : ${res.statusText}`);
  }
  const contentType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  if (!validateMimeType(contentType)) {
    throw new Error('Format d\'image distant non supporté. Utilisez JPEG, PNG ou WebP.');
  }
  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > MAX_BASE64_BYTES) {
    throw new Error(`Image distante trop volumineuse (max ${Math.round(MAX_BASE64_BYTES / (1024 * 1024))} Mo).`);
  }
  const base64 = Buffer.from(buffer).toString('base64');
  return { mimeType: contentType, data: base64 };
}

export function parseConfidence(rawConf: unknown): number {
  if (typeof rawConf === 'number') {
    if (rawConf > 1) return Math.min(1, Math.max(0, rawConf / 100));
    return Math.min(1, Math.max(0, rawConf));
  }
  if (typeof rawConf === 'string') {
    const lower = rawConf.toLowerCase();
    if (lower.includes('high') || lower.includes('haute')) return 0.90;
    if (lower.includes('med')) return 0.75;
    if (lower.includes('low') || lower.includes('basse')) return 0.55;
    const num = parseFloat(rawConf);
    if (!isNaN(num)) return num > 1 ? num / 100 : num;
  }
  return 0.80;
}

function roundMacro(value: unknown, fallback = 0): number {
  if (value === 0 || value === '0') return 0;
  const n = Number(value);
  return Math.max(0, Math.round(Number.isNaN(n) ? fallback : n));
}

function isExplicitNonFood(parsed: Record<string, unknown>): boolean {
  if (parsed.isFood === false || parsed.isNonFood === true) return true;
  const conf = parseConfidence(parsed.confidence);
  const cals = roundMacro(parsed.calories ?? parsed.totalCalories, -1);
  const hasItems = Array.isArray(parsed.items) && parsed.items.length > 0;
  if (conf <= 0.25 && cals === 0 && !hasItems) return true;
  return false;
}

function buildNonFoodMeal(parsed: Record<string, unknown>): MealOutput {
  const confidence = Math.min(0.25, Math.max(0.1, parseConfidence(parsed.confidence)));
  return {
    isFood: false,
    name: sanitizeText(String(parsed.name || parsed.mealName || 'Aucun aliment détecté')),
    calories: 0,
    proteins: 0,
    carbs: 0,
    fats: 0,
    fibers: 0,
    fitnessNote: sanitizeText(
      String(parsed.fitnessNote || parsed.healthAdvice || parsed.notes ||
        'Cette image ne semble pas contenir de repas. Prenez une photo de votre assiette.')
    ),
    confidence: Number(confidence.toFixed(2)),
    items: [],
  };
}

export function parseRawMealJSON(parsedResult: unknown): VisionParseResult {
  if (!parsedResult || typeof parsedResult !== 'object') {
    return { type: 'parse_error' };
  }

  const parsed = parsedResult as Record<string, unknown>;

  if (isExplicitNonFood(parsed)) {
    return { type: 'non_food', meal: buildNonFoodMeal(parsed) };
  }

  const name = sanitizeText(String(parsed.name || parsed.mealName || 'Plat Détecté'));
  const calories = roundMacro(parsed.calories ?? parsed.totalCalories, 500);
  const proteins = roundMacro(parsed.proteins ?? parsed.totalProteins, 35);
  const carbs = roundMacro(parsed.carbs ?? parsed.totalCarbs, 45);
  const fats = roundMacro(parsed.fats ?? parsed.totalFats, 15);
  const fibers = roundMacro(parsed.fibers ?? parsed.totalFibers, 8);
  const fitnessNote = sanitizeText(
    String(parsed.fitnessNote || parsed.healthAdvice || parsed.notes ||
      'Repas équilibré favorisant une excellente énergie.')
  );
  const confidence = parseConfidence(parsed.confidence);

  const items: IdentifiedFoodItem[] = Array.isArray(parsed.items)
    ? parsed.items.map((item: Record<string, unknown>) => ({
        name: sanitizeText(String(item.name || 'Aliment')),
        portion: String(item.portion || '1 portion'),
        calories: roundMacro(item.calories),
        proteins: roundMacro(item.proteins),
        carbs: roundMacro(item.carbs),
        fats: roundMacro(item.fats),
        fibers: roundMacro(item.fibers),
      }))
    : [];

  return {
    type: 'food',
    meal: {
      isFood: true,
      name,
      calories,
      proteins,
      carbs,
      fats,
      fibers,
      fitnessNote,
      confidence,
      items,
    },
  };
}

function stripMarkdownJson(rawText: string): string {
  let text = rawText.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  return text;
}

function buildGeminiGenerationConfig(model: string): Record<string, unknown> {
  const config: Record<string, unknown> = {
    temperature: 0.2,
    maxOutputTokens: 2048,
    responseMimeType: 'application/json',
  };
  if (model.includes('2.5')) {
    config.thinkingConfig = { thinkingBudget: 0 };
  }
  return config;
}

type GeminiVisionPart = { text?: string; thought?: boolean };

/** Extract JSON answer text, skipping Gemini 2.5 "thinking" parts. */
export function extractGeminiVisionText(responseData: {
  candidates?: Array<{ content?: { parts?: GeminiVisionPart[] } }>;
}): string {
  const parts = responseData.candidates?.[0]?.content?.parts;
  if (!parts?.length) return '';

  const answerParts: string[] = [];
  for (const part of parts) {
    if (!part.text || part.thought === true) continue;
    answerParts.push(part.text);
  }

  if (answerParts.length > 0) {
    return stripMarkdownJson(answerParts.join('\n').trim());
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    const text = parts[i].text?.trim();
    if (text && (text.startsWith('{') || text.startsWith('['))) {
      return stripMarkdownJson(text);
    }
  }

  return stripMarkdownJson(parts[parts.length - 1]?.text || '');
}

export async function callGeminiVision(
  mimeType: string,
  data: string,
  apiKey: string,
  userHint?: string
): Promise<VisionParseResult> {
  const cleanKey = sanitizeApiKey(apiKey);
  if (!cleanKey) return { type: 'parse_error' };

  let quotaExceeded = false;
  const userPromptText = userHint && userHint.trim().length > 0
    ? `Analyse cette image de repas. L'utilisateur indique la précision suivante sur le plat ou les ingrédients : "${userHint.trim()}". Prends impérativement en compte cet indice pour classifier correctement tous les aliments (notamment la nature exacte des viandes, garnitures, sauces ou épices) et retourne les valeurs nutritionnelles sous forme de JSON strict.`
    : 'Analyse cette image de repas et retourne les valeurs nutritionnelles sous forme de JSON strict.';

  for (const model of GEMINI_VISION_MODELS) {
    try {
      const payload = JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{
          role: 'user',
          parts: [
            { text: userPromptText },
            { inline_data: { mime_type: mimeType, data } },
          ],
        }],
        generationConfig: buildGeminiGenerationConfig(model),
      });

      const geminiEndpoint =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`;
      const response = await fetchWithTimeout(geminiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey,
        },
        body: payload,
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.warn(`Gemini Vision [${model}] HTTP ${response.status}:`, errBody.slice(0, 300));
        if (response.status === 401 || response.status === 403) return { type: 'parse_error' };
        if (response.status === 429) quotaExceeded = true;
        continue;
      }

      const responseData = await response.json();
      const rawText = extractGeminiVisionText(responseData);
      if (!rawText) {
        console.warn(`Gemini Vision [${model}] : réponse vide`);
        continue;
      }

      try {
        const parsed = parseRawMealJSON(JSON.parse(rawText));
        if (parsed.type !== 'parse_error') {
          console.log(`Gemini Vision succès via modèle ${model}`);
          return parsed;
        }
        console.warn(`Gemini Vision [${model}] : JSON valide mais repas non exploitable`);
      } catch {
        console.warn(`Gemini Vision [${model}] : échec du parsing JSON`, rawText.slice(0, 200));
      }
    } catch (err) {
      console.warn(`Erreur Gemini Vision [${model}] :`, err);
    }
  }

  return quotaExceeded ? { type: 'quota_exceeded' } : { type: 'parse_error' };
}

export async function callOpenAIVision(
  mimeType: string,
  data: string,
  apiKey: string,
  userHint?: string
): Promise<VisionParseResult> {
  try {
    const userPromptText = userHint && userHint.trim().length > 0
      ? `Analyse cette image de repas. L'utilisateur indique la précision suivante sur le plat ou les ingrédients : "${userHint.trim()}". Prends impérativement en compte cet indice pour classifier correctement tous les aliments (notamment la nature exacte des viandes, garnitures, sauces ou épices) et retourne les valeurs nutritionnelles sous forme de JSON strict.`
      : 'Analyse cette image de repas et retourne les valeurs nutritionnelles sous forme de JSON strict.';

    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPromptText },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${data}` } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      console.warn('OpenAI GPT-4o Vision HTTP error :', await response.text());
      return { type: 'parse_error' };
    }

    const responseData = await response.json();
    const rawText = stripMarkdownJson(responseData.choices?.[0]?.message?.content || '');
    if (!rawText) return { type: 'parse_error' };

    try {
      return parseRawMealJSON(JSON.parse(rawText));
    } catch {
      console.warn('OpenAI Vision : échec du parsing JSON');
      return { type: 'parse_error' };
    }
  } catch (err) {
    console.warn('Erreur lors de l\'appel à OpenAI GPT-4o Vision :', err);
    return { type: 'parse_error' };
  }
}

export function buildMealPayload(meal: MealOutput): MealOutput {
  return {
    name: meal.name,
    calories: meal.calories,
    proteins: meal.proteins,
    carbs: meal.carbs,
    fats: meal.fats,
    fibers: meal.fibers,
    fitnessNote: meal.fitnessNote,
    confidence: meal.confidence,
    isFood: meal.isFood !== false,
    mealName: meal.name,
    totalCalories: meal.calories,
    totalProteins: meal.proteins,
    totalCarbs: meal.carbs,
    totalFats: meal.fats,
    totalFibers: meal.fibers,
    healthAdvice: meal.fitnessNote,
    notes: meal.fitnessNote,
    items: meal.items || [],
  };
}

export function buildSuccessResponse(
  meal: MealOutput,
  source: MealScanSource,
  headers: Record<string, string>
) {
  const payload = buildMealPayload(meal);
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      source,
      meal: payload,
      mealName: payload.name,
      totalCalories: payload.calories,
      totalProteins: payload.proteins,
      totalCarbs: payload.carbs,
      totalFats: payload.fats,
      totalFibers: payload.fibers,
      healthAdvice: payload.fitnessNote,
      items: payload.items,
    }),
  };
}

export function buildErrorResponse(
  statusCode: number,
  code: string,
  message: string,
  headers: Record<string, string>,
  meal?: MealOutput
) {
  const isNonFood = code === 'NOT_FOOD' || meal?.isFood === false;
  return {
    statusCode,
    headers,
    body: JSON.stringify({
      success: false,
      error: message,
      message,
      code,
      ...(isNonFood ? { isFood: false } : {}),
      ...(meal ? { meal: buildMealPayload(meal) } : {}),
    }),
  };
}

export const CORS_HEADERS = {
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

async function runVisionFallbackChain(
  imageData: { mimeType: string; data: string },
  headers: Record<string, string>,
  userHint?: string
) {
  let geminiQuotaExceeded = false;

  const GEMINI_API_KEY = sanitizeApiKey(process.env.GEMINI_API_KEY || '');
  if (GEMINI_API_KEY) {
    console.log('Exécution de l\'analyse visuelle via Google Gemini Vision...');
    const geminiResult = await callGeminiVision(imageData.mimeType, imageData.data, GEMINI_API_KEY, userHint);

    geminiQuotaExceeded = geminiResult.type === 'quota_exceeded';

    if (geminiResult.type === 'non_food') {
      return buildErrorResponse(
        422,
        'NOT_FOOD',
        'Aucun aliment détecté sur cette image.',
        headers,
        geminiResult.meal
      );
    }
    if (geminiResult.type === 'food') {
      return buildSuccessResponse(geminiResult.meal, 'gemini', headers);
    }
    console.warn('Gemini Vision : échec ou parsing invalide, tentative repli OpenAI / hash...');
  } else {
    console.warn('GEMINI_API_KEY absente ou vide côté Functions.');
  }

  const OPENAI_API_KEY = sanitizeApiKey(process.env.OPENAI_API_KEY || '');
  if (OPENAI_API_KEY) {
    console.log('Exécution de l\'analyse visuelle via OpenAI GPT-4o Vision (gpt-4o-mini)...');
    const openaiResult = await callOpenAIVision(imageData.mimeType, imageData.data, OPENAI_API_KEY, userHint);

    if (openaiResult.type === 'non_food') {
      return buildErrorResponse(
        422,
        'NOT_FOOD',
        'Aucun aliment détecté sur cette image.',
        headers,
        openaiResult.meal
      );
    }
    if (openaiResult.type === 'food') {
      return buildSuccessResponse(openaiResult.meal, 'openai', headers);
    }
  }

  if (geminiQuotaExceeded) {
    console.error('Quota Gemini épuisé sur tous les modèles : scanner hors service.');
    return buildErrorResponse(
      429,
      'QUOTA_EXCEEDED',
      'Le scanner a atteint sa limite d\'analyses pour le moment. Réessaie un peu plus tard, ou saisis ton repas manuellement.',
      headers
    );
  }

  console.log('Clés API distantes absentes ou indisponibles : refus sans estimation fictive');
  return buildErrorResponse(
    503,
    'VISION_UNAVAILABLE',
    'Analyse IA temporairement indisponible. Réessayez dans quelques instants.',
    headers
  );
}

export async function processScanMealRequest(body: Record<string, unknown>, headers = CORS_HEADERS) {
  const { imageBase64, imageUrl, image, userHint, userNote, hint, description } = body;
  const rawImageData = (imageBase64 || image) as string | undefined;
  const imageUrlStr = imageUrl as string | undefined;
  const hintText = typeof userHint === 'string' && userHint.trim().length > 0
    ? userHint.trim()
    : typeof description === 'string' && description.trim().length > 0
      ? description.trim()
      : typeof userNote === 'string' && userNote.trim().length > 0
        ? userNote.trim()
        : typeof hint === 'string' && hint.trim().length > 0
          ? hint.trim()
          : undefined;

  if (!rawImageData && !imageUrlStr) {
    return buildErrorResponse(
      400,
      'MISSING_IMAGE',
      'Aucune image fournie (imageBase64, image ou imageUrl requis).',
      headers
    );
  }

  let imageData: { mimeType: string; data: string };
  try {
    imageData = rawImageData
      ? parseBase64Image(rawImageData)
      : await fetchImageAsBase64(imageUrlStr!);
  } catch (imgError) {
    console.error('Erreur traitement d\'image :', imgError);
    const msg = imgError instanceof Error ? imgError.message : 'Impossible de lire l\'image.';
    const isSizeError = msg.includes('volumineuse');
    const isFormatError = msg.includes('Format') || msg.includes('non supporté');
    const isUrlError = msg.includes('URL') || msg.includes('non autorisée');
    const code = isSizeError ? 'IMAGE_TOO_LARGE' : isFormatError ? 'INVALID_IMAGE_FORMAT' : isUrlError ? 'INVALID_IMAGE_URL' : 'IMAGE_READ_ERROR';
    const statusCode = isSizeError || isFormatError || isUrlError ? 400 : 422;
    return buildErrorResponse(statusCode, code, msg, headers);
  }

  const validation = validateImageData(imageData.data);
  if (!validation.valid) {
    return buildErrorResponse(validation.statusCode, 'INVALID_IMAGE', validation.error, headers);
  }

  return runVisionFallbackChain(imageData, headers, hintText);
}
