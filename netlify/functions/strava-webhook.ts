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
    }
  } catch (error) {
    console.error('Erreur Firebase Admin webhook Strava :', error);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

// Fonction utilitaire pour rafraîchir le token Strava si nécessaire
async function refreshStravaToken(uid: string, refreshToken: string): Promise<string | null> {
  try {
    const clientId = process.env.STRAVA_CLIENT_ID || '';
    const clientSecret = process.env.STRAVA_CLIENT_SECRET || '';

    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      console.error('Erreur rafraîchissement token Strava API :', await res.text());
      return null;
    }

    const data = await res.json();
    const { access_token, refresh_token: newRefreshToken, expires_at } = data;

    if (db) {
      await db.collection('users').doc(uid).update({
        stravaAccessToken: access_token,
        stravaRefreshToken: newRefreshToken || refreshToken,
        stravaTokenExpiresAt: expires_at,
      });
    }

    return access_token;
  } catch (err) {
    console.error('Erreur globale rafraîchissement token Strava :', err);
    return null;
  }
}

export const handler: Handler = async (event) => {
  // 1. Gérer la validation d'abonnement Strava (GET)
  if (event.httpMethod === 'GET') {
    const mode = event.queryStringParameters?.['hub.mode'];
    const token = event.queryStringParameters?.['hub.verify_token'];
    const challenge = event.queryStringParameters?.['hub.challenge'];

    const verifyToken = process.env.STRAVA_VERIFY_TOKEN || 'pure_ascension_secret';

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook Strava validé avec succès !');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'hub.challenge': challenge }),
      };
    }

    return { statusCode: 403, body: 'Non autorisé' };
  }

  // 2. Gérer la réception des événements d'activités (POST)
  if (event.httpMethod === 'POST') {
    try {
      const payload = JSON.parse(event.body || '{}');
      console.log('Webhook Strava reçu :', payload);

      const { object_type, aspect_type, object_id, owner_id } = payload;

      // On s'intéresse uniquement à la création d'activités
      if (object_type === 'activity' && aspect_type === 'create' && db) {
        // Trouver l'utilisateur Firestore correspondant à cet ID Athlète Strava
        const userQuery = await db.collection('users')
          .where('stravaAthleteId', '==', owner_id)
          .limit(1)
          .get();

        if (userQuery.empty) {
          console.warn(`Aucun utilisateur trouvé pour l'athlète Strava ${owner_id}`);
          return { statusCode: 200, body: 'OK' }; // Toujours répondre 200 à Strava pour éviter les re-tentatives
        }

        const userDoc = userQuery.docs[0];
        const uid = userDoc.id;
        const userData = userDoc.data();

        let accessToken = userData.stravaAccessToken;
        const expiresAt = userData.stravaTokenExpiresAt;
        const refreshToken = userData.stravaRefreshToken;

        // Vérifier si le token est expiré (avec une marge de 5 min)
        if (expiresAt && expiresAt - 300 < Date.now() / 1000 && refreshToken) {
          console.log(`Token Strava expiré pour ${uid}, rafraîchissement en cours...`);
          const refreshed = await refreshStravaToken(uid, refreshToken);
          if (refreshed) {
            accessToken = refreshed;
          }
        }

        if (!accessToken) {
          console.error(`Token d'accès Strava introuvable pour ${uid}`);
          return { statusCode: 200, body: 'OK' };
        }

        // Récupérer le détail de l'activité depuis l'API Strava
        console.log(`Récupération de l'activité Strava ${object_id} pour ${uid}...`);
        const activityRes = await fetch(`https://www.strava.com/api/v3/activities/${object_id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!activityRes.ok) {
          console.error(`Erreur récupération activité ${object_id} :`, await activityRes.text());
          return { statusCode: 200, body: 'OK' };
        }

        const activity = await activityRes.json();
        const {
          name, type, moving_time, distance, average_heartrate,
          calories, total_elevation_gain, start_date,
        } = activity;

        console.log(`Activité : ${name} (${type}) - FC: ${average_heartrate} bpm - Cal: ${calories}`);

        const todayStr = new Date().toISOString().split('T')[0];

        // ── Construire l'objet activité normalisé ───────────────────────
        const activityObj = {
          stravaId: object_id,
          name,
          type,
          distance: distance || 0,          // mètres
          movingTime: moving_time || 0,      // secondes
          totalElevation: total_elevation_gain || 0,
          averageHeartrate: average_heartrate || null,
          calories: calories || 0,
          startDate: start_date || new Date().toISOString(),
        };

        // ── Sauvegarder dans la sous-collection strava_activities ───────
        await db.collection('users').doc(uid)
          .collection('strava_activities').doc(String(object_id)).set({
            ...activityObj,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });

        // ── Récupérer les 10 dernières activités pour l'affichage rapide ─
        const recentSnap = await db.collection('users').doc(uid)
          .collection('strava_activities')
          .orderBy('startDate', 'desc')
          .limit(10)
          .get();

        const lastActivities = recentSnap.docs.map(d => {
          const dd = d.data();
          return {
            name: dd.name, type: dd.type, distance: dd.distance,
            movingTime: dd.movingTime, totalElevation: dd.totalElevation,
            averageHeartrate: dd.averageHeartrate, calories: dd.calories,
            startDate: dd.startDate,
          };
        });

        // ── Calculer EAT du jour (somme des calories des activités du jour) ─
        const todayActivities = lastActivities.filter(a =>
          a.startDate?.startsWith(todayStr)
        );
        const stravaTodayEAT = todayActivities.reduce((sum, a) => sum + (a.calories || 0), 0);

        // ── Mettre à jour le doc utilisateur (accès rapide pour l'UI) ──
        await db.collection('users').doc(uid).update({
          stravaLastActivities: lastActivities,
          stravaLastSyncAt: new Date().toISOString(),
          stravaTodayEAT,
        });

        console.log(`✅ Strava sync OK — ${uid} · EAT today: ${stravaTodayEAT} kcal`);
      }

      return { statusCode: 200, body: 'OK' };
    } catch (err) {
      console.error('Erreur traitement webhook Strava :', err);
      return { statusCode: 500, body: 'Internal Error' };
    }
  }

  return { statusCode: 405, body: 'Méthode non autorisée' };
};
