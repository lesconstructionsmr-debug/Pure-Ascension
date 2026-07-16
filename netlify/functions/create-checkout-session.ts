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
    const { uid, email, plan } = JSON.parse(event.body || '{}');

    if (!uid || !email || !plan) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Paramètres manquants : uid, email et plan sont requis.' }),
      };
    }

    // Sélectionner le bon prix Stripe
    let priceId = '';
    if (plan === 'standard') {
      priceId = process.env.STRIPE_PRICE_STANDARD || '';
    } else if (plan === 'premium') {
      priceId = process.env.STRIPE_PRICE_PREMIUM || '';
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Plan invalide. Choisissez "standard" ou "premium".' }),
      };
    }

    if (!priceId) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'La configuration du prix sur le serveur est manquante.' }),
      };
    }

    // Déterminer la redirection de base à partir du Referer ou utiliser un fallback
    const referer = event.headers.referer || 'https://pure-ascension.netlify.app/';
    const url = new URL(referer);
    const baseUrl = `${url.protocol}//${url.host}`;

    console.log(`Création d'une session Stripe Checkout pour l'utilisateur ${uid} (${email}) - Plan: ${plan}`);

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
        planLevel: plan,
      },
      // Stripe redirigera ici après validation ou annulation
      success_url: `${baseUrl}/?payment=success`,
      cancel_url: `${baseUrl}/?payment=cancel`,
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
