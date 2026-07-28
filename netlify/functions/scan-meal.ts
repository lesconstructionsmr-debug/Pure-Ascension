import { Handler } from '@netlify/functions';
import {
  buildErrorResponse,
  buildSuccessResponse,
  CORS_HEADERS,
  processScanMealRequest,
  type IdentifiedFoodItem,
  type MealOutput,
  type ScanMealSuccessResponse,
} from './meal-scan-core';
import { extractBearerToken, verifyFirebaseIdToken } from './verify-firebase-token';

export type { IdentifiedFoodItem, MealOutput, ScanMealSuccessResponse };

/** Désactivable uniquement pour le développement local (netlify dev). */
const AUTH_REQUIRED = process.env.SCAN_REQUIRE_AUTH !== 'false';

export const handler: Handler = async (event) => {
  const headers = CORS_HEADERS;

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return buildErrorResponse(405, 'METHOD_NOT_ALLOWED', 'Méthode non autorisée. Utilisez POST.', headers);
  }

  // L'analyse IA est facturée à chaque appel : réservée aux comptes Pure Ascension authentifiés.
  if (AUTH_REQUIRED) {
    const token = extractBearerToken(event.headers as Record<string, string | undefined>);
    if (!token) {
      return buildErrorResponse(
        401,
        'AUTH_REQUIRED',
        'Connecte-toi à ton compte Pure Ascension pour utiliser le scanner de repas.',
        headers
      );
    }

    const user = await verifyFirebaseIdToken(token);
    if (!user) {
      return buildErrorResponse(
        401,
        'AUTH_INVALID',
        'Ta session a expiré. Reconnecte-toi puis relance le scan.',
        headers
      );
    }
  }

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return buildErrorResponse(400, 'INVALID_JSON', 'Corps de requête JSON invalide.', headers);
  }

  try {
    return await processScanMealRequest(body, headers);
  } catch (error) {
    console.error('Erreur non gérée scan-meal :', error);
    return buildErrorResponse(
      503,
      'SCAN_UNAVAILABLE',
      'Le scanner IA est temporairement indisponible. Réessayez dans quelques instants.',
      headers
    );
  }
};
