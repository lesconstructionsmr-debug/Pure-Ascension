/**
 * Mock Vision / Netlify responses for local dev & QA tests.
 * Pure Ascension Meal Scanner
 */

import { ScannedMealResult } from './mealScannerService';

export interface GeminiVisionRawPayload {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

export interface OpenAIVisionRawPayload {
  choices?: Array<{ message?: { content?: string } }>;
}

export interface NetlifyScanSuccessPayload {
  success: boolean;
  meal: Record<string, unknown>;
}

const NOMINAL_MEAL_JSON = {
  name: 'Poulet Grillé & Riz Basmati aux Brocolis',
  calories: 540,
  proteins: 42,
  carbs: 45,
  fats: 12,
  fibers: 8,
  confidence: 0.96,
  fitnessNote: 'Repas riche en protéines complètes pour le développement musculaire & glucides d\'énergie.',
  items: [
    { name: 'Blanc de poulet grillé', portion: '150g', calories: 240, proteins: 35, carbs: 0, fats: 5, fibers: 0 },
    { name: 'Riz basmati cuit', portion: '200g', calories: 230, proteins: 5, carbs: 42, fats: 2, fibers: 2 },
    { name: 'Brocolis vapeur', portion: '100g', calories: 70, proteins: 2, carbs: 3, fats: 5, fibers: 6 },
  ],
};

export const MOCK_VISION_RESPONSES = {
  nominalDish: {
    rawGemini: JSON.stringify(NOMINAL_MEAL_JSON),
    rawOpenAI: JSON.stringify({ ...NOMINAL_MEAL_JSON, confidence: 0.94 }),
  },

  blurredOrDarkImage: {
    rawGemini: JSON.stringify({
      name: 'Assiette Sombre / Non Identifiée',
      calories: 350,
      proteins: 20,
      carbs: 30,
      fats: 10,
      fibers: 4,
      confidence: 0.42,
      fitnessNote: 'Image sombre. Vérifiez la saisie avant de valider votre repas.',
      items: [],
    }),
  },

  nonFoodImage: {
    rawGemini: JSON.stringify({
      name: 'Objet Non Alimentaire',
      calories: 0,
      proteins: 0,
      carbs: 0,
      fats: 0,
      fibers: 0,
      confidence: 0.15,
      fitnessNote: 'Aucun aliment détecté sur cette photo.',
      items: [],
      isNonFood: true,
    }),
  },

  corruptedJsonString:
    '```json\n{\n  "name": "Saumon Grillé",\n  "calories": 580,\n  "proteins": 42,\n  "carbs": 38,\n  "fats": 26,\n  "fibers": 5,\n  "confidence": 95,\n  "items": [\n    { "name": "Saumon", "portion": "160g", "calories": 330, "proteins": 34, "carbs": 0, "fats": 21, "fibers": 0 },\n  ]\n```',

  confidenceAsPercentage: {
    rawGemini: JSON.stringify({
      name: 'Bowl Quinoa & Légumes',
      calories: 420,
      proteins: 18,
      carbs: 52,
      fats: 14,
      fibers: 11,
      confidence: 87,
      fitnessNote: 'Repas végétal équilibré pour une énergie durable.',
      items: [],
    }),
  },

  offlineFallbackMeal: {
    title: 'Poulet Grillé, Riz Basmati & Brocolis',
    confidence: 0.92,
    fitnessNote: 'Association optimale : Protéines complètes pour le développement musculaire & glucides complexes d\'énergie.',
    densityScore: 'A+',
    kcal: 540,
    proteins: 42,
    carbs: 45,
    fats: 12,
    fibers: 8,
    items: [
      { name: 'Poulet grillé', portion: '150g', calories: 240, proteins: 35, carbs: 0, fats: 5, fibers: 0 },
      { name: 'Riz basmati', portion: '200g', calories: 230, proteins: 5, carbs: 42, fats: 2, fibers: 2 },
      { name: 'Brocolis vapeur', portion: '100g', calories: 70, proteins: 2, carbs: 3, fats: 5, fibers: 6 },
    ],
    benefits: ['Poulet grillé (150g)', 'Riz basmati (200g)', 'Brocolis vapeur (100g)'],
  } as ScannedMealResult,
};

export const MOCK_NETLIFY_RESPONSES = {
  nominalWithLegacyAliases: {
    success: true,
    meal: {
      mealName: 'Saumon Grillé & Quinoa',
      totalCalories: 580,
      totalProteins: 42,
      totalCarbs: 38,
      totalFats: 26,
      totalFibers: 9,
      healthAdvice: 'Excellente source de protéines complètes pour la récupération physique.',
      confidence: 0.91,
      items: [
        { name: 'Saumon grillé', portion: '160g', calories: 330, proteins: 34, carbs: 0, fats: 21, fibers: 0 },
        { name: 'Quinoa aux herbes', portion: '150g', calories: 180, proteins: 6, carbs: 32, fats: 3, fibers: 5 },
      ],
    },
  },

  legacyRootAliases: {
    success: true,
    mealName: 'Poké Bowl Thon',
    totalCalories: 540,
    totalProteins: 44,
    totalCarbs: 55,
    totalFats: 14,
    totalFibers: 7,
    healthAdvice: 'Repas frais idéal après une séance d\'entraînement à haute intensité.',
    confidence: 88,
    items: [],
  },

  nonFoodNetlify: {
    success: true,
    meal: {
      name: 'Objet Non Alimentaire',
      calories: 0,
      proteins: 0,
      carbs: 0,
      fats: 0,
      fibers: 0,
      confidence: 0.12,
      fitnessNote: 'Aucun aliment détecté sur cette photo.',
      items: [],
    },
  },
};

export function extractGeminiVisionText(payload: GeminiVisionRawPayload): string {
  const parts = payload.candidates?.[0]?.content?.parts;
  if (!parts?.length) return '{}';

  const answerParts: string[] = [];
  for (const part of parts as Array<{ text?: string; thought?: boolean }>) {
    if (!part.text || part.thought === true) continue;
    answerParts.push(part.text);
  }

  if (answerParts.length > 0) {
    return answerParts.join('\n').trim();
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    const text = parts[i]?.text?.trim();
    if (text && (text.startsWith('{') || text.startsWith('['))) {
      return text;
    }
  }

  return parts[parts.length - 1]?.text?.trim() || '{}';
}

export function extractOpenAIVisionText(payload: OpenAIVisionRawPayload): string {
  return payload.choices?.[0]?.message?.content?.trim() || '{}';
}

export const MOCK_GEMINI_WRAPPED = {
  nominal: {
    candidates: [{ content: { parts: [{ text: MOCK_VISION_RESPONSES.nominalDish.rawGemini }] } }],
  } as GeminiVisionRawPayload,
  blurred: {
    candidates: [{ content: { parts: [{ text: MOCK_VISION_RESPONSES.blurredOrDarkImage.rawGemini }] } }],
  } as GeminiVisionRawPayload,
  nonFood: {
    candidates: [{ content: { parts: [{ text: MOCK_VISION_RESPONSES.nonFoodImage.rawGemini }] } }],
  } as GeminiVisionRawPayload,
  empty: { candidates: [] } as GeminiVisionRawPayload,
};

export const MOCK_OPENAI_WRAPPED = {
  nominal: {
    choices: [{ message: { content: MOCK_VISION_RESPONSES.nominalDish.rawOpenAI } }],
  } as OpenAIVisionRawPayload,
  confidencePercent: {
    choices: [{ message: { content: MOCK_VISION_RESPONSES.confidenceAsPercentage.rawGemini } }],
  } as OpenAIVisionRawPayload,
  empty: { choices: [] } as OpenAIVisionRawPayload,
};

export const MOCK_NETWORK_ERROR = {
  type: 'network_error' as const,
  message: 'fetch failed: ECONNREFUSED',
  status: null,
};

export const MOCK_BASE64_SAMPLES = {
  validJpegDataUrl:
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==',
  validRawBase64:
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==',
  invalidChars: 'data:image/jpeg;base64,ABCDEFGHIJKLMNOP!!!',
  empty: '',
  whitespace: '   ',
  tooShort: 'data:image/jpeg;base64,abc',
};
