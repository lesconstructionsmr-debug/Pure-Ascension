import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { admin, getFirestoreDb } from './firebase-admin-init';

// Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

/**
 * Recherche l'utilisateur dans Firestore par stripeSubscriptionId ou stripeCustomerId
 */
async function findUserRef(
  db: admin.firestore.Firestore,
  subscriptionId?: string | null,
  customerId?: string | null
): Promise<admin.firestore.DocumentReference | null> {
  if (subscriptionId) {
    // 1. Recherche par stripeSubscriptionId
    let userSnap = await db.collection('users')
      .where('stripeSubscriptionId', '==', subscriptionId)
      .limit(1)
      .get();

    if (!userSnap.empty) return userSnap.docs[0].ref;

    // 2. Recherche fallback par stripe_subscription_id (snake_case)
    userSnap = await db.collection('users')
      .where('stripe_subscription_id', '==', subscriptionId)
      .limit(1)
      .get();

    if (!userSnap.empty) return userSnap.docs[0].ref;
  }

  if (customerId) {
    // 3. Recherche fallback par stripeCustomerId
    let userSnap = await db.collection('users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (!userSnap.empty) return userSnap.docs[0].ref;

    // 4. Recherche fallback par stripe_customer_id
    userSnap = await db.collection('users')
      .where('stripe_customer_id', '==', customerId)
      .limit(1)
      .get();

    if (!userSnap.empty) return userSnap.docs[0].ref;
  }

  return null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Méthode non autorisée. Utilisez POST.' }),
    };
  }

  const sig =
    event.headers['stripe-signature'] ||
    event.headers['Stripe-Signature'] ||
    event.headers['STRIPE-SIGNATURE'] ||
    '';

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET n\'est pas configuré dans les variables d\'environnement.');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Configuration serveur incomplète: STRIPE_WEBHOOK_SECRET manquant.' }),
    };
  }

  let stripeEvent: Stripe.Event;

  try {
    // Gérer l'encodage base64 automatique de Netlify/AWS Lambda pour le corps brut
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : event.body || '';

    // 1. Vérifier la validité de la signature de l'événement Stripe Live
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
    const db = getFirestoreDb();

    // 2. Cartographie des événements Stripe gérés & Mise à jour Firestore

    // --- Événement 1: checkout.session.completed (Abonnement initial réussi) ---
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object as Stripe.Checkout.Session;
      const uid = session.client_reference_id;
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || '';
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || '';

      if (!uid) {
        console.warn('⚠️ Aucun client_reference_id (uid) trouvé dans la session de checkout.');
        return { statusCode: 200, body: 'Ignored: No client_reference_id' };
      }

      const plan = session.metadata?.plan || session.metadata?.planLevel || 'ascension';
      const isPremium = true;

      console.log(`[checkout.session.completed] Activation de l'abonnement pour UID: ${uid} - Plan: ${plan} (Customer: ${customerId}, Sub: ${subscriptionId})`);

      await db.collection('users').doc(uid).set({
        plan: 'ascension',
        planLevel: 'ascension',
        isPremium: true,
        stripeCustomerId: customerId,
        stripe_customer_id: customerId,
        stripeSubscriptionId: subscriptionId,
        stripe_subscription_id: subscriptionId,
        stripeSubscriptionStatus: 'active',
        stripe_subscription_status: 'active',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log(`✓ Firestore mis à jour avec succès pour l'utilisateur ${uid}`);
    }

    // --- Événement 2: customer.subscription.updated (Modification d'abonnement / Statut) ---
    else if (stripeEvent.type === 'customer.subscription.updated') {
      const subscription = stripeEvent.data.object as Stripe.Subscription;
      const subscriptionId = subscription.id;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || '';
      const status = subscription.status; // active, trialing, past_due, canceled, unpaid, incomplete

      const userRef = await findUserRef(db, subscriptionId, customerId);

      if (!userRef) {
        console.warn(`⚠️ Aucun utilisateur trouvé pour la souscription ${subscriptionId} / client ${customerId}`);
        return { statusCode: 200, body: 'Ignored: User not found for subscription update' };
      }

      let plan = 'free';
      let isPremium = false;

      if (status === 'active' || status === 'trialing') {
        plan = 'ascension';
        isPremium = true;
      }

      console.log(`[customer.subscription.updated] Mise à jour UID: ${userRef.id} - Statut: ${status} - Plan: ${plan}`);

      await userRef.set({
        plan,
        planLevel: plan,
        isPremium,
        stripeCustomerId: customerId,
        stripe_customer_id: customerId,
        stripeSubscriptionId: subscriptionId,
        stripe_subscription_id: subscriptionId,
        stripeSubscriptionStatus: status,
        stripe_subscription_status: status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    // --- Événement 3: customer.subscription.deleted (Résiliation / Expiration) ---
    else if (stripeEvent.type === 'customer.subscription.deleted') {
      const subscription = stripeEvent.data.object as Stripe.Subscription;
      const subscriptionId = subscription.id;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || '';

      const userRef = await findUserRef(db, subscriptionId, customerId);

      if (userRef) {
        console.log(`[customer.subscription.deleted] Résiliation de l'abonnement pour UID: ${userRef.id}`);

        await userRef.set({
          plan: 'free',
          planLevel: 'free',
          isPremium: false,
          stripeSubscriptionStatus: 'canceled',
          stripe_subscription_status: 'canceled',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      } else {
        console.warn(`⚠️ Résiliation reçue mais aucun utilisateur associé à ${subscriptionId}`);
      }
    }

    // --- Événement 4: invoice.payment_succeeded (Paiement de facture réussi - Renouvellement) ---
    else if (stripeEvent.type === 'invoice.payment_succeeded') {
      const invoice = stripeEvent.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id || null;
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id || null;

      const userRef = await findUserRef(db, subscriptionId, customerId);

      if (userRef) {
        console.log(`[invoice.payment_succeeded] Paiement réussi pour UID: ${userRef.id}`);

        await userRef.set({
          stripeSubscriptionStatus: 'active',
          stripe_subscription_status: 'active',
          lastPaymentStatus: 'succeeded',
          lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }

    // --- Événement 5: invoice.payment_failed (Échec de paiement de facture) ---
    else if (stripeEvent.type === 'invoice.payment_failed') {
      const invoice = stripeEvent.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id || null;
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id || null;

      const userRef = await findUserRef(db, subscriptionId, customerId);

      if (userRef) {
        console.warn(`[invoice.payment_failed] Échec de paiement pour UID: ${userRef.id}`);

        await userRef.set({
          stripeSubscriptionStatus: 'past_due',
          stripe_subscription_status: 'past_due',
          lastPaymentStatus: 'failed',
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

