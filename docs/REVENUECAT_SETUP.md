# RevenueCat + App Store IAP — Pure Ascension

iOS utilise **StoreKit via RevenueCat**. Le web garde **Stripe**.

## 1. App Store Connect

1. Apps → **Pure Ascension** (`com.pureascension.app`)
2. **Monetization → Subscriptions**
3. Créer un **Subscription Group** (ex. `Pure Ascension`)
4. Créer les produits (IDs exacts recommandés) :
   - `ascension_monthly` — auto-renewable monthly
   - `ascension_yearly` — auto-renewable yearly (optionnel)
5. Remplir métadonnées FR, prix, review screenshot
6. Statut : **Ready to Submit** (sandbox OK avant review)

## 2. RevenueCat Dashboard

1. Créer un projet → add **Apple App** (bundle `com.pureascension.app`)
2. Coller la **In-App Purchase Key** (App Store Connect → Users and Access → Integrations → In-App Purchase)
3. **Entitlements** → créer `premium` (ID exact : `premium`)
4. **Products** → importer / lier `ascension_monthly` (+ yearly) → entitlement `premium`
5. **Offerings** → offering `default` (Current) avec packages Monthly / Annual
6. **API Keys** → copier la clé **Apple public SDK** (`appl_…`)

## 3. Clés dans Expo / EAS

```bash
# Local (.env — ne pas committer)
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxx

# EAS Secrets (production / preview / development)
eas secret:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_xxxxxxxx --scope project
```

Optionnel Android plus tard : `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_…`

## 4. Webhook Netlify → Firestore

1. Netlify → Env :
   - `REVENUECAT_WEBHOOK_AUTH` = secret long aléatoire
2. RevenueCat → Project → **Integrations → Webhooks**
   - URL : `https://pure-ascension.netlify.app/.netlify/functions/revenuecat-webhook`
   - Authorization : `Bearer <même secret>`
3. Events : au minimum `INITIAL_PURCHASE`, `RENEWAL`, `EXPIRATION`, `CANCELLATION`, `PRODUCT_CHANGE`

Le webhook écrit `planLevel: premium|free`, `isPremium`, `revenuecat_subscription_status`.

## 5. Rebuild iOS (obligatoire)

IAP n’existe pas dans Expo Go. Après ajout du SDK :

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile testflight
```

## 6. Test sandbox

1. iPhone → Réglages → App Store → **Sandbox Account**
2. Ouvre le build TestFlight / dev client
3. Paywall → Formule Ascension → achat sandbox
4. Vérifie Firestore : `users/{uid}.planLevel == premium`

## 7. Checklist code (déjà en place)

| Élément | Fichier |
|---|---|
| SDK configure | `App.tsx`, `revenueCatService.ts` |
| `Purchases.logIn(uid)` | `RootNavigator.tsx` |
| Paywall IAP iOS | `SubscriptionScreen.tsx` |
| Webhook | `netlify/functions/revenuecat-webhook.ts` |
| Rules billing | `firestore.rules` (champs `revenuecat_*` protégés) |

## Important Apple

- Ne plus ouvrir Stripe Checkout depuis le binaire iOS pour du contenu digital (fait).
- Afficher le prix **StoreKit** (`priceString`) — pas de prix hardcodé.
- Bouton **Restaurer mes achats** requis (fait).
