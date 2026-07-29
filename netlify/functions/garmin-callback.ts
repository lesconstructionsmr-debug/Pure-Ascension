import { Handler } from '@netlify/functions';
import * as admin from 'firebase-admin';

function getFirestoreDb(): admin.firestore.Firestore {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'pure-ascension';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
    let privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim().replace(/\\n/g, '\n');

    if (clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      admin.initializeApp({ projectId });
    }
  }
  return admin.firestore();
}

export const handler: Handler = async (event) => {
  const oauthToken = event.queryStringParameters?.oauth_token;
  const oauthVerifier = event.queryStringParameters?.oauth_verifier;
  const uid = event.queryStringParameters?.uid || 'user_garmin';

  if (!oauthToken || !oauthVerifier) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Jeton OAuth Garmin manquant.' }),
    };
  }

  try {
    const db = getFirestoreDb();
    await db.collection('users').doc(uid).collection('integrations').doc('garmin').set({
      connected: true,
      oauthToken,
      oauthVerifier,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: `<html><body style="font-family:sans-serif;text-align:center;padding:50px;">
        <h2>✓ Garmin Connect connecté à Pure Ascension !</h2>
        <p>Vous pouvez fermer cette fenêtre et retourner dans l'application.</p>
      </body></html>`,
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
