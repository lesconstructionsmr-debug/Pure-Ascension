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
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Si appel GET pour synchronisation manuelle
  if (event.httpMethod === 'GET') {
    const uid = event.queryStringParameters?.uid || 'guest';
    const mockData = {
      steps: Math.floor(5800 + Math.random() * 1200),
      activeKcal: Math.floor(390 + Math.random() * 80),
      heartRate: Math.floor(66 + Math.random() * 10),
      sleepHours: 7.4,
    };
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, uid, data: mockData }),
    };
  }

  // Push Webhook Garmin Connect
  try {
    const payload = JSON.parse(event.body || '{}');
    console.log('✓ Push Webhook Garmin reçu:', payload);

    if (payload.userId && payload.dailies) {
      const db = getFirestoreDb();
      const todayKey = new Date().toISOString().split('T')[0];
      await db.collection('users').doc(payload.userId).collection('dailyProgress').doc(todayKey).set({
        garminData: payload.dailies,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'ok', message: 'Webhook Garmin reçu avec succès.' }),
    };
  } catch (err: any) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
