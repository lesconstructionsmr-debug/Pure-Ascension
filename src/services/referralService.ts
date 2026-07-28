import { Platform } from 'react-native';
import { getUserData, getUserByReferralCode, updateUserReferralInfo, getReferralsByReferrer } from './dbService';

export interface ReferralStats {
  referralCode: string;
  referralCount: number;
  rewardsEarned: number;
  referredBy: string | null;
  referrals: Array<{ id: string; name?: string; createdAt?: any }>;
}

export interface ValidationResult {
  valid: boolean;
  referrerId?: string;
  referrerName?: string;
  error?: string;
}

export interface ApplyReferralResponse {
  success: boolean;
  message?: string;
  referralCode?: string;
  referrerId?: string;
  referrerName?: string;
  discount?: {
    percent: number;
    couponId: string;
    promoCode: string;
  };
  error?: string;
}

/**
  Génère un code de parrainage unique basé sur le prénom ou une chaîne par défaut (ex: MAX-8821, PURE-4910).
 */
export function generateReferralCode(displayName?: string): string {
  const prefix = (displayName || 'PURE')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-zA-Z]/g, '')     // Ne garde que les lettres
    .slice(0, 4)
    .toUpperCase() || 'PURE';

  const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4 chiffres aléatoires (1000-9999)
  return `${prefix}-${randomNumber}`;
}

/**
  Récupère le code de parrainage de l'utilisateur ou en génère un nouveau s'il n'en possède pas encore.
 */
export async function getOrCreateReferralCode(uid: string, displayName?: string): Promise<string> {
  const userData = await getUserData(uid);
  
  if (userData && userData.referralCode) {
    return userData.referralCode;
  }

  // Génération d'un code unique sans collision dans Firestore
  let code = generateReferralCode(displayName || userData?.profile?.firstName);
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 5) {
    const existingUser = await getUserByReferralCode(code);
    if (!existingUser) {
      isUnique = true;
    } else {
      code = generateReferralCode(displayName || userData?.profile?.firstName);
      attempts++;
    }
  }

  // Sauvegarde du code dans Firestore
  await updateUserReferralInfo(uid, { referralCode: code });
  return code;
}

/**
  Vérifie la validité d'un code de parrainage dans Firestore.
 */
export async function validateReferralCode(code: string): Promise<ValidationResult> {
  if (!code || !code.trim()) {
    return { valid: false, error: 'Code de parrainage vide.' };
  }

  const cleanCode = code.trim().toUpperCase();
  const referrer = await getUserByReferralCode(cleanCode);

  if (!referrer) {
    return { valid: false, error: 'Code de parrainage introuvable.' };
  }

  const referrerName = referrer.profile?.firstName || 'Un Frère d\'Arme';

  return {
    valid: true,
    referrerId: referrer.id,
    referrerName,
  };
}

/**
  Applique un code de parrainage lors de l'inscription ou du paiement via la fonction Netlify.
 */
export async function applyReferralCode(
  refereeUid: string,
  referralCode: string,
  stripeCustomerId?: string
): Promise<ApplyReferralResponse> {
  try {
    const endpoint = Platform.OS === 'web'
      ? '/.netlify/functions/apply-referral'
      : 'https://pure-ascension.netlify.app/.netlify/functions/apply-referral';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refereeUid,
        referralCode: referralCode.trim().toUpperCase(),
        stripeCustomerId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Erreur lors de l\'application du code de parrainage.',
      };
    }

    return {
      success: true,
      message: data.message,
      referralCode: data.referralCode,
      referrerId: data.referrerId,
      referrerName: data.referrerName,
      discount: data.discount,
    };
  } catch (err: any) {
    console.error('Erreur applyReferralCode:', err);
    return {
      success: false,
      error: err.message || 'Impossible d\'appliquer le code de parrainage pour le moment.',
    };
  }
}

/**
  Récupère les statistiques de parrainage d'un utilisateur.
 */
export async function getReferralStats(uid: string): Promise<ReferralStats> {
  const userData = await getUserData(uid);
  const referralCode = await getOrCreateReferralCode(uid, userData?.profile?.firstName);
  const referralsDocs = await getReferralsByReferrer(uid);

  const referrals = referralsDocs.map(d => ({
    id: d.id,
    name: d.profile?.firstName || 'Frère d\'Arme',
    createdAt: d.createdAt,
  }));

  return {
    referralCode,
    referralCount: userData?.referralCount || referrals.length || 0,
    rewardsEarned: userData?.rewardsEarned || 0,
    referredBy: userData?.referredBy || null,
    referrals,
  };
}
