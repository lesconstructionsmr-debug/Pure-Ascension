/**
 * Vérification des ID tokens Firebase (RS256) sans firebase-admin.
 * Les certificats publics Google sont mis en cache pour la durée de vie du conteneur,
 * ce qui garde le surcoût à zéro appel réseau sur les invocations à chaud.
 */
import { createVerify } from 'crypto';

const GOOGLE_CERT_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

const CERT_FALLBACK_TTL_MS = 60 * 60 * 1000;
/** Tolérance d'horloge entre Netlify et Google. */
const CLOCK_SKEW_SEC = 300;

let cachedCerts: Record<string, string> | null = null;
let cachedCertsExpireAt = 0;

export function getFirebaseProjectId(): string {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
    'pure-ascension'
  ).trim();
}

async function fetchGoogleCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedCerts && now < cachedCertsExpireAt) return cachedCerts;

  const response = await fetch(GOOGLE_CERT_URL);
  if (!response.ok) {
    throw new Error(`Certificats Google indisponibles (${response.status})`);
  }

  const certs = (await response.json()) as Record<string, string>;
  const maxAge = /max-age=(\d+)/.exec(response.headers.get('cache-control') || '');

  cachedCerts = certs;
  cachedCertsExpireAt = now + (maxAge ? Number(maxAge[1]) * 1000 : CERT_FALLBACK_TTL_MS);
  return certs;
}

function decodeSegment(segment: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
}

export interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
}

export function extractBearerToken(
  headers: Record<string, string | undefined> | undefined
): string | null {
  if (!headers) return null;
  const raw = headers.authorization ?? headers.Authorization;
  if (!raw) return null;
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return match ? match[1].trim() : null;
}

export async function verifyFirebaseIdToken(
  token: string,
  projectId = getFirebaseProjectId()
): Promise<VerifiedFirebaseUser | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const header = decodeSegment(headerB64) as { alg?: string; kid?: string };
    if (header.alg !== 'RS256' || !header.kid) return null;

    const payload = decodeSegment(payloadB64) as {
      aud?: string;
      iss?: string;
      sub?: string;
      exp?: number;
      iat?: number;
      email?: string;
    };

    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.aud !== projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (!payload.sub) return null;
    if (typeof payload.exp !== 'number' || payload.exp <= nowSec - CLOCK_SKEW_SEC) return null;
    if (typeof payload.iat === 'number' && payload.iat > nowSec + CLOCK_SKEW_SEC) return null;

    const certs = await fetchGoogleCerts();
    const certificate = certs[header.kid];
    if (!certificate) return null;

    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    verifier.end();

    if (!verifier.verify(certificate, Buffer.from(signatureB64, 'base64url'))) return null;

    return { uid: payload.sub, email: payload.email };
  } catch (err) {
    console.warn('verifyFirebaseIdToken :', err);
    return null;
  }
}

export type AuthFailure = {
  statusCode: 401;
  body: string;
};

/**
 * Exige un Bearer Firebase ID token valide.
 * Retourne l'utilisateur ou un objet d'échec 401 (à merger avec les headers CORS).
 */
export async function requireFirebaseAuth(
  headers: Record<string, string | undefined> | undefined
): Promise<VerifiedFirebaseUser | AuthFailure> {
  const token = extractBearerToken(headers);
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        error: 'AUTH_REQUIRED',
        message: 'Connecte-toi à ton compte Pure Ascension pour continuer.',
      }),
    };
  }

  const user = await verifyFirebaseIdToken(token);
  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        error: 'AUTH_INVALID',
        message: 'Ta session a expiré. Reconnecte-toi puis réessaie.',
      }),
    };
  }

  return user;
}

export function isAuthFailure(
  value: VerifiedFirebaseUser | AuthFailure
): value is AuthFailure {
  return (value as AuthFailure).statusCode === 401;
}
