import { Handler } from '@netlify/functions';
import * as admin from 'firebase-admin';

// Initialiser Firebase Admin
if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim();

    while (
      privateKey.startsWith('"') || 
      privateKey.endsWith('"') || 
      privateKey.startsWith("'") || 
      privateKey.endsWith("'") || 
      privateKey.endsWith(',')
    ) {
      if (privateKey.endsWith(',')) {
        privateKey = privateKey.slice(0, -1).trim();
      }
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1).trim();
      }
      if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
        privateKey = privateKey.slice(1, -1).trim();
      }
    }
    
    privateKey = privateKey.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('Firebase Admin initialisé avec succès dans strava-callback.');
    } else {
      console.warn('Configuration Firebase Admin incomplète pour strava-callback.');
    }
  } catch (error) {
    console.error('Erreur d\'initialisation Firebase Admin dans strava-callback :', error);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

export const handler: Handler = async (event) => {
  const code = event.queryStringParameters?.code;
  const uid = event.queryStringParameters?.state; // Notre UID Firebase transmis en state

  // Redirection de base à partir du Referer ou utiliser un fallback
  const referer = event.headers.referer || 'https://pure-ascension.netlify.app/';
  const url = new URL(referer);
  const baseUrl = `${url.protocol}//${url.host}`;

  if (!code || !uid) {
    console.error('Code Strava ou UID manquant.', { code, uid });
    return {
      statusCode: 302,
      headers: {
        Location: `${baseUrl}/?strava=error&msg=missing_params`,
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
          Location: `${baseUrl}/?strava=error&msg=exchange_failed`,
        },
        body: '',
      };
    }

    const data = await response.json();
    const { access_token, refresh_token, expires_at, athlete } = data;

    if (db) {
      // Sauvegarder les jetons d'accès Strava dans Firestore
      await db.collection('users').doc(uid).update({
        stravaConnected: true,
        stravaAccessToken: access_token,
        stravaRefreshToken: refresh_token,
        stravaTokenExpiresAt: expires_at,
        stravaAthleteId: athlete?.id || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Tokens Strava sauvegardés avec succès pour l'utilisateur ${uid}.`);
    } else {
      console.error('Firestore inaccessible pour enregistrer les tokens Strava.');
      return {
        statusCode: 302,
        headers: {
          Location: `${baseUrl}/?strava=error&msg=database_inaccessible`,
        },
        body: '',
      };
    }

    return {
      statusCode: 302,
      headers: {
        Location: `${baseUrl}/?strava=success`,
      },
      body: '',
    };
  } catch (error: any) {
    console.error('Erreur globale strava-callback :', error);
    return {
      statusCode: 302,
      headers: {
        Location: `${baseUrl}/?strava=error&msg=internal_error`,
      },
      body: '',
    };
  }
};
