/**
 * RevenueCat / StoreKit — abonnements iOS (et Android si clé présente).
 * Web continue d'utiliser Stripe Checkout.
 */
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PurchasesPackage,
  CustomerInfo,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';

/** Doit correspondre à l'entitlement RevenueCat Dashboard */
export const RC_ENTITLEMENT_ID = 'premium';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY?.trim() || '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?.trim() || '';

let configured = false;

export function isNativeIapPlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function isRevenueCatConfigured(): boolean {
  if (Platform.OS === 'ios') return !!IOS_KEY;
  if (Platform.OS === 'android') return !!ANDROID_KEY;
  return false;
}

export async function configureRevenueCat(): Promise<void> {
  if (!isNativeIapPlatform() || configured) return;

  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  if (!apiKey) {
    console.warn(
      'RevenueCat: clé manquante (EXPO_PUBLIC_REVENUECAT_IOS_KEY / ANDROID_KEY). IAP désactivé.'
    );
    return;
  }

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
  await Purchases.configure({ apiKey });
  configured = true;
}

export async function loginRevenueCat(uid: string): Promise<CustomerInfo | null> {
  if (!configured || !uid) return null;
  try {
    const { customerInfo } = await Purchases.logIn(uid);
    return customerInfo;
  } catch (err) {
    console.warn('RevenueCat logIn:', err);
    return null;
  }
}

export async function logoutRevenueCat(): Promise<void> {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch (err) {
    console.warn('RevenueCat logOut:', err);
  }
}

export function hasPremiumEntitlement(info: CustomerInfo | null | undefined): boolean {
  if (!info) return false;
  return !!info.entitlements.active[RC_ENTITLEMENT_ID];
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    console.warn('RevenueCat getCustomerInfo:', err);
    return null;
  }
}

export async function getCurrentOfferingPackages(): Promise<PurchasesPackage[]> {
  if (!configured) return [];
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return [];
  return current.availablePackages;
}

export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ customerInfo: CustomerInfo; userCancelled: boolean }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { customerInfo, userCancelled: false };
  } catch (err: any) {
    if (err?.userCancelled || err?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { customerInfo: await Purchases.getCustomerInfo(), userCancelled: true };
    }
    throw err;
  }
}

export async function restorePurchases(): Promise<CustomerInfo> {
  if (!configured) {
    throw new Error('RevenueCat non configuré.');
  }
  return Purchases.restorePurchases();
}

export function packageLabel(pkg: PurchasesPackage): string {
  const product = pkg.product;
  const period =
    pkg.packageType === Purchases.PACKAGE_TYPE.ANNUAL
      ? '/an'
      : pkg.packageType === Purchases.PACKAGE_TYPE.MONTHLY
        ? '/mois'
        : '';
  return `${product.priceString}${period}`;
}
