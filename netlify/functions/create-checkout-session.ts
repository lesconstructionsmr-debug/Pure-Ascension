import { Handler } from '@netlify/functions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

export const handler: Handler = async (event) => {
  // Configurer les headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Gérer la requête de pré-vérification CORS
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

  try {
    const { uid, email, plan, isNativeApp } = JSON.parse(event.body || '{}');

    if (!uid || !email || !plan) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Paramètres manquants : uid, email et plan sont requis.' }),
      };
    }

    // Sélectionner le bon prix Stripe (Formule Ascension unique à $19.99/mois)
    const priceId = process.env.STRIPE_PRICE_PREMIUM || '';

    if (!priceId) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'La configuration du prix sur le serveur est manquante.' }),
      };
    }

    // Déterminer la redirection de base vers la production ou environnement local autorisé
    let baseUrl = process.env.URL || process.env.SITE_URL || 'https://pure-ascension.netlify.app';
    try {
      const referer = event.headers.referer || event.headers.Referer;
      if (referer) {
        const url = new URL(referer);
        const host = url.host.toLowerCase();
        if (host.includes('netlify.app') || host.includes('pure-ascension') || host.includes('localhost') || host.includes('127.0.0.1')) {
          baseUrl = `${url.protocol}//${url.host}`;
        }
      }
    } catch (e) {
      console.warn('Referer URL invalide, utilisation du fallback production:', baseUrl);
    }

    // Si l'appel vient de l'application mobile native, utiliser le Deep Link scheme "pureascension://"
    const successUrl = isNativeApp ? 'pureascension://?payment=success' : `${baseUrl}/?payment=success`;
    const cancelUrl  = isNativeApp ? 'pureascension://?payment=cancel'  : `${baseUrl}/?payment=cancel`;

    console.log(`Création d'une session Stripe Checkout pour ${uid} (${email}) - Plan: ${plan} - App Native: ${!!isNativeApp}`);
    console.log(`URLs de redirection Stripe: success=${successUrl}, cancel=${cancelUrl}`);

    // Créer la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      allow_promotion_codes: true, // Autorise les codes promo sur la page Stripe Checkout
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      client_reference_id: uid,
      customer_email: email,
      metadata: {
        plan: plan,
        planLevel: plan,
      },
      // Stripe redirigera vers l'application native ou le site Web
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
