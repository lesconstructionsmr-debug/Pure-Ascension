import { Handler } from '@netlify/functions';
import * as admin from 'firebase-admin';

// ─── Firebase Admin Init ─────────────────────────────────────────────────────
if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim();

    while (
      privateKey.startsWith('"') || privateKey.endsWith('"') ||
      privateKey.startsWith("'") || privateKey.endsWith("'") ||
      privateKey.endsWith(',')
    ) {
      if (privateKey.endsWith(','))  privateKey = privateKey.slice(0, -1).trim();
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1).trim();
      if (privateKey.startsWith("'") && privateKey.endsWith("'")) privateKey = privateKey.slice(1, -1).trim();
    }
    privateKey = privateKey.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
    }
  } catch (err) {
    console.error('Erreur Firebase Admin chat-coach :', err);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

// ─── Limites de messages par plan ───────────────────────────────────────────
const DAILY_LIMITS: Record<string, number> = {
  free:     3,
  standard: 10,
  premium:  30,
};

// ─── Base de connaissances V9 Master (prompt système) ────────────────────────
const SYSTEM_PROMPT = `Tu es le Coach IA Nutrition & Vitalité de l'application Pure Ascension.
Tu es expert en nutrition holistique et entraînement sportif, formé sur la base de connaissances V9 Master rédigée par des experts seniors en nutrition.

## Ta philosophie de coaching :
- Tu utilises une approche bienveillante, directe et basée sur des principes nutritionnels éprouvés.
- Tu rappelles toujours le "WHY profond" de l'utilisateur pour ancrer sa motivation lorsqu'il exprime de la démotivation.
- Tu adaptes systématiquement tes conseils au profil de l'utilisateur (sport, restrictions alimentaires, symptômes).

## Tes protocoles de nutrition holistique (V9 Master) :
1. **DET (Dépense Énergétique Totale)** = MB + NEAT + EAT + TEF
2. **Reset Métabolique 14 jours** : Élimination gluten, produits laitiers, sucres raffinés, alcool pour restaurer l'insuline.
3. **Hypochlorhydrie** : 1 c. à table de vinaigre de cidre de pomme dilué 10-15 min avant les repas principaux.
4. **Leaky Gut** : L-Glutamine + bouillons d'os/collagène au réveil, éviction des ultra-transformés.
5. **Mastication parasympathique** : 20 à 30 mastications par bouchée, sans écrans, en état de calme.
6. **Zones cardiaques FC** : Z2 (60-70%), Z3 (70-80%), Z4 (80-90%), Z5 (90-100%). FC Max cyclisme = 220 - âge - 5.
7. **Tempo 2010** : 2s descente excentrique, 0s bas, 1s montée concentrique, 0s haut — pour tous les mouvements de résistance.
8. **Architecture hormonale** : Repas du soir = 50% légumes colorés + 25% protéines + 25% glucides complexes.
9. **Hydratation** : 3 litres d'eau minimum par jour pour le transit et l'élimination hépatique.

## Protocoles Marathon & Endurance :
- **Zone 2 (80% du volume)** : Endurance fondamentale — brûle les graisses, épargne le glycogène.
- **Zone 5 (Fractionné VMA)** : 8x400m — améliore le VO2max.
- **Zone 4 (Tempo Run)** : 20-30 min au seuil — repousse le mur du lactate.
- **Nutrition intra-effort** : 60-90g glucides/heure au-delà de 75 min. Électrolytes (Na, Mg) toutes les 20 min.
- **Recharge glycogénique** : 3 jours pré-course, glucides complexes 60-65% des apports. Limiter les fibres.
- **Prévention digestive** : Éviter fibres et graisses dans les 3h avant l'effort.
- **Renforcement spécifique course** : Hip thrust unilatéral, mollets excentriques, gainage latéral.

## Style de communication :
- Réponds toujours en français.
- Sois précis, pratique et factuel.
- Si une question dépasse ton champ (médecine, diagnostic), rappelle de consulter un professionnel.
- Limite tes réponses à 3-5 paragraphes maximum.`;

// ─── Handler ─────────────────────────────────────────────────────────────────
export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };

  try {
    const { messages, userProfile, uid } = JSON.parse(event.body || '{}');

    if (!messages || !Array.isArray(messages)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Le champ "messages" est requis.' }) };
    }

    // ── Vérification et gestion des crédits par utilisateur ──────────────────
    if (uid && db) {
      const todayStr = new Date().toISOString().split('T')[0]; // ex: "2026-07-13"
      const userRef = db.collection('users').doc(uid);
      const userSnap = await userRef.get();
      const userData = userSnap.data() || {};

      const plan: string = userData.plan || 'free';
      const limit = DAILY_LIMITS[plan] ?? DAILY_LIMITS.free;

      const lastResetDate: string = userData.aiMessagesResetDate || '';
      const usedToday: number = lastResetDate === todayStr ? (userData.aiMessagesUsedToday || 0) : 0;

      console.log(`Utilisateur ${uid} (${plan}): ${usedToday}/${limit} messages aujourd'hui`);

      // Si la limite est atteinte → répondre sans appeler Gemini
      if (usedToday >= limit) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({
            error: 'LIMIT_REACHED',
            used: usedToday,
            limit,
            plan,
            resetAt: 'minuit ce soir',
          }),
        };
      }

      // Incrémenter le compteur avant l'appel Gemini
      await userRef.update({
        aiMessagesUsedToday: usedToday + 1,
        aiMessagesResetDate: todayStr,
      });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
    if (!GEMINI_API_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Clé API Gemini manquante.' }) };
    }

    // ── Contexte utilisateur personnalisé ─────────────────────────────────────
    let userContext = '';
    if (userProfile) {
      userContext = `\n\n## Profil de l'utilisateur :
- Objectif principal : ${userProfile.mainGoal || 'non défini'}
- Sport cardio favori : ${userProfile.cardioSport || 'général'}
- Expérience : ${userProfile.experience || 'intermédiaire'}
- WHY profond : "${userProfile.deepWhy || 'non renseigné'}"
- Symptômes digestifs : ${userProfile.digestiveSymptoms?.join(', ') || 'aucun'}
- Restrictions alimentaires : ${userProfile.dietaryRestrictions?.join(', ') || 'aucune'}`;
    }

    const systemInstruction = SYSTEM_PROMPT + userContext;

    const geminiMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // ── Appel Gemini ──────────────────────────────────────────────────────────
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: geminiMessages,
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
        }),
      }
    );

    if (!response.ok) {
      console.error('Erreur API Gemini :', await response.text());
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Erreur génération IA.' }) };
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Je n\'ai pas pu générer de réponse.';

    return { statusCode: 200, headers, body: JSON.stringify({ reply }) };

  } catch (error: any) {
    console.error('Erreur chat-coach :', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Erreur interne.' }) };
  }
};
