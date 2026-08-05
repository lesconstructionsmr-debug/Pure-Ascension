/**
 * mealScannerService — parsing, API calls & helpers for Meal Scanner IA Vision
 * Pure Ascension — Expo SDK 56
 */
import type { FoodEntry } from '../context/CalorieContext';
import { downscaleDataUrl } from '../utils/imageResize';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IdentifiedFoodItem {
  name: string;
  portion: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  fibers?: number;
}

export type ScanSource = 'gemini' | 'openai' | 'fallback' | 'custom';

export interface ScannedMealResult {
  title: string;
  confidence: number;
  fitnessNote: string;
  densityScore: string;
  kcal: number;
  proteins: number;
  carbs: number;
  fats: number;
  fibers: number;
  items: IdentifiedFoodItem[];
  benefits: string[];
  source?: ScanSource;
}

export interface ScanMealApiResponse {
  success?: boolean;
  error?: string;
  message?: string;
  code?: string;
  isFood?: boolean;
  source?: ScanSource | string;
  meal?: Record<string, unknown>;
  mealName?: string;
  totalCalories?: number;
  totalProteins?: number;
  totalCarbs?: number;
  totalFats?: number;
  totalFibers?: number;
  fibers?: number;
  healthAdvice?: string;
  items?: Array<Record<string, unknown>>;
}

export class NonFoodScanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonFoodScanError';
  }
}

/** Le scanner IA exige un compte connecté (protection anti-abus de l'endpoint). */
export class ScanAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScanAuthError';
  }
}

/** Quota du fournisseur d'IA épuisé : réessayer plus tard ou saisir à la main. */
export class ScanQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScanQuotaError';
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function normalizeBase64(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.startsWith('data:')) return raw;
  return `data:image/jpeg;base64,${raw}`;
}

export function parseConfidence(rawConf: unknown, hasItems: boolean = false): number {
  if (typeof rawConf === 'number') {
    if (rawConf > 1) return Math.min(1, Math.max(0, rawConf / 100));
    return Math.min(1, Math.max(0, rawConf));
  }
  if (typeof rawConf === 'string') {
    const num = parseFloat(rawConf);
    if (!isNaN(num)) return num > 1 ? num / 100 : num;
  }
  return hasItems ? 0.88 : 0.70;
}

/** @alias parseConfidence */
export const normalizeConfidence = parseConfidence;

export interface Base64ValidationResult {
  valid: boolean;
  reason?: string;
  mimeType?: string;
  cleanData?: string;
  normalized?: string;
}

const RAW_BASE64_RE = /^[A-Za-z0-9+/=]+$/;

/**
 * Validates and normalizes base64 image payloads for vision API calls.
 */
export function validateBase64Image(input: string | null | undefined): Base64ValidationResult {
  if (input == null) {
    return { valid: false, reason: 'missing_input' };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, reason: 'empty_input' };
  }

  if (trimmed.startsWith('data:')) {
    const base64Marker = ';base64,';
    const markerIdx = trimmed.indexOf(base64Marker);
    if (markerIdx === -1) {
      return { valid: false, reason: 'invalid_data_url' };
    }

    const mimePart = trimmed.slice(5, markerIdx).toLowerCase();
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(mimePart)) {
      return { valid: false, reason: 'invalid_data_url' };
    }

    const mimeType = mimePart.replace('jpg', 'jpeg');
    const cleanData = trimmed.slice(markerIdx + base64Marker.length).replace(/\s/g, '');
    if (!cleanData || cleanData.length < 16) {
      return { valid: false, reason: 'payload_too_short' };
    }
    if (!RAW_BASE64_RE.test(cleanData)) {
      return { valid: false, reason: 'invalid_base64_chars' };
    }
    return {
      valid: true,
      mimeType,
      cleanData,
      normalized: `data:${mimeType};base64,${cleanData}`,
    };
  }

  const cleanData = trimmed.replace(/\s/g, '');
  if (cleanData.length < 16) {
    return { valid: false, reason: 'payload_too_short' };
  }
  if (!RAW_BASE64_RE.test(cleanData)) {
    return { valid: false, reason: 'invalid_base64_chars' };
  }

  return {
    valid: true,
    mimeType: 'image/jpeg',
    cleanData,
    normalized: `data:image/jpeg;base64,${cleanData}`,
  };
}

function parseItems(rawItems: unknown): IdentifiedFoodItem[] {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((i: Record<string, unknown>) => ({
    name: String(i?.name || 'Aliment'),
    portion: String(i?.portion || '100g'),
    calories: Math.max(0, Math.round(Number(i?.calories) || 0)),
    proteins: Math.max(0, Math.round(Number(i?.proteins) || 0)),
    carbs: Math.max(0, Math.round(Number(i?.carbs) || 0)),
    fats: Math.max(0, Math.round(Number(i?.fats) || 0)),
    fibers: Math.max(0, Math.round(Number(i?.fibers ?? i?.fibres) || 0)),
  }));
}

function parseFibers(parsed: Record<string, unknown>): number {
  const raw = parsed.fibers ?? parsed.fibres ?? parsed.totalFibers ?? parsed.totalFibres;
  if (raw === 0 || raw === '0') return 0;
  return Math.max(0, Math.round(Number(raw) || 0));
}

function roundMacro(value: unknown, fallback: number): number {
  if (value === 0 || value === '0') return 0;
  const n = Number(value);
  return Math.max(0, Math.round(Number.isNaN(n) ? fallback : n));
}

function normalizeSource(raw: unknown): ScanSource | undefined {
  if (raw === 'gemini' || raw === 'openai' || raw === 'fallback' || raw === 'custom') {
    return raw;
  }
  if (typeof raw === 'string') {
    const lower = raw.toLowerCase();
    if (lower.includes('gemini')) return 'gemini';
    if (lower.includes('openai') || lower.includes('gpt')) return 'openai';
    if (lower.includes('fallback') || lower.includes('hash')) return 'fallback';
  }
  return undefined;
}

export function isNonFoodResult(result: Partial<ScannedMealResult> & { isFood?: boolean }): boolean {
  if (result.isFood === false) return true;
  const kcal = result.kcal ?? 0;
  const items = result.items ?? [];
  const confidence = result.confidence ?? 1;
  const title = (result.title || '').toLowerCase();
  const nonFoodTitle =
    title.includes('non alimentaire') ||
    title.includes('objet') ||
    title.includes('aucun aliment');
  return (kcal === 0 && items.length === 0 && confidence <= 0.25) || nonFoodTitle;
}

export function isNonFoodApiResponse(data: ScanMealApiResponse): boolean {
  const code = (data.code || '').toUpperCase();
  if (code === 'NOT_FOOD') return true;
  if (data.isFood === false) return true;
  const err = (data.error || '').toLowerCase();
  if (err.includes('non_food') || err.includes('non-food') || err.includes('not_food')) return true;
  if (data.meal && isNonFoodResult(parseRawMealObject(data.meal, data.source))) return true;
  return false;
}

export function getNonFoodMessage(data: ScanMealApiResponse): string {
  if (data.message) return data.message;
  if (data.meal) {
    const meal = data.meal as Record<string, unknown>;
    const note = meal.fitnessNote || meal.healthAdvice || meal.notes;
    if (typeof note === 'string' && note.length > 0) return note;
  }
  return 'Aucun aliment détecté sur cette photo. Essaie une autre prise de vue de ton assiette.';
}

export function calculateDensityScore(kcal: number, proteins: number, fibers: number): string {
  if (kcal <= 0) return 'B';
  const proteinRatio = (proteins * 4) / kcal;
  const fiberDensity = (fibers / kcal) * 1000;

  if (proteinRatio >= 0.28 || fiberDensity >= 14) return 'A+';
  if (proteinRatio >= 0.20 || fiberDensity >= 9) return 'A';
  if (proteinRatio >= 0.12 || fiberDensity >= 4) return 'B+';
  if (proteinRatio >= 0.08) return 'B';
  return 'C+';
}

function buildScannedMealResult(
  parsed: Record<string, unknown>,
  source?: ScanSource
): ScannedMealResult {
  const itemsArr = parseItems(parsed.items);
  const confidence = parseConfidence(parsed.confidence, itemsArr.length > 0);

  const itemsKcal = itemsArr.reduce((acc, i) => acc + (i.calories || 0), 0);
  const itemsProteins = itemsArr.reduce((acc, i) => acc + (i.proteins || 0), 0);
  const itemsCarbs = itemsArr.reduce((acc, i) => acc + (i.carbs || 0), 0);
  const itemsFats = itemsArr.reduce((acc, i) => acc + (i.fats || 0), 0);
  const itemsFibers = itemsArr.reduce((acc, i) => acc + (i.fibers || 0), 0);

  const rawKcal = parsed.calories ?? parsed.totalCalories;
  const kcal = rawKcal != null && rawKcal !== '' ? Math.max(0, Math.round(Number(rawKcal) || 0)) : (itemsKcal > 0 ? itemsKcal : 520);

  const rawProt = parsed.proteins ?? parsed.totalProteins;
  const proteins = rawProt != null && rawProt !== '' ? Math.max(0, Math.round(Number(rawProt) || 0)) : (itemsProteins > 0 ? itemsProteins : 38);

  const rawCarbs = parsed.carbs ?? parsed.totalCarbs;
  const carbs = rawCarbs != null && rawCarbs !== '' ? Math.max(0, Math.round(Number(rawCarbs) || 0)) : (itemsCarbs > 0 ? itemsCarbs : 45);

  const rawFats = parsed.fats ?? parsed.totalFats;
  const fats = rawFats != null && rawFats !== '' ? Math.max(0, Math.round(Number(rawFats) || 0)) : (itemsFats > 0 ? itemsFats : 15);

  const fibers = parseFibers(parsed) || (itemsFibers > 0 ? itemsFibers : 8);

  const rawDensityScore = parsed.densityScore || parsed.score;
  const densityScore = typeof rawDensityScore === 'string' && rawDensityScore.length > 0
    ? rawDensityScore
    : calculateDensityScore(kcal, proteins, fibers);

  return {
    title: String(parsed.name || parsed.mealName || 'Repas IA Pure Ascension'),
    confidence,
    fitnessNote: String(
      parsed.fitnessNote || parsed.healthAdvice || parsed.notes ||
      'Composition nutritionnelle équilibrée & énergie P1.'
    ),
    densityScore,
    kcal,
    proteins,
    carbs,
    fats,
    fibers,
    items: itemsArr,
    benefits: itemsArr.length
      ? itemsArr.map(i => `${i.name} (${i.portion})`)
      : ['Protéines complètes P1', 'Glucides complexes d\'énergie', 'Satiété longue durée'],
    source: normalizeSource(parsed.source) ?? source,
  };
}

export function parseRawMealObject(
  mealObj: Record<string, unknown>,
  source?: ScanSource | string
): ScannedMealResult {
  return buildScannedMealResult(mealObj, normalizeSource(source));
}

/**
 * Parse JSON text from Gemini / OpenAI vision responses
 */
export function parseVisionJsonResponse(rawText: string, source: ScanSource = 'custom'): ScannedMealResult {
  let cleanedText = rawText.trim();
  cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(cleanedText);
  } catch {
    parsed = {};
  }

  return buildScannedMealResult(parsed, source);
}

/**
 * Parse Netlify scan-meal API response
 */
export function parseBackendScanResponse(data: ScanMealApiResponse): ScannedMealResult {
  if (isNonFoodApiResponse(data)) {
    throw new NonFoodScanError(getNonFoodMessage(data));
  }

  const mealObj = (data.meal || data) as Record<string, unknown>;
  if (!mealObj || !(mealObj.mealName || mealObj.name)) {
    throw new Error('Réponse serveur invalide');
  }

  const result = parseRawMealObject(mealObj, data.source);
  if (isNonFoodResult(result)) {
    throw new NonFoodScanError(getNonFoodMessage(data));
  }

  return result;
}

/**
 * Non-throwing Netlify response mapper (supports legacy mealName/totalCalories aliases).
 */
export function parseNetlifyScanResponse(
  data: ScanMealApiResponse | null | undefined
): ScannedMealResult | null {
  if (!data) return null;
  const mealObj = (data.meal || data) as Record<string, unknown>;
  const title = mealObj.mealName || mealObj.name;
  if (!title) return null;
  return parseRawMealObject(mealObj, data.source);
}

/** @alias isNonFoodResult */
export const isNonFoodScanResult = isNonFoodResult;

export function convertScanResultToFoodEntry(
  scanResult: ScannedMealResult,
  portionFactor: number = 1,
  customTitle?: string,
  customMacros?: Partial<Pick<ScannedMealResult, 'kcal' | 'proteins' | 'carbs' | 'fats' | 'fibers'>>
): Omit<FoodEntry, 'id' | 'time'> {
  const factor = Math.max(0.1, portionFactor);
  const entry: Omit<FoodEntry, 'id' | 'time'> = {
    name: `[IA] ${customTitle?.trim() || scanResult.title}`,
    kcal: Math.max(0, customMacros?.kcal ?? Math.round(scanResult.kcal * factor)),
    proteins: Math.max(0, customMacros?.proteins ?? Math.round(scanResult.proteins * factor)),
    carbs: Math.max(0, customMacros?.carbs ?? Math.round(scanResult.carbs * factor)),
    fats: Math.max(0, customMacros?.fats ?? Math.round(scanResult.fats * factor)),
  };

  const fibers = customMacros?.fibers ?? Math.round(scanResult.fibers * factor);
  if (fibers > 0) {
    entry.fibers = fibers;
  }

  return entry;
}

export function getScanMealEndpoint(): string {
  const override = process.env.EXPO_PUBLIC_MEAL_SCAN_ENDPOINT?.trim();
  if (override) return override;

  let os = 'ios';
  try {
    const { Platform } = require('react-native') as { Platform: { OS: string } };
    os = Platform.OS;
  } catch {
    os = 'web';
  }

  return os === 'web'
    ? '/.netlify/functions/scan-meal'
    : 'https://pure-ascension.netlify.app/.netlify/functions/scan-meal';
}

export interface ScanMealRequestPayload {
  imageBase64?: string;
  imageUrl?: string;
  userHint?: string;
}

export function buildScanMealPayload(
  uri: string,
  base64?: string | null,
  userHint?: string
): ScanMealRequestPayload {
  const payload: ScanMealRequestPayload = {};
  const normalized = normalizeBase64(base64);
  if (normalized) {
    payload.imageBase64 = normalized;
  } else if (uri.startsWith('http')) {
    payload.imageUrl = uri;
  } else if (uri.startsWith('data:')) {
    payload.imageBase64 = uri;
  } else {
    payload.imageBase64 = uri;
  }

  if (userHint && userHint.trim().length > 0) {
    payload.userHint = userHint.trim();
  }

  return payload;
}

/** Token Firebase de l'utilisateur courant — requis par l'endpoint de scan. */
async function getIdTokenSafe(): Promise<string | null> {
  try {
    const { auth } = require('./firebase') as {
      auth: { currentUser: { getIdToken: (force?: boolean) => Promise<string> } | null };
    };
    if (!auth?.currentUser) return null;
    return await auth.currentUser.getIdToken();
  } catch {
    return null;
  }
}

export async function callBackendScanMeal(
  uri: string,
  base64?: string | null,
  userHint?: string
): Promise<ScannedMealResult> {
  const endpoint = getScanMealEndpoint();
  const payload = buildScanMealPayload(uri, base64, userHint);
  const idToken = await getIdTokenSafe();

  if (payload.imageBase64?.startsWith('data:image/')) {
    payload.imageBase64 = await downscaleDataUrl(payload.imageBase64);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data: ScanMealApiResponse = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      throw new ScanAuthError(
        data.message || 'Connecte-toi à ton compte Pure Ascension pour utiliser le scanner de repas.'
      );
    }
    if (response.status === 429 || data.code === 'QUOTA_EXCEEDED') {
      throw new ScanQuotaError(
        data.message ||
          'Le scanner a atteint sa limite d\'analyses pour le moment. Réessaie un peu plus tard, ou saisis ton repas manuellement.'
      );
    }
    if (isNonFoodApiResponse(data)) {
      throw new NonFoodScanError(getNonFoodMessage(data));
    }
    throw new Error(data.message || `Erreur serveur (${response.status})`);
  }

  return parseBackendScanResponse(data);
}

export function getSourceBadgeLabel(source?: ScanSource): string | null {
  switch (source) {
    case 'gemini':
    case 'openai':
    case 'custom':
      return 'Analyse IA Pure Ascension';
    case 'fallback': return 'Estimation locale';
    default: return null;
  }
}
