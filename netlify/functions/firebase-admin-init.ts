/**
 * Initialisation Firebase Admin — variables d'environnement uniquement.
 * Ne jamais charger de serviceAccountKey.json (fuite / bundling).
 */
import * as admin from 'firebase-admin';

export function getFirestoreDb(): admin.firestore.Firestore {
  if (!admin.apps.length) {
    const projectId = (process.env.FIREBASE_PROJECT_ID || 'pure-ascension').trim();
    const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
    let privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim();
    privateKey = privateKey.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
      throw new Error(
        'Firebase Admin : FIREBASE_CLIENT_EMAIL et FIREBASE_PRIVATE_KEY requis (Netlify env).'
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return admin.firestore();
}

export { admin };
