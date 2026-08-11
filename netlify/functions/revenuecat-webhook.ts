/**
 * Webhook RevenueCat → Firestore (planLevel / isPremium).
 * Auth : header Authorization = Bearer ${REVENUECAT_WEBHOOK_AUTH}
 * Dashboard : Project → Integrations → Webhooks
 * URL : https://pure-ascension.netlify.app/.netlify/functions/revenuecat-webhook
 */
import { Handler } from '@netlify/functions';
import { getFirestoreDb } from './firebase-admin-init';

const ACTIVE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'TEMPORARY_ENTITLEMENT_GRANT',
]);

const INACTIVE_EVENTS = new Set([
  'EXPIRATION',
  'CANCELLATION', // still entitled until period end — keep premium unless expiration
]);

type RcEvent = {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
  product_id?: string;
  store?: string;
  environment?: string;
};

function collectUids(event: RcEvent): string[] {
  const ids = new Set<string>();
  for (const id of [event.app_user_id, event.original_app_user_id, ...(event.aliases || [])]) {
    if (id && !id.startsWith('$RCAnonymousID:')) ids.add(id);
  }
  return [...ids];
}

function shouldBePremium(event: RcEvent): boolean | null {
  const type = event.type || '';
  if (ACTIVE_EVENTS.has(type)) return true;
  if (type === 'EXPIRATION') return false;
  // CANCELLATION : accès jusqu'à expiration — ne downgrade pas ici
  if (type === 'CANCELLATION') return null;
  if (INACTIVE_EVENTS.has(type)) return false;
  return null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'POST only' }) };
  }

  const expected = (process.env.REVENUECAT_WEBHOOK_AUTH || '').trim();
  if (!expected) {
    console.error('REVENUECAT_WEBHOOK_AUTH manquant');
    return { statusCode: 500, body: JSON.stringify({ error: 'Webhook auth not configured' }) };
  }

  const auth =
    event.headers.authorization ||
    event.headers.Authorization ||
    '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (token !== expected) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let payload: { event?: RcEvent };
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const rcEvent = payload.event;
  if (!rcEvent?.type) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing event' }) };
  }

  const premium = shouldBePremium(rcEvent);
  if (premium === null) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: rcEvent.type }) };
  }

  const uids = collectUids(rcEvent);
  if (!uids.length) {
    console.warn('RevenueCat webhook sans uid Firebase', rcEvent.type);
    return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: 'no_uid' }) };
  }

  try {
    const db = getFirestoreDb();
    const updates = {
      planLevel: premium ? 'premium' : 'free',
      isPremium: premium,
      revenuecat_subscription_status: premium ? 'active' : 'inactive',
      revenuecat_product_id: rcEvent.product_id || null,
      revenuecat_store: rcEvent.store || null,
      revenuecat_environment: rcEvent.environment || null,
      revenuecat_updated_at: new Date().toISOString(),
      updatedAt: new Date(),
    };

    let updated = 0;
    for (const uid of uids) {
      const ref = db.collection('users').doc(uid);
      const snap = await ref.get();
      if (!snap.exists) continue;
      await ref.set(updates, { merge: true });
      updated += 1;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, type: rcEvent.type, premium, updated }),
    };
  } catch (err: any) {
    console.error('revenuecat-webhook error', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err?.message || 'Server error' }),
    };
  }
};
