/**
 * Audit end-to-end du scanner de repas en production.
 * Ne journalise aucun secret : uniquement présence/absence, statuts HTTP et réponses.
 *
 *   node scratch/audit-scan-meal.js
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// ── Chargement .env minimal (pas de dépendance dotenv) ──────────────────────
function loadEnv() {
  const file = path.join(__dirname, '..', '.env');
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
      // Valeur multi-lignes (clé privée PEM) : consommer jusqu'au guillemet fermant
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

const WEB_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'pure-ascension';
const BASE_URL = (process.argv[2] || 'https://pure-ascension.netlify.app').replace(/\/$/, '');
const ENDPOINT = `${BASE_URL}/.netlify/functions/scan-meal`;
const TEST_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800';

function line(label, value) {
  console.log(`${label.padEnd(38)} ${value}`);
}

/**
 * Remet une clé PEM en forme : séquences \n littérales, guillemets résiduels,
 * ou corps base64 sur une seule ligne (cas fréquent d'un copier-coller .env).
 */
function normalizePem(raw) {
  let key = (raw || '').trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
  if (key.includes('\n')) return key;

  const m = /-----BEGIN ([A-Z ]+)-----(.*)-----END \1-----/.exec(key);
  if (!m) return key;

  const body = m[2].replace(/\s+/g, '');
  const chunks = body.match(/.{1,64}/g) || [];
  return `-----BEGIN ${m[1]}-----\n${chunks.join('\n')}\n-----END ${m[1]}-----\n`;
}

function pemDiagnostics(key) {
  line('  longueur', `${key.length} caractères`);
  line('  en-tête BEGIN présent', key.includes('-----BEGIN') ? 'oui' : 'NON');
  line('  pied END présent', key.includes('-----END') ? 'oui' : 'NON');
  line('  nombre de sauts de ligne', String((key.match(/\n/g) || []).length));
}

async function mintIdToken() {
  // Env uniquement — ne jamais charger serviceAccountKey.json
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePem(process.env.FIREBASE_PRIVATE_KEY);

  if (!clientEmail || !privateKey) {
    line('Source des identifiants', 'MANQUANT — FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY');
    return null;
  }
  line('Source des identifiants', 'variables d\'environnement');

  line('Clé privée après normalisation', 'analyse structurelle :');
  pemDiagnostics(privateKey);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId: PROJECT_ID, clientEmail, privateKey }),
    });
  }

  const customToken = await admin.auth().createCustomToken('audit-scanner-bot');
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${WEB_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    line('Échange custom token → ID token', `ÉCHEC ${res.status} ${JSON.stringify(data).slice(0, 200)}`);
    return null;
  }
  return data.idToken;
}

/**
 * Voie de repli : création d'un compte jetable via l'API publique Firebase,
 * exactement comme le ferait l'application. Le compte est supprimé en fin d'audit.
 */
async function signUpThrowawayUser() {
  const email = `audit+${Date.now()}@pure-ascension.test`;
  const password = `Audit!${Math.random().toString(36).slice(2, 12)}`;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${WEB_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    line('Création compte de test', `ÉCHEC ${res.status} ${data?.error?.message || ''}`);
    return null;
  }
  line('Compte de test créé', email);
  return data.idToken;
}

async function deleteThrowawayUser(idToken) {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${WEB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    line('Suppression compte de test', res.ok ? 'effectuée' : `échec HTTP ${res.status}`);
  } catch (err) {
    line('Suppression compte de test', `échec ${err.message}`);
  }
}

async function callScan(label, headers, body) {
  const started = Date.now();
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const ms = Date.now() - started;

  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* réponse non JSON */ }

  line(label, `HTTP ${res.status} en ${ms} ms`);
  if (parsed?.success) {
    line('  source IA', parsed.source);
    line('  plat détecté', parsed.mealName || parsed.meal?.name);
    line('  calories', parsed.totalCalories ?? parsed.meal?.calories);
    line('  nb aliments détectés', Array.isArray(parsed.items) ? parsed.items.length : 0);
    if (Array.isArray(parsed.items)) {
      parsed.items.forEach((i) => console.log(`      - ${i.name} (${i.portion})`));
    }
  } else {
    line('  code', parsed?.code || '(aucun)');
    line('  message', (parsed?.message || text).slice(0, 220));
  }
  console.log('');
  return { status: res.status, parsed };
}

/** Génère un JPEG synthétique volumineux pour tester la limite de taille. */
function bigJpegDataUrl(approxMb) {
  const bytes = Math.round(approxMb * 1024 * 1024);
  const buf = Buffer.alloc(bytes, 0x41);
  buf[0] = 0xff; buf[1] = 0xd8; buf[2] = 0xff; buf[3] = 0xe0;
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

(async () => {
  console.log('\n=== AUDIT SCANNER DE REPAS — PRODUCTION ===\n');
  line('Endpoint', ENDPOINT);
  line('Projet Firebase', PROJECT_ID);
  line('FIREBASE_CLIENT_EMAIL local', process.env.FIREBASE_CLIENT_EMAIL ? 'présent' : 'ABSENT');
  line('FIREBASE_PRIVATE_KEY local', process.env.FIREBASE_PRIVATE_KEY ? 'présent' : 'ABSENT');
  console.log('');

  console.log('--- 1. Sans token (doit être refusé) ---');
  await callScan('POST sans Authorization', {}, { imageUrl: TEST_IMAGE });

  console.log('--- 2. Token invalide (doit être refusé) ---');
  await callScan('POST token bidon', { Authorization: 'Bearer aaa.bbb.ccc' }, { imageUrl: TEST_IMAGE });

  console.log('--- 3. Token Firebase valide (doit analyser) ---');
  let idToken = null;
  let throwaway = false;
  try {
    idToken = await mintIdToken();
  } catch (err) {
    line('Compte de service', `inutilisable (${err.message.slice(0, 60)}…)`);
  }

  if (!idToken) {
    idToken = await signUpThrowawayUser();
    throwaway = !!idToken;
  }

  if (!idToken) {
    console.log('Impossible de forger un ID token : test authentifié non concluant.\n');
    process.exit(1);
  }

  line('ID token forgé', `oui (${idToken.length} caractères)`);
  console.log('');
  const auth = { Authorization: `Bearer ${idToken}` };

  const real = await callScan('POST image réelle (URL)', auth, { imageUrl: TEST_IMAGE });

  console.log('--- 4. Image non alimentaire (doit répondre NOT_FOOD) ---');
  await callScan(
    'POST image non alimentaire',
    auth,
    { imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800' }
  );

  console.log('--- 5. Image trop volumineuse (doit répondre IMAGE_TOO_LARGE) ---');
  await callScan('POST image 6 Mo', auth, { imageBase64: bigJpegDataUrl(6) });

  if (throwaway) {
    console.log('--- Nettoyage ---');
    await deleteThrowawayUser(idToken);
    console.log('');
  }

  console.log('=== VERDICT ===');
  console.log(
    real.parsed?.success && real.parsed?.source === 'gemini'
      ? 'Chaîne complète OPÉRATIONNELLE : auth + Gemini Vision + parsing.'
      : 'Chaîne EN ÉCHEC sur le cas nominal — voir le bloc 3 ci-dessus.'
  );
  console.log('');
})();
