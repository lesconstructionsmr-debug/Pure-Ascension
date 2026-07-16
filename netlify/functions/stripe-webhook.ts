import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';

// Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

// Initialiser Firebase Admin
if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    
    let privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim();
    
    console.log('--- DEBUG FIREBASE KEY ---');
    console.log('Original Env Key Length:', (process.env.FIREBASE_PRIVATE_KEY || '').length);
    console.log('Original Env Key Starts With:', (process.env.FIREBASE_PRIVATE_KEY || '').substring(0, 35));
    
    // Nettoyage en boucle pour retirer les guillemets et virgules résiduels du copier-coller JSON
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
      if (privateKey.startsWith('"')) privateKey = privateKey.slice(1).trim();
      if (privateKey.endsWith('"')) privateKey = privateKey.slice(0, -1).trim();
      if (privateKey.startsWith("'")) privateKey = privateKey.slice(1).trim();
      if (privateKey.endsWith("'")) privateKey = privateKey.slice(0, -1).trim();
    }
    
    // Remplacer les sauts de ligne échappés
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    console.log('Cleaned Key Length:', privateKey.length);
    console.log('Cleaned Key Starts With:', privateKey.substring(0, 35));
    console.log('Cleaned Key Ends With:', privateKey.substring(privateKey.length - 35));
    console.log('--------------------------');

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('✓ Firebase Admin initialisé avec succès.');
    } else {
      console.warn('⚠️ Firebase Admin non initialisé : variables d\'environnement manquantes.');
    }
  } catch (error) {
    console.error('Erreur d\'initialisation Firebase Admin :', error);
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Méthode non autorisée. Utilisez POST.' }),
    };
  }

  const sig = event.headers['stripe-signature'] || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let stripeEvent: Stripe.Event;

  try {
    // Gérer l'encodage base64 automatique de Netlify/AWS Lambda pour le corps brut
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : event.body || '';

    // Vérifier la validité de l'événement Stripe
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Erreur de validation de signature Stripe : ${err.message}`);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  console.log(`Receiving Stripe webhook event: ${stripeEvent.type}`);

  try {
    const db = admin.firestore();

    // 1. Session de paiement complétée (Abonnement initial réussi)
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object as Stripe.Checkout.Session;
      const uid = session.client_reference_id;
      const subscriptionId = session.subscription as string;

      if (!uid) {
        console.warn('⚠️ Aucun client_reference_id (uid) trouvé dans la session de checkout.');
        return { statusCode: 200, body: 'Ignored: No client_reference_id' };
      }

      // Extraire le planLevel directement depuis les métadonnées de la session de checkout (évite l'appel réseau listLineItems)
      const planLevel = session.metadata?.planLevel || 'free';
      const isPremium = planLevel === 'premium';

      console.log(`Activation de l'abonnement pour l'utilisateur ${uid} - Plan: ${planLevel} (Subscription: ${subscriptionId})`);

      // Mettre à jour l'utilisateur dans Firestore
      await db.collection('users').doc(uid).set({
        stripe_subscription_status: 'active',
        stripe_subscription_id: subscriptionId,
        planLevel,
        isPremium,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log(`✓ Firestore mis à jour pour l'utilisateur ${uid}`);
    }

    // 2. Abonnement mis à jour (changement de plan, renouvellement, etc.)
    if (stripeEvent.type === 'customer.subscription.updated') {
      const subscription = stripeEvent.data.object as Stripe.Subscription;
      const subscriptionId = subscription.id;
      const status = subscription.status; // active, trialing, past_due, canceled, unpaid

      // Trouver l'utilisateur par son stripe_subscription_id dans Firestore
      const userSnap = await db.collection('users')
        .where('stripe_subscription_id', '==', subscriptionId)
        .limit(1)
        .get();

      if (userSnap.empty) {
        console.warn(`⚠️ Aucun utilisateur trouvé avec l'abonnement ${subscriptionId}`);
        return { statusCode: 200, body: 'Ignored: Subscription owner not found' };
      }

      const userDoc = userSnap.docs[0];
      const uid = userDoc.id;

      const priceId = subscription.items.data[0]?.price?.id;
      let planLevel = 'free';
      let isPremium = false;

      if (status === 'active' || status === 'trialing') {
        if (priceId === process.env.STRIPE_PRICE_STANDARD) {
          planLevel = 'standard';
        } else if (priceId === process.env.STRIPE_PRICE_PREMIUM) {
          planLevel = 'premium';
          isPremium = true;
        }
      }

      console.log(`Mise à jour de l'abonnement pour l'utilisateur ${uid} - Nouveau statut Stripe: ${status} - Plan: ${planLevel}`);

      await db.collection('users').doc(uid).set({
        stripe_subscription_status: status,
        planLevel,
        isPremium,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    // 3. Abonnement supprimé / expiré
    if (stripeEvent.type === 'customer.subscription.deleted') {
      const subscription = stripeEvent.data.object as Stripe.Subscription;
      const subscriptionId = subscription.id;

      // Trouver l'utilisateur par son stripe_subscription_id
      const userSnap = await db.collection('users')
        .where('stripe_subscription_id', '==', subscriptionId)
        .limit(1)
        .get();

      if (!userSnap.empty) {
        const userDoc = userSnap.docs[0];
        const uid = userDoc.id;

        console.log(`Résiliation de l'abonnement pour l'utilisateur ${uid}`);

        await db.collection('users').doc(uid).set({
          stripe_subscription_status: 'inactive',
          planLevel: 'free',
          isPremium: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error: any) {
    console.error('Erreur lors du traitement du webhook Stripe :', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Erreur interne du serveur.' }),
    };
  }
};
