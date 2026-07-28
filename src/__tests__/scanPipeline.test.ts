/**
 * Audit de la chaîne réelle du scanner de repas.
 *
 *   npm run test:scan-pipeline
 *
 * Bloc A — vérification des ID tokens Firebase, avec une paire de clés RSA
 *          générée localement (aucun secret du projet n'est utilisé).
 * Bloc B — appel réel à Gemini Vision sur une vraie photo, si GEMINI_API_KEY
 *          est disponible localement. Prouve que modèle + prompt + parsing
 *          produisent bien un repas exploitable.
 */
import { generateKeyPairSync, createSign } from 'crypto';
import fs from 'fs';
import path from 'path';

// ── Chargement .env (valeurs jamais affichées) ───────────────────────────────
function loadEnv(): void {
  const file = path.join(process.cwd(), '.env');
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*([A-Za-z0-9_]+)\s*=\s*([\s\S]*)$/.exec(lines[i]);
    if (!m) continue;
    const key = m[1];
    let value = m[2];
    const quote = value[0] === '"' || value[0] === "'" ? value[0] : null;
    if (quote) {
      value = value.slice(1);
      while (!value.endsWith(quote) && i + 1 < lines.length) {
        i += 1;
        value += `\n${lines[i]}`;
      }
      if (value.endsWith(quote)) value = value.slice(0, -1);
    } else {
      value = value.trim();
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed += 1;
    console.log(`✅ ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed += 1;
    console.log(`❌ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

// ── Bloc A : vérification des ID tokens ──────────────────────────────────────
const TEST_KID = 'audit-key-1';
const PROJECT_ID = 'pure-ascension';

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function signToken(
  payload: Record<string, unknown>,
  opts: { kid?: string; alg?: string; key?: string } = {}
): string {
  const header = { alg: opts.alg ?? 'RS256', kid: opts.kid ?? TEST_KID, typ: 'JWT' };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(opts.key ?? privateKey).toString('base64url')}`;
}

function validPayload(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    aud: PROJECT_ID,
    sub: 'uid-utilisateur-test',
    email: 'audit@pure-ascension.app',
    iat: now - 30,
    exp: now + 3600,
    ...overrides,
  };
}

async function runTokenAudit(): Promise<void> {
  console.log('\n─── BLOC A : vérification des ID tokens Firebase ───\n');

  // Les certificats Google sont remplacés par notre clé publique de test
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    if (String(url).includes('securetoken@system.gserviceaccount.com')) {
      return {
        ok: true,
        headers: { get: () => 'public, max-age=3600' },
        json: async () => ({ [TEST_KID]: publicKey }),
      };
    }
    return realFetch(url as never);
  }) as typeof fetch;

  const { verifyFirebaseIdToken, extractBearerToken } = await import(
    '../../netlify/functions/verify-firebase-token'
  );

  const ok = await verifyFirebaseIdToken(signToken(validPayload()), PROJECT_ID);
  assert(
    'Token valide accepté, uid extrait',
    ok?.uid === 'uid-utilisateur-test',
    ok ? `uid=${ok.uid}` : 'REFUSÉ — les utilisateurs légitimes seraient bloqués'
  );

  const expired = await verifyFirebaseIdToken(
    signToken(validPayload({ exp: Math.floor(Date.now() / 1000) - 4000 })),
    PROJECT_ID
  );
  assert('Token expiré refusé', expired === null);

  const wrongAud = await verifyFirebaseIdToken(
    signToken(validPayload({ aud: 'autre-projet' })),
    PROJECT_ID
  );
  assert('Token d\'un autre projet refusé', wrongAud === null);

  const wrongIss = await verifyFirebaseIdToken(
    signToken(validPayload({ iss: 'https://evil.example.com' })),
    PROJECT_ID
  );
  assert('Émetteur non Google refusé', wrongIss === null);

  const otherKey = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const forged = await verifyFirebaseIdToken(
    signToken(validPayload(), { key: otherKey.privateKey }),
    PROJECT_ID
  );
  assert('Signature forgée refusée', forged === null);

  const unknownKid = await verifyFirebaseIdToken(
    signToken(validPayload(), { kid: 'kid-inconnu' }),
    PROJECT_ID
  );
  assert('Certificat inconnu refusé', unknownKid === null);

  const tampered = (() => {
    const t = signToken(validPayload());
    const [h, p, s] = t.split('.');
    const hacked = b64url(JSON.stringify({ ...validPayload({ sub: 'admin' }) }));
    return `${h}.${hacked}.${s}`;
  })();
  assert('Charge utile modifiée refusée', (await verifyFirebaseIdToken(tampered, PROJECT_ID)) === null);

  assert(
    'En-tête Bearer correctement extrait',
    extractBearerToken({ authorization: 'Bearer abc.def.ghi' }) === 'abc.def.ghi' &&
      extractBearerToken({ Authorization: 'bearer  xyz' }) === 'xyz' &&
      extractBearerToken({}) === null
  );

  globalThis.fetch = realFetch;
}

// ── Bloc B : appel réel à Gemini Vision ──────────────────────────────────────
const REAL_MEAL_PHOTO = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800';

async function runVisionAudit(): Promise<void> {
  console.log('\n─── BLOC B : analyse Gemini Vision réelle ───\n');

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    console.log('⚠️  GEMINI_API_KEY absente en local : bloc B ignoré.');
    return;
  }

  const { callGeminiVision } = await import('../../netlify/functions/meal-scan-core');

  const res = await fetch(REAL_MEAL_PHOTO);
  const buffer = Buffer.from(await res.arrayBuffer());
  console.log(`Photo de test téléchargée : ${Math.round(buffer.byteLength / 1024)} Ko`);

  const started = Date.now();
  const result = await callGeminiVision('image/jpeg', buffer.toString('base64'), apiKey);
  const elapsed = Date.now() - started;

  assert(
    'Gemini Vision retourne un repas exploitable',
    result.type === 'food',
    `type=${result.type} en ${elapsed} ms`
  );

  if (result.type === 'food') {
    const meal = result.meal;
    console.log(`   Plat      : ${meal.name}`);
    console.log(`   Calories  : ${meal.calories} kcal`);
    console.log(`   Macros    : ${meal.proteins}g P / ${meal.carbs}g G / ${meal.fats}g L`);
    console.log(`   Aliments  : ${meal.items?.length ?? 0} détectés`);
    meal.items?.forEach((i) => console.log(`      - ${i.name} (${i.portion})`));

    assert('Calories cohérentes (> 0)', meal.calories > 0, `${meal.calories} kcal`);
    assert(
      'Décomposition en aliments individuels (≥ 3)',
      (meal.items?.length ?? 0) >= 3,
      `${meal.items?.length ?? 0} items`
    );
  }

  // Une image sans nourriture doit être refusée, pas inventée
  const nonFoodRes = await fetch('https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600');
  const nonFoodBuf = Buffer.from(await nonFoodRes.arrayBuffer());
  const nonFood = await callGeminiVision('image/jpeg', nonFoodBuf.toString('base64'), apiKey);
  assert(
    'Image non alimentaire correctement rejetée',
    nonFood.type === 'non_food',
    `type=${nonFood.type}`
  );
}

(async () => {
  await runTokenAudit();
  await runVisionAudit();

  console.log(`\n=== BILAN : ${passed} réussis, ${failed} échecs ===\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
