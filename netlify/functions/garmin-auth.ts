import { Handler } from '@netlify/functions';

export const handler: Handler = async () => {
  const consumerKey = process.env.GARMIN_CONSUMER_KEY || 'demo_garmin_consumer_key';
  const callbackUrl = process.env.GARMIN_CALLBACK_URL || 'https://pure-ascension.netlify.app/.netlify/functions/garmin-callback';

  const garminAuthUrl = `https://connect.garmin.com/oauthConfirm?oauth_token=${encodeURIComponent(consumerKey)}&oauth_callback=${encodeURIComponent(callbackUrl)}`;

  return {
    statusCode: 302,
    headers: {
      Location: garminAuthUrl,
    },
    body: '',
  };
};
