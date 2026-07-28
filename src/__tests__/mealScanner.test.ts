/**
 * Suite de Tests & Validation d'Intégrité — MealScannerModal & Vision API
 * Pure Ascension Mobile — SDK Expo v56
 *
 * Conformité : Zéro terme médical interdit (soumis à npm run compliance).
 */

import {
  parseVisionJsonResponse,
  parseNetlifyScanResponse,
  parseBackendScanResponse,
  convertScanResultToFoodEntry,
  validateBase64Image,
  isNonFoodScanResult,
  isNonFoodApiResponse,
  normalizeConfidence,
  buildScanMealPayload,
  NonFoodScanError,
  getScanMealEndpoint,
} from '../services/mealScannerService';
import {
  MOCK_VISION_RESPONSES,
  MOCK_NETLIFY_RESPONSES,
  MOCK_BASE64_SAMPLES,
  MOCK_NETWORK_ERROR,
  MOCK_GEMINI_WRAPPED,
  MOCK_OPENAI_WRAPPED,
  extractGeminiVisionText,
  extractOpenAIVisionText,
} from '../services/mealScannerMocks';
import { parseRawMealJSON, buildMealPayload, extractGeminiVisionText } from '../../netlify/functions/meal-scan-core';
import type { FoodEntry } from '../context/CalorieContext';

type TestResult = { name: string; success: boolean; details: string };

export function runMealScannerTestSuite(): {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
} {
  const testResults: TestResult[] = [];
  let passed = 0;
  let failed = 0;

  function assert(testName: string, condition: boolean, details: string) {
    if (condition) {
      passed++;
      testResults.push({ name: testName, success: true, details });
    } else {
      failed++;
      testResults.push({ name: testName, success: false, details: `[ÉCHEC] ${details}` });
    }
  }

  // TEST 1 : Scan Nominal Gemini (Succès & Parsing complet)
  try {
    const parsed = parseVisionJsonResponse(MOCK_VISION_RESPONSES.nominalDish.rawGemini);
    assert(
      'Vision API Nominal Scan Parsing',
      parsed.title === 'Poulet Grillé & Riz Basmati aux Brocolis' &&
        parsed.kcal === 540 &&
        parsed.proteins === 42 &&
        parsed.fibers === 8 &&
        parsed.confidence === 0.96 &&
        parsed.items.length === 3,
      `Calculé: ${parsed.kcal} kcal, ${parsed.proteins}g prot., ${parsed.fibers}g fibres, Confiance: ${parsed.confidence * 100}%`
    );
  } catch (err: unknown) {
    assert('Vision API Nominal Scan Parsing', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 2 : Image Floue ou Sombre (Basse Confiance < 0.50)
  try {
    const parsed = parseVisionJsonResponse(MOCK_VISION_RESPONSES.blurredOrDarkImage.rawGemini);
    assert(
      'Edge Case : Image Floue / Sombre (Low Confidence)',
      parsed.confidence < 0.5 && parsed.confidence >= 0 && typeof parsed.confidence === 'number',
      `Détecté confiance basse (${parsed.confidence}) avec note de révision`
    );
  } catch (err: unknown) {
    assert('Edge Case : Image Floue / Sombre', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 3 : Image Non Alimentaire (Visage / Objet)
  try {
    const parsed = parseVisionJsonResponse(MOCK_VISION_RESPONSES.nonFoodImage.rawGemini);
    assert(
      'Edge Case : Image Non Alimentaire (Objet / Visage)',
      isNonFoodScanResult(parsed) &&
        parsed.items.length === 0 &&
        parsed.kcal === 0 &&
        parsed.confidence <= 0.2,
      `Détection sans aliment, isNonFood=${parsed.isNonFood}, items=${parsed.items.length}, kcal=0`
    );
  } catch (err: unknown) {
    assert('Edge Case : Image Non Alimentaire', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 4 : JSON Corrompu & Syntax Error Recovery
  try {
    const parsed = parseVisionJsonResponse(MOCK_VISION_RESPONSES.corruptedJsonString);
    assert(
      'Edge Case : Parsing JSON Corrompu / Malformé',
      parsed.title !== undefined && typeof parsed.kcal === 'number' && !isNaN(parsed.kcal),
      `Récupération gracieuse post-erreur JSON, fallback title: "${parsed.title}", kcal: ${parsed.kcal}`
    );
  } catch (err: unknown) {
    assert('Edge Case : Parsing JSON Corrompu', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 5 : Panne Réseau & Mode Repli Hors-Ligne (Fallback Local)
  try {
    const fallback = MOCK_VISION_RESPONSES.offlineFallbackMeal;
    assert(
      'Edge Case : Panne Réseau / Timeout API (Offline Fallback)',
      fallback.kcal === 540 &&
        fallback.proteins === 42 &&
        fallback.fibers === 8 &&
        fallback.items.length === 3 &&
        MOCK_NETWORK_ERROR.type === 'network_error',
      `Modèle de secours actif : "${fallback.title}" avec 540 kcal, erreur réseau simulée: ${MOCK_NETWORK_ERROR.message}`
    );
  } catch (err: unknown) {
    assert('Edge Case : Panne Réseau / Timeout API', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 6 : Intégrité des Types CalorieContext (FoodEntry mapping)
  try {
    const parsed = parseVisionJsonResponse(MOCK_VISION_RESPONSES.nominalDish.rawGemini);
    const entry = convertScanResultToFoodEntry(parsed, 1.25, 'Mon Repas Personnalisé');
    assert(
      'Intégrité des Types : Mapping CalorieContext & Portion Scaling',
      entry.name === '[IA] Mon Repas Personnalisé' &&
        entry.kcal === 675 &&
        entry.proteins === 53 &&
        typeof entry.carbs === 'number' &&
        typeof entry.fats === 'number',
      `Converted to FoodEntry: "${entry.name}" (${entry.kcal} kcal, ${entry.proteins}g prot.)`
    );
  } catch (err: unknown) {
    assert('Intégrité des Types : Mapping CalorieContext', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 7 : Parsing fibres (fibers field)
  try {
    const parsed = parseVisionJsonResponse(MOCK_VISION_RESPONSES.nominalDish.rawGemini);
    const itemFibers = parsed.items.reduce((sum, i) => sum + (i.fibers ?? 0), 0);
    assert(
      'Fibers Parsing : Champ fibers sur repas & items',
      parsed.fibers === 8 && itemFibers === 8 && parsed.items[2].fibers === 6,
      `Repas fibers=${parsed.fibers}g, somme items=${itemFibers}g, brocolis=${parsed.items[2].fibers}g`
    );
  } catch (err: unknown) {
    assert('Fibers Parsing', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 8 : Normalisation confiance > 1 (pourcentage)
  try {
    const parsed = parseVisionJsonResponse(MOCK_VISION_RESPONSES.confidenceAsPercentage.rawGemini);
    const normalized = normalizeConfidence(87);
    assert(
      'Confidence Normalization : Valeur > 1 traitée en pourcentage',
      parsed.confidence === 0.87 && normalized === 0.87,
      `confidence=${parsed.confidence} (attendu 0.87), normalizeConfidence(87)=${normalized}`
    );
  } catch (err: unknown) {
    assert('Confidence Normalization', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 9 : Mapping Netlify avec alias legacy mealName/totalCalories
  try {
    const parsed = parseNetlifyScanResponse(MOCK_NETLIFY_RESPONSES.nominalWithLegacyAliases);
    assert(
      'Netlify Response Mapping : Alias legacy mealName/totalCalories',
      parsed !== null &&
        parsed.title === 'Saumon Grillé & Quinoa' &&
        parsed.kcal === 580 &&
        parsed.proteins === 42 &&
        parsed.fibers === 9 &&
        parsed.items.length === 2,
      `Netlify mappé: "${parsed?.title}", ${parsed?.kcal} kcal, ${parsed?.fibers}g fibres`
    );
  } catch (err: unknown) {
    assert('Netlify Response Mapping', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 10 : Netlify alias racine + confiance pourcentage
  try {
    const parsed = parseNetlifyScanResponse(MOCK_NETLIFY_RESPONSES.legacyRootAliases);
    assert(
      'Netlify Response Mapping : Alias racine & confidence 88%',
      parsed !== null &&
        parsed.title === 'Poké Bowl Thon' &&
        parsed.kcal === 540 &&
        parsed.confidence === 0.88 &&
        parsed.fibers === 7,
      `Alias racine: title="${parsed?.title}", conf=${parsed?.confidence}, fibers=${parsed?.fibers}`
    );
  } catch (err: unknown) {
    assert('Netlify Response Mapping : Alias racine', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 11 : Non-food via réponse Netlify
  try {
    const parsed = parseNetlifyScanResponse(MOCK_NETLIFY_RESPONSES.nonFoodNetlify);
    assert(
      'Non-Food Detection : Réponse Netlify sans aliment',
      parsed !== null && isNonFoodScanResult(parsed!) && parsed!.kcal === 0,
      `Netlify non-food: isNonFood=${parsed?.isNonFood}, kcal=${parsed?.kcal}`
    );
  } catch (err: unknown) {
    assert('Non-Food Detection Netlify', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 12 : Validation base64 — cas valides
  try {
    const jpeg = validateBase64Image(MOCK_BASE64_SAMPLES.validJpegDataUrl);
    const raw = validateBase64Image(MOCK_BASE64_SAMPLES.validRawBase64);
    assert(
      'Base64 Validation : Data URL JPEG & raw base64 valides',
      jpeg.valid &&
        jpeg.mimeType === 'image/jpeg' &&
        !!jpeg.normalized &&
        raw.valid &&
        raw.mimeType === 'image/jpeg',
      `JPEG data URL OK (${jpeg.cleanData?.length} chars), raw OK (${raw.cleanData?.length} chars)`
    );
  } catch (err: unknown) {
    assert('Base64 Validation : Cas valides', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 13 : Validation base64 — cas invalides
  try {
    const missing = validateBase64Image(null);
    const empty = validateBase64Image(MOCK_BASE64_SAMPLES.empty);
    const invalid = validateBase64Image(MOCK_BASE64_SAMPLES.invalidChars);
    const short = validateBase64Image(MOCK_BASE64_SAMPLES.tooShort);
    const whitespace = validateBase64Image(MOCK_BASE64_SAMPLES.whitespace);
    assert(
      'Base64 Validation : Entrées invalides rejetées',
      !missing.valid &&
        missing.reason === 'missing_input' &&
        !empty.valid &&
        empty.reason === 'empty_input' &&
        !invalid.valid &&
        invalid.reason === 'invalid_base64_chars' &&
        !short.valid &&
        short.reason === 'payload_too_short' &&
        !whitespace.valid &&
        whitespace.reason === 'empty_input',
      `Rejets: missing=${missing.reason}, empty=${empty.reason}, invalid=${invalid.reason}, short=${short.reason}`
    );
  } catch (err: unknown) {
    assert('Base64 Validation : Cas invalides', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 14 : Gemini wrapped response extraction & parsing
  try {
    const rawText = extractGeminiVisionText(MOCK_GEMINI_WRAPPED.nominal);
    const parsed = parseVisionJsonResponse(rawText, 'gemini');
    assert(
      'Gemini Wrapped Response : Extraction & parsing nominal',
      parsed.title === 'Poulet Grillé & Riz Basmati aux Brocolis' &&
        parsed.kcal === 540 &&
        parsed.source === 'gemini',
      `Gemini wrap → "${parsed.title}", ${parsed.kcal} kcal, source=${parsed.source}`
    );
  } catch (err: unknown) {
    assert('Gemini Wrapped Response', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 15 : OpenAI wrapped response extraction & parsing
  try {
    const rawText = extractOpenAIVisionText(MOCK_OPENAI_WRAPPED.nominal);
    const parsed = parseVisionJsonResponse(rawText, 'openai');
    assert(
      'OpenAI Wrapped Response : Extraction & parsing nominal',
      parsed.title === 'Poulet Grillé & Riz Basmati aux Brocolis' &&
        parsed.kcal === 540 &&
        parsed.confidence === 0.94 &&
        parsed.source === 'openai',
      `OpenAI wrap → "${parsed.title}", conf=${parsed.confidence}, source=${parsed.source}`
    );
  } catch (err: unknown) {
    assert('OpenAI Wrapped Response', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 16 : Gemini wrapped — empty candidates fallback
  try {
    const rawText = extractGeminiVisionText(MOCK_GEMINI_WRAPPED.empty);
    const parsed = parseVisionJsonResponse(rawText, 'gemini');
    assert(
      'Gemini Wrapped Response : Candidates vides → fallback gracieux',
      parsed.title === 'Repas IA Pure Ascension' && parsed.kcal === 520,
      `Fallback title="${parsed.title}", kcal=${parsed.kcal}`
    );
  } catch (err: unknown) {
    assert('Gemini Wrapped Empty', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 17 : NonFoodScanError via parseBackendScanResponse
  try {
    let threwNonFood = false;
    let errorName = '';
    try {
      parseBackendScanResponse({
        success: false,
        isFood: false,
        message: 'Aucun aliment détecté sur cette photo.',
        meal: {
          name: 'Aucun aliment détecté',
          calories: 0,
          proteins: 0,
          carbs: 0,
          fats: 0,
          fibers: 0,
          confidence: 0.12,
          fitnessNote: 'Prenez une photo de votre assiette.',
          items: [],
        },
      });
    } catch (err: unknown) {
      threwNonFood = err instanceof NonFoodScanError;
      errorName = err instanceof Error ? err.name : '';
    }
    assert(
      'NonFoodScanError : parseBackendScanResponse rejette non-aliment',
      threwNonFood && errorName === 'NonFoodScanError',
      `NonFoodScanError thrown=${threwNonFood}, name=${errorName}`
    );
  } catch (err: unknown) {
    assert('NonFoodScanError', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 18 : buildScanMealPayload — data URL, http URL, raw base64
  try {
    const fromDataUrl = buildScanMealPayload(
      'file:///local.jpg',
      MOCK_BASE64_SAMPLES.validJpegDataUrl
    );
    const fromHttp = buildScanMealPayload('https://example.com/meal.jpg');
    const fromRawUri = buildScanMealPayload('data:image/jpeg;base64,abc123');
    assert(
      'buildScanMealPayload : data URL, HTTP URL & URI directe',
      !!fromDataUrl.imageBase64 &&
        fromDataUrl.imageBase64.startsWith('data:image/jpeg;base64,') &&
        fromHttp.imageUrl === 'https://example.com/meal.jpg' &&
        fromRawUri.imageBase64 === 'data:image/jpeg;base64,abc123',
      `base64=${!!fromDataUrl.imageBase64}, http=${fromHttp.imageUrl}, uri=${fromRawUri.imageBase64?.slice(0, 30)}...`
    );
  } catch (err: unknown) {
    assert('buildScanMealPayload', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 19 : Backend parseRawMealJSON — repas nominal
  try {
    const parsed = parseRawMealJSON(JSON.parse(MOCK_VISION_RESPONSES.nominalDish.rawGemini));
    assert(
      'Backend parseRawMealJSON : Repas nominal food type',
      parsed.type === 'food' &&
        parsed.meal.name === 'Poulet Grillé & Riz Basmati aux Brocolis' &&
        parsed.meal.calories === 540 &&
        parsed.meal.fibers === 8 &&
        (parsed.meal.items?.length ?? 0) === 3,
      `type=${parsed.type}, name="${parsed.type === 'food' ? parsed.meal.name : ''}", fibers=${parsed.type === 'food' ? parsed.meal.fibers : 0}`
    );
  } catch (err: unknown) {
    assert('Backend parseRawMealJSON nominal', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 20 : Backend parseRawMealJSON — non-food isFood:false
  try {
    const parsed = parseRawMealJSON(JSON.parse(MOCK_VISION_RESPONSES.nonFoodImage.rawGemini));
    assert(
      'Backend parseRawMealJSON : Non-food isFood flag',
      parsed.type === 'non_food' &&
        parsed.meal.calories === 0 &&
        parsed.meal.isFood === false,
      `type=${parsed.type}, kcal=${parsed.meal.calories}, isFood=${parsed.meal.isFood}`
    );
  } catch (err: unknown) {
    assert('Backend parseRawMealJSON non-food', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 21 : Backend parseRawMealJSON — JSON corrompu / invalide
  try {
    const parsedNull = parseRawMealJSON(null);
    const parsedString = parseRawMealJSON('not-an-object');
    assert(
      'Backend parseRawMealJSON : Entrées invalides → parse_error',
      parsedNull.type === 'parse_error' && parsedString.type === 'parse_error',
      `null→${parsedNull.type}, string→${parsedString.type}`
    );
  } catch (err: unknown) {
    assert('Backend parseRawMealJSON invalid', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 22 : Backend buildMealPayload — alias legacy mealName/totalCalories
  try {
    const meal = buildMealPayload({
      name: 'Saumon Grillé & Quinoa',
      calories: 580,
      proteins: 42,
      carbs: 38,
      fats: 26,
      fibers: 9,
      fitnessNote: 'Excellente récupération physique.',
      confidence: 0.91,
      items: [],
    });
    assert(
      'Backend buildMealPayload : Alias legacy pour Netlify',
      meal.mealName === 'Saumon Grillé & Quinoa' &&
        meal.totalCalories === 580 &&
        meal.totalFibers === 9 &&
        meal.healthAdvice === 'Excellente récupération physique.',
      `mealName="${meal.mealName}", totalCal=${meal.totalCalories}, fibers=${meal.totalFibers}`
    );
  } catch (err: unknown) {
    assert('Backend buildMealPayload', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 23 : Type integrity — FoodEntry keys & optional fibers
  try {
    const parsed = parseVisionJsonResponse(MOCK_VISION_RESPONSES.nominalDish.rawGemini);
    const entry = convertScanResultToFoodEntry(parsed, 1);
    const requiredKeys: Array<keyof Omit<FoodEntry, 'id' | 'time'>> = [
      'name',
      'kcal',
      'proteins',
      'carbs',
      'fats',
    ];
    const hasRequired = requiredKeys.every(k => typeof entry[k] === 'number' || typeof entry[k] === 'string');
    const fibersValid = entry.fibers === undefined || typeof entry.fibers === 'number';
    assert(
      'Type Integrity : FoodEntry shape sans id/time',
      entry.name.startsWith('[IA]') &&
        hasRequired &&
        fibersValid &&
        entry.kcal > 0 &&
        entry.proteins >= 0,
      `keys OK=${hasRequired}, fibers=${entry.fibers}, name="${entry.name}"`
    );
  } catch (err: unknown) {
    assert('Type Integrity FoodEntry', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 24 : getScanMealEndpoint — Node fallback (web path)
  try {
    const endpoint = getScanMealEndpoint();
    assert(
      'getScanMealEndpoint : Fallback Node/web sans react-native',
      endpoint.includes('scan-meal'),
      `endpoint="${endpoint}"`
    );
  } catch (err: unknown) {
    assert('getScanMealEndpoint', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 25 : isNonFoodApiResponse — MISSING_IMAGE ≠ NOT_FOOD
  try {
    const missingImage = isNonFoodApiResponse({
      success: false,
      code: 'MISSING_IMAGE',
      error: 'Aucune image fournie.',
    });
    const notFood = isNonFoodApiResponse({
      success: false,
      code: 'NOT_FOOD',
      isFood: false,
      error: 'Aucun aliment détecté sur cette image.',
    });
    assert(
      'isNonFoodApiResponse : MISSING_IMAGE rejeté, NOT_FOOD détecté',
      !missingImage && notFood,
      `missingImage=${missingImage}, notFood=${notFood}`
    );
  } catch (err: unknown) {
    assert('isNonFoodApiResponse code discrimination', false, err instanceof Error ? err.message : String(err));
  }

  // TEST 26 : extractGeminiVisionText — ignore les parts "thinking" Gemini 2.5
  try {
    const mealJson = MOCK_VISION_RESPONSES.nominalDish.rawGemini;
    const withThinking = extractGeminiVisionText({
      candidates: [{
        content: {
          parts: [
            { text: 'Let me analyze this meal step by step...', thought: true },
            { text: mealJson },
          ],
        },
      }],
    });
    const parsed = parseRawMealJSON(JSON.parse(withThinking));
    assert(
      'extractGeminiVisionText : part thinking ignorée, JSON repas extrait',
      parsed.type === 'food' &&
        parsed.meal.name === 'Poulet Grillé & Riz Basmati aux Brocolis' &&
        parsed.meal.calories === 540,
      `type=${parsed.type}, name="${parsed.type === 'food' ? parsed.meal.name : ''}"`
    );
  } catch (err: unknown) {
    assert('extractGeminiVisionText thinking parts', false, err instanceof Error ? err.message : String(err));
  }

  return { total: testResults.length, passed, failed, results: testResults };
}

const isDirectRun =
  typeof require !== 'undefined' &&
  typeof module !== 'undefined' &&
  require.main === module;

if (isDirectRun) {
  const summary = runMealScannerTestSuite();
  console.log('\n🧪 === RÉSULTATS DES TESTS MEAL SCANNER & VISION API ===');
  console.log(`Total: ${summary.total} | Réussis: ${summary.passed} | Échecs: ${summary.failed}\n`);
  summary.results.forEach(r => {
    console.log(`${r.success ? '✅' : '❌'} ${r.name}: ${r.details}`);
  });
  if (summary.failed > 0) {
    process.exit(1);
  }
}
