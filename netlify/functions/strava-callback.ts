import { Handler } from '@netlify/functions';
import * as admin from 'firebase-admin';

// Initialiser Firebase Admin avec le fichier serviceAccountKey.json pour éviter les erreurs d'env vars 4KB
function getFirestoreDb(): admin.firestore.Firestore | null {
  if (admin.apps.length) {
    return admin.firestore();
  }

  try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin initialisé avec succès dans strava-callback via serviceAccountKey.json.');
    return admin.firestore();
  } catch (err: any) {
    console.error('Erreur chargement serviceAccountKey dans strava-callback :', err.message);

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim();

    if (projectId && clientEmail && privateKey) {
      try {
        privateKey = privateKey.replace(/\\n/g, '\n');
        admin.initializeApp({
          credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        });
        return admin.firestore();
      } catch (e: any) {
        console.error('Erreur fallback env vars strava-callback :', e.message);
      }
    }
  }

  return null;
}

export const handler: Handler = async (event) => {
  let baseUrl = 'https://pure-ascension.netlify.app';
  try {
    const referer = event.headers.referer || event.headers.Referer;
    if (referer) {
      const parsed = new URL(referer);
      baseUrl = `${parsed.protocol}//${parsed.host}`;
    }
  } catch (e) {
    console.warn('Referer invalide dans strava-callback, utilisation du fallback https://pure-ascension.netlify.app');
  }

  const code = event.queryStringParameters?.code;
  const rawState = event.queryStringParameters?.state || ''; // State transmis : uid ou uid:native
  const [uid, appType] = rawState.split(':');
  const isNative = appType === 'native';

  const getRedirectUrl = (status: 'success' | 'error', msg?: string) => {
    if (isNative) {
      return `pureascension://?strava=${status}${msg ? `&msg=${msg}` : ''}`;
    }
    return `${baseUrl}/?strava=${status}${msg ? `&msg=${msg}` : ''}`;
  };

  if (!code || !uid) {
    console.error('Code Strava ou UID manquant.', { code, uid });
    return {
      statusCode: 302,
      headers: {
        Location: getRedirectUrl('error', 'missing_params'),
      },
      body: '',
    };
  }

  try {
    const clientId = process.env.STRAVA_CLIENT_ID || '';
    const clientSecret = process.env.STRAVA_CLIENT_SECRET || '';

    console.log(`Échange du code Strava pour l'utilisateur ${uid}...`);

    // Appeler l'API Strava pour échanger le code d'autorisation contre les tokens
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur échange token Strava :', errorText);
      return {
        statusCode: 302,
        headers: {
          Location: getRedirectUrl('error', 'exchange_failed'),
        },
        body: '',
      };
    }

    const data = await response.json();
    const { access_token, refresh_token, expires_at, athlete } = data;

    const db = getFirestoreDb();
    if (db) {
      // Sauvegarder les jetons d'accès Strava dans Firestore
      await db.collection('users').doc(uid).set({
        stravaConnected: true,
        stravaAccessToken: access_token,
        stravaRefreshToken: refresh_token,
        stravaTokenExpiresAt: expires_at,
        stravaAthleteId: athlete?.id || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      console.log(`Tokens Strava sauvegardés avec succès pour l'utilisateur ${uid}.`);
    } else {
      console.error('Firestore inaccessible pour enregistrer les tokens Strava.');
      return {
        statusCode: 302,
        headers: {
          Location: getRedirectUrl('error', 'database_inaccessible'),
        },
        body: '',
      };
    }

    return {
      statusCode: 302,
      headers: {
        Location: getRedirectUrl('success'),
      },
      body: '',
    };
  } catch (error: any) {
    console.error('Erreur globale strava-callback :', error);
    return {
      statusCode: 302,
      headers: {
        Location: getRedirectUrl('error', 'internal_error'),
      },
      body: '',
    };
  }
};
