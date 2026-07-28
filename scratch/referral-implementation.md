# Spécifications et Architecture du Système de Parrainage (Referral Program)
**Projet** : Pure Ascension (Expo / React Native + Firebase + Netlify Functions + Stripe)

---

## 1. Architecture du Système

```
[ PARRAIN ] 
    │
    ├─► Génère / Obtient son `referralCode` (ex: "ALEX2024") dans l'App (Expo)
    └─► Partage le code / lien via `Share` de React Native (ou Web Share API)
           │
           ▼
[ FILLEUL ] 
    │
    ├─► Reçoit le code et crée un compte sur Pure Ascension (Firebase Auth)
    ├─► Saisit le code de parrainage dans l'App à l'inscription ou dans Checkout
    └─► Appelle l'endpoint sécurisé `/.netlify/functions/apply-referral`
           │ (Envoie: Bearer ID_TOKEN + refereeUid + referralCode)
           ▼
[ NETLIFY FUNCTION: apply-referral ]
    │
    ├─► 1. Vérifie le Token Firebase ID (verifyIdToken) & s'assure que callerUid === refereeUid
    ├─► 2. Vérifie la validité du code et empêche le self-referral (referrerId != refereeUid)
    ├─► 3. Utilise une Transaction Firestore (`db.runTransaction`) :
    │      - Vérifie que le filleul n'a pas déjà un `referredBy`
    │      - Enregistre `referredBy: referrerId` sur le document du filleul
    │      - Crée un enregistrement dans la collection `referrals` (status: 'pending')
    └─► 4. Applique la remise Filleul dans Stripe (Coupon 20% Off) lors de la création de la session Checkout
           │
           ▼
[ STRIPE WEBHOOK: invoice.payment_succeeded ]
    │
    └─► Dès le 1er paiement valide du filleul confirmé :
           - Crédite le parrain (1 mois offert / Coupon 100%)
           - Met à jour Firestore (`status: 'completed'`, `referralCount += 1`, `rewardsEarned += 1`)
```

---

## 2. Collections Firestore Impliquées et Champs

### A. Collection `users`
*Chaque document utilisateur (`/users/{uid}`) contient les champs suivants :*

```typescript
interface UserProfile {
  uid: string;
  email: string;
  referralCode: string;          // Code unique de parrainage du compte (ex: "ALEX892")
  referralCount?: number;         // Nombre de parrainages complétés (incrémenté)
  rewardsEarned?: number;         // Nombre de mois gratuits / récompenses cumulées
  referredBy?: string;            // UID du parrain ayant parrainé cet utilisateur (si applicable)
  stripe_customer_id?: string;    // ID Client Stripe (cus_xxx)
  stripe_subscription_id?: string;// ID Abonnement Stripe (sub_xxx)
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
```

### B. Collection `referrals`
*Journalise l'ensemble des transactions et tentatives de parrainage (`/referrals/{referralId}`) :*

```typescript
interface ReferralRecord {
  referrerId: string;                     // UID du parrain
  refereeId: string;                      // UID du filleul
  referralCode: string;                   // Code utilisé
  status: 'pending' | 'completed' | 'failed'; // Statut (pending jusqu'au paiement Stripe)
  discountPercentage: number;             // ex: 20
  referrerReward: '1_month_free';         // Type de récompense parrain
  referrerRewardAppliedInStripe: boolean; // Flag de validation Stripe
  createdAt: FirebaseFirestore.Timestamp;
  completedAt?: FirebaseFirestore.Timestamp;
}
```

---

## 3. Flux Complet (Étape par Étape)

1. **Parrain** :
   - Accède à son profil dans l'application Expo.
   - Son `referralCode` unique est affiché (généré à la création du compte Firebase).
   - Clique sur "Partager mon code" ➔ utilise `Share.share()` de React Native (sur Mobile) ou `navigator.clipboard` / `setStringAsync()` (sur Web).
2. **Partage** :
   - Le message envoyé contient le code et l'URL de téléchargement/inscription : *"Rejoins-moi sur Pure Ascension avec mon code **ALEX2024** et profite de 20% de réduction !"*.
3. **Filleul** :
   - Installe l'application ou accède à la Web App. Crée son compte avec Firebase Auth.
   - Saisit le code de parrainage dans l'écran dédié ou au moment de finaliser l'abonnement.
4. **Application de la remise (Netlify Function `apply-referral`)** :
   - L'application envoie les entêtes d'authentification (`Authorization: Bearer <ID_TOKEN>`) et le body `{ refereeUid, referralCode }`.
   - La fonction vérifie l'identité du filleul, valide que le parrain existe, empêche le self-referral et le double parrainage.
   - Enregistre la relation dans Firestore avec le statut `'pending'`.
   - Attache le coupon de 20% (`REFERRAL_20_OFF`) au checkout/client Stripe du filleul.
5. **Récompenses et Webhook Stripe** :
   - Lorsque le filleul règle son premier abonnement, Stripe envoie l'événement `invoice.payment_succeeded` au Webhook Netlify.
   - Le Webhook vérifie l'enregistrement `referral` correspondant, applique le coupon 100% (1 mois offert) sur l'abonnement du parrain, incrémente `referralCount` et valide la transaction (`status: 'completed'`).

---

## 4. Checklist de Tests pour les Testeurs

| Test Case | Description | Résultat Attendu |
| :--- | :--- | :--- |
| **TC-01** | Copie du code via l'application | Le code est correctement placé dans le presse-papier avec `setStringAsync()`. |
| **TC-02** | Partage sur Mobile (iOS/Android) | La feuille de partage native s'ouvre avec le message et le code pré-remplis. |
| **TC-03** | Saisie d'un code valide par un nouveau filleul | Le code est accepté, Firestore affiche `referredBy`, et la remise 20% s'affiche sur Checkout Stripe. |
| **TC-04** | Tentative d'auto-parrainage (Self-referral) | L'application refuse la validation avec un message d'erreur : *"Vous ne pouvez pas parrainer votre propre compte."* |
| **TC-05** | Double application de code | Un deuxième appel retourne une erreur : *"Un code de parrainage a déjà été appliqué à ce compte."* |
| **TC-06** | Appel d'endpoint sans Token JWT Firebase | La Function HTTP retourne un statut `401 Unauthorized`. |
| **TC-07** | Appel d'endpoint avec UID d'un autre utilisateur | La Function détecte l'écart entre le Token et le `refereeUid` et retourne `403 Forbidden`. |
| **TC-08** | Validation du 1er paiement Filleul | Le Webhook Stripe s'exécute, applique la remise 100% sur l'abonnement du parrain et passe le statut en `completed`. |

---

## 5. Commandes de Déploiement

### Netlify Functions
```bash
# Tester les fonctions Netlify en local avec les variables d'environnement
npx netlify dev

# Déployer les fonctions sur l'environnement de Production Netlify
npx netlify deploy --prod
```

### Règles de Sécurité Firestore
```bash
# Déployer les règles de sécurité Firestore définies dans firestore.rules
npx firebase-tools deploy --only firestore:rules
```

### Application Expo / React Native
```bash
# Lancer en développement local
npx expo start

# Compiler la version Web
npx expo export -p web
```

---

## 6. Problèmes de Sécurité Identifiés et Recommandations

> [!WARNING]
> **Diagnostic de l'Audit sur `apply-referral.ts` actuel :**

1. **Absence d'Authentification (ID Token Verification)** :
   - *Faille* : L'endpoint lit `refereeUid` depuis le corps de la requête sans valider le jeton `Authorization: Bearer <ID_TOKEN>`.
   - *Risque* : N'importe quel utilisateur ou robot externe peut appeler l'endpoint pour forcer un parrainage sur n'importe quel compte `refereeUid`.
   - *Correctif* : Ajouter la vérification `admin.auth().verifyIdToken(idToken)` et exiger `decodedToken.uid === refereeUid`.

2. **Attribution Prématurée de Récompense (Fraude au Mois Gratuit)** :
   - *Faille* : Le script crédite immédiatement le parrain (1 mois offert 100% Stripe) au moment où la fonction `apply-referral` est appelée, sans vérifier si le filleul a réellement payé.
   - *Risque* : Un utilisateur frauduleux peut générer des faux comptes filleuls et appeler l'endpoint en boucle pour accumuler des mois gratuits illimités sans débourser 1 centime.
   - *Correctif* : Ne créditer la récompense du parrain que dans le **Webhook Stripe** suite à l'événement de paiement `invoice.payment_succeeded`.

3. **Absence de Rate Limiting & Protection Anti-Bruteforce** :
   - *Faille* : Aucune restriction du nombre de requêtes par IP/UID.
   - *Risque* : Énumération automatisée des codes de parrainage de l'ensemble des utilisateurs.
   - *Correctif* : Implémenter une limitation de fréquence (ex: 5 essais/minute max par IP) ou utiliser un CAPTCHA si nécessaire.

4. **Concurrence et Modificabilité Firestore Non Atomique** :
   - *Faille* : Les lectures et écritures dans Firestore se font de façon séquentielle sans verrou transactionnel.
   - *Risque* : Envoi simultané de requêtes permettant d'inscrire plusieurs parrains ou d'incrémenter les compteurs abusivement.
   - *Correctif* : Envelopper les vérifications et écritures dans `db.runTransaction()`.

---

## 📚 Ce que ce chapitre apporte au playbook

### 1. Pourquoi un système de parrainage est une fonctionnalité PM (pas juste technique)
Un programme de parrainage (Referral Program) n'est pas un simple morceau de code technique ou une fonction utilitaire : c'est un **moteur de croissance organique (Viral Engine)** situé au cœur de la stratégie Produit (Product-Led Growth). 

- **Réduction drastique du CAC (Customer Acquisition Cost)** : Au lieu d'acheter du trafic payant (Meta Ads, Google Ads) à des coûts d'acquisition toujours plus élevés, le parrainage convertit la base d'utilisateurs existante en un canal d'acquisition à coût marginal quasi-nul.
- **Accélération de la boucle virale (K-Factor)** : En intégrant le parrainage directement dans l'expérience utilisateur (post-activation ou accomplissement d'un jalon), chaque utilisateur actif attire un coefficient de nouveaux membres, alimentant une croissance exponentielle.
- **Confiance et Taux de Conversion Élevé** : Un prospect parrainé par un pair ou un proche a un taux de rétention et de conversion 3 à 4 fois supérieur à un utilisateur venu de la publicité froide.

### 2. La décision clé : Récompense Filleul (20% off) vs Parrain (1 mois gratuit) — Pourquoi ces chiffres ?

Cette structure de récompense à double sens (Double-Sided Incentive) repose sur un équilibre économique d'unit economics rigoureusement calculé :

- **Récompense Filleul : 20% de réduction (One-time)**
  - *Psychologie* : Un rabais de 20% réduit la friction psychologique d'achat lors de la première souscription sans dévaluer la valeur perçue du produit Pure Ascension (contrairement à la gratuité totale qui peut générer du churn immédiat).
  - *Raison financière* : L'entreprise conserve 80% de la valeur client dès le premier mois, couvrant largement les coûts d'infrastructure et d'API.
- **Récompense Parrain : 1 mois offert (100% de réduction)**
  - *Psychologie* : Offrir un mois complet crée une **valeur perçue très élevée** pour le parrain (ex: 29€ économisés) par rapport au coût réel marginal pour Pure Ascension.
  - *Raison financière & Rétention* : Le parrain reste abonné plus longtemps pour profiter de ses crédits. Le coût d'un mois offert au parrain est immédiatement compensé par le panier du filleul qui s'abone dans la durée (LTV).

### 3. Ce que ça prouve sur la capacité à penser acquisition + rétention ensemble

La majorité des startups commettent l'erreur de séparer l'acquisition (Marketing) et la rétention (Produit). Le système de parrainage est la preuve d'une **vision globale du funnel AARRR** :

- **Le parrainage réactive la rétention** : Pour pouvoir parrainer et accumuler des mois gratuits, le parrain doit maintenir son propre statut d'utilisateur actif.
- **Cycle d'engagement circulaire** : L'acquisition du filleul renforce directement la rétention du parrain (qui gagne du temps d'utilisation), tandis que le filleul devient lui-même un futur parrain.
- **Alignement Produit-Business** : Cela démontre une maîtrise complète de l'architecture SaaS moderne : lier la logique applicative (Expo/React Native), la persistance des règles d'affaires (Firebase), l'automatisation sécurisée (Netlify Serverless) et le moteur de facturation récurrente (Stripe).
