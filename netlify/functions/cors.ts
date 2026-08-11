/**
 * CORS allowlist for Netlify Functions.
 * Native apps (no Origin) do not need ACAO — CORS is browser-only.
 */
const DEFAULT_ALLOWED = [
  'https://pure-ascension.ca',
  'https://www.pure-ascension.ca',
  'https://pure-ascension.netlify.app',
];

function extraAllowedFromEnv(): string[] {
  const raw = (process.env.CORS_ALLOWED_ORIGINS || '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;
  const allowed = [...DEFAULT_ALLOWED, ...extraAllowedFromEnv()];
  if (allowed.includes(origin)) return true;
  // Deploy previews Netlify : https://deploy-preview-N--pure-ascension.netlify.app
  if (/^https:\/\/[a-z0-9-]+--pure-ascension\.netlify\.app$/i.test(origin)) return true;
  // Dev local
  if (
    process.env.CONTEXT === 'dev' ||
    process.env.NETLIFY_DEV === 'true' ||
    process.env.NODE_ENV === 'development'
  ) {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  }
  return false;
}

export function getRequestOrigin(
  headers: Record<string, string | undefined> | undefined
): string {
  if (!headers) return '';
  return (headers.origin || headers.Origin || '').trim();
}

/**
 * Build CORS headers for a function response.
 * Reflects the request Origin only when allowlisted.
 */
export function buildCorsHeaders(
  headers: Record<string, string | undefined> | undefined,
  extra: Record<string, string> = {}
): Record<string, string> {
  const origin = getRequestOrigin(headers);
  const cors: Record<string, string> = {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, stripe-signature',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
    ...extra,
  };

  if (origin && isOriginAllowed(origin)) {
    cors['Access-Control-Allow-Origin'] = origin;
    cors['Vary'] = 'Origin';
  }

  return cors;
}
