import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { buildCorsHeaders } from './cors';
import { isAuthFailure, requireFirebaseAuth } from './verify-firebase-token';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

export const handler: Handler = async (event) => {
  const headers = buildCorsHeaders(event.headers as Record<string, string | undefined>);

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
      uid?: string;
      email?: string;
      plan?: string;
      isNativeApp?: boolean;
    };

    // uid du body ignoré s'il ne correspond pas au token (anti-spoofing)
    const uid = authResult.uid;
    if (body.uid && body.uid !== uid) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'uid ne correspond pas à la session authentifiée.' }),
      };
    }

    const email = (body.email || authResult.email || '').trim();
    const plan = body.plan;
    const isNativeApp = !!body.isNativeApp;

    if (!email || !plan) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Paramètres manquants : email et plan sont requis.' }),
      };
    }

    const priceId = process.env.STRIPE_PRICE_PREMIUM || '';
    if (!priceId) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'La configuration du prix sur le serveur est manquante.' }),
      };
    }

    let baseUrl = process.env.URL || process.env.SITE_URL || 'https://pure-ascension.ca';
    try {
      const referer = event.headers.referer || event.headers.Referer;
      if (referer) {
        const url = new URL(referer);
        const host = url.host.toLowerCase();
        if (
          host.includes('netlify.app') ||
          host.includes('pure-ascension') ||
          host.includes('localhost') ||
          host.includes('127.0.0.1')
        ) {
          baseUrl = `${url.protocol}//${url.host}`;
        }
      }
    } catch {
      // fallback production
    }

    const successUrl = isNativeApp
      ? 'pureascension://?payment=success'
      : `${baseUrl}/?payment=success`;
    const cancelUrl = isNativeApp
      ? 'pureascension://?payment=cancel'
      : `${baseUrl}/?payment=cancel`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: uid,
      customer_email: email,
      metadata: {
        plan,
        planLevel: plan,
        firebaseUid: uid,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error: any) {
    console.error('Erreur create-checkout-session :', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Une erreur interne est survenue.' }),
    };
  }
};
