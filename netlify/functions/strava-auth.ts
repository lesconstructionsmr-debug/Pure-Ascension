import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const uid = event.queryStringParameters?.uid;

    if (!uid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Le paramètre "uid" est requis.' }),
      };
    }

    const clientId = process.env.STRAVA_CLIENT_ID || '12345'; // Valeur fictive de développement
    
    // Déterminer la redirection de base à partir du Referer ou utiliser un fallback sécurisé
    let baseUrl = 'https://pure-ascension.netlify.app';
    try {
      const referer = event.headers.referer || event.headers.Referer;
      if (referer) {
        const url = new URL(referer);
        baseUrl = `${url.protocol}//${url.host}`;
      }
    } catch (e) {
      console.warn('Referer URL invalide dans strava-auth, utilisation du fallback https://pure-ascension.netlify.app');
    }
    const isNativeApp = event.queryStringParameters?.isNativeApp === 'true';
    const stateParam = isNativeApp ? `${uid}:native` : uid;

    // Générer l'URL de redirection vers Strava OAuth
    // Scope 'activity:read_all' requis pour lire l'historique et les détails cardiaques
    const stravaUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=activity:read_all&state=${encodeURIComponent(stateParam)}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: stravaUrl }),
    };
  } catch (error: any) {
    console.error('Erreur strava-auth :', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Une erreur interne est survenue.' }),
    };
  }
};
