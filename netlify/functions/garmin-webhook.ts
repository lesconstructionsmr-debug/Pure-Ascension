import { Handler } from '@netlify/functions';
import { admin, getFirestoreDb } from './firebase-admin-init';
import { buildCorsHeaders } from './cors';

export const handler: Handler = async (event) => {
  const headers = buildCorsHeaders(event.headers as Record<string, string | undefined>);

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
