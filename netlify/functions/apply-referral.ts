import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { admin, getFirestoreDb } from './firebase-admin-init';
import { buildCorsHeaders } from './cors';
import { isAuthFailure, requireFirebaseAuth } from './verify-firebase-token';

export const handler: Handler = async (event) => {
  const headers = buildCorsHeaders(event.headers as Record<string, string | undefined>);

  // Pré-vérification CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Méthode non autorisée. Utilisez POST.' }),
    };
  }

  const authResult = await requireFirebaseAuth(
    event.headers as Record<string, string | undefined>
  );
  if (isAuthFailure(authResult)) {
    return { ...authResult, headers };
  }

  try {
    const body = JSON.parse(event.body || '{}') as {
      refereeUid?: string;
      referralCode?: string;
      stripeCustomerId?: string;
    };

    // Force le filleul = utilisateur authentifié (anti-spoofing)
    const refereeUid = authResult.uid;
    if (body.refereeUid && body.refereeUid !== refereeUid) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'refereeUid ne correspond pas à la session authentifiée.' }),
      };
    }

    const referralCode = body.referralCode;
    const stripeCustomerId = body.stripeCustomerId;

    if (!referralCode) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Paramètres manquants : referralCode est requis.' }),
      };
    }

    const cleanCode = referralCode.trim().toUpperCase();
    const db = getFirestoreDb();

    // 1. Rechercher le parrain par son code de parrainage dans Firestore
    const referrerSnap = await db.collection('users')
      .where('referralCode', '==', cleanCode)
      .limit(1)
      .get();

    if (referrerSnap.empty) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Code de parrainage invalide ou introuvable.' }),
      };
    }

    const referrerDoc = referrerSnap.docs[0];
    const referrerId = referrerDoc.id;
    const referrerData = referrerDoc.data();

    // 2. Vérifications de sécurité et de validité
    if (referrerId === refereeUid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Vous ne pouvez pas parrainer votre propre compte.' }),
      };
    }

    const refereeRef = db.collection('users').doc(refereeUid);
    const refereeDoc = await refereeRef.get();

    if (refereeDoc.exists && refereeDoc.data()?.referredBy) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Un code de parrainage a déjà été appliqué à ce compte.' }),
      };
    }

    // 3. Gestion des récompenses via l'API Stripe Node.js SDK
    let refereeCouponId = 'REFERRAL_20_OFF';
    let promoCode = 'PARRAIN20';
    let referrerRewardSuccess = false;

    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2023-10-16' as any,
        });

        // A) Vérifier ou créer le coupon 20% de réduction pour le filleul
        try {
          await stripe.coupons.retrieve(refereeCouponId);
        } catch (err) {
          const coupon = await stripe.coupons.create({
            id: refereeCouponId,
            name: '20% Réduction Parrainage Filleul',
            percent_off: 20,
            duration: 'once',
          });
          refereeCouponId = coupon.id;
        }

        // Vérifier ou créer le Code Promo Stripe associé
        try {
          const existingPromos = await stripe.promotionCodes.list({ code: promoCode, active: true, limit: 1 });
          if (existingPromos.data.length === 0) {
            const newPromo = await stripe.promotionCodes.create({
              coupon: refereeCouponId,
              code: promoCode,
            });
            promoCode = newPromo.code;
          }
        } catch (e) {
          console.warn('Note: Le code promo existe déjà ou n\'a pas pu être créé.', e);
        }

        // Si l'identifiant Client Stripe du filleul est fourni, lui appliquer la réduction
        if (stripeCustomerId) {
          await stripe.customers.update(stripeCustomerId, {
            coupon: refereeCouponId,
          });
          console.log(`✓ Coupon 20% appliqué au client Stripe filleul (${stripeCustomerId})`);
        }

        // B) Créditer 1 mois gratuit au parrain via Stripe
        let referrerCouponId = 'REFERRAL_100_FREE_MONTH';
        try {
          await stripe.coupons.retrieve(referrerCouponId);
        } catch (err) {
          await stripe.coupons.create({
            id: referrerCouponId,
            name: '1 Mois Gratuit Parrainage',
            percent_off: 100,
            duration: 'once',
          });
        }

        const referrerStripeSubId = referrerData?.stripe_subscription_id;
        const referrerStripeCustomerId = referrerData?.stripe_customer_id;

        if (referrerStripeSubId) {
          // Appliquer la remise 100% sur l'abonnement en cours du parrain
          await stripe.subscriptions.update(referrerStripeSubId, {
            coupon: referrerCouponId,
          });
          referrerRewardSuccess = true;
          console.log(`✓ Coupon 100% (1 mois gratuit) appliqué à l'abonnement du parrain (${referrerStripeSubId})`);
        } else if (referrerStripeCustomerId) {
          // Alternative: Appliquer le coupon sur le profil client du parrain
          await stripe.customers.update(referrerStripeCustomerId, {
            coupon: referrerCouponId,
          });
          referrerRewardSuccess = true;
          console.log(`✓ Coupon 100% (1 mois gratuit) appliqué au client Stripe parrain (${referrerStripeCustomerId})`);
        }
      } catch (stripeErr: any) {
        console.error('⚠️ Erreur Stripe SDK dans apply-referral:', stripeErr.message);
        // On continue la mise à jour Firestore même si Stripe renvoie un avertissement
      }
    }

    // 4. Mettre à jour Firestore
    // A) Document du Filleul
    await refereeRef.set({
      referredBy: referrerId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // B) Document du Parrain
    await db.collection('users').doc(referrerId).set({
      referralCount: admin.firestore.FieldValue.increment(1),
      rewardsEarned: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // C) Log de l'opération dans la collection `referrals`
    await db.collection('referrals').add({
      referrerId,
      refereeId: refereeUid,
      referralCode: cleanCode,
      status: 'completed',
      discountPercentage: 20,
      referrerReward: '1_month_free',
      referrerRewardAppliedInStripe: referrerRewardSuccess,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✓ Parrainage validé : ${referrerId} -> ${refereeUid} (Code: ${cleanCode})`);

    const referrerFirstName = referrerData?.profile?.firstName || 'Parrain';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Félicitations ! Le code de parrainage de ${referrerFirstName} a été appliqué. Vous bénéficiez de 20% de réduction.`,
        referralCode: cleanCode,
        referrerId,
        referrerName: referrerFirstName,
        discount: {
          percent: 20,
          couponId: refereeCouponId,
          promoCode,
        },
        rewardCreditedToReferrer: true,
      }),
    };
  } catch (error: any) {
    console.error('Erreur interne apply-referral:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Une erreur interne est survenue.' }),
    };
  }
};
