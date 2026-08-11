# Guide de Contribution — Pure Ascension 🛡️

Merci de contribuer au projet **Pure Ascension** ! Pour maintenir un niveau de qualité exceptionnel et garantir la sécurité juridique de la plateforme, l'ensemble des contributeurs (développeurs, designers, rédacteurs) doit respecter strictement la présente charte.

---

## ⚖️ 1. Conformité Légale & Charte Éditoriale (Strict Anti-Poursuites)

La protection juridique de Pure Ascension est une priorité absolue. **Aucune allégation médicale ou exercice illégal de la médecine ne sera toléré.**

### 🚫 Interdiction du mot "Naturopathie" & Lexique Médical
Le mot **"naturopathie"** et tous ses dérivés sont **strictement proscrits** dans l'ensemble du code source, des composants React Native, des balises HTML/JSX, des textes UI, des métadonnées SEO et de la landing page.

| Terme Proscrit ❌ | Équivalent Réglementaire Autorisé ✅ | Rationale / Domaine d'application |
| :--- | :--- | :--- |
| `naturopathie`, `naturopathe` | **hygiène de vie**, **coaching bien-être**, **rituel quotidien** | Qualification de la démarche et des fonctionnalités |
| `traitement`, `remède`, `soin médical` | **accompagnement**, **conseils d'hygiène de vie**, **programme personnalisable** | Élimination de toute connotation thérapeutique |
| `diagnostic`, `ordonnance` | **analyse de forme**, **recommandations d'hygiène de vie** | Remplacement des actes réservés aux professions médicales |
| `patient`, `malade` | **utilisateur**, **membre**, **client** | Désignation des usagers de l'application |
| `thérapie`, `guérison` | **optimisation du bien-être**, **optimisation de la forme** | Objectifs orientés bien-être et hygiène de vie |

> Source de vérité : `STYLE_GUIDE.md` + `npm run compliance` (`scripts/compliance-check.js`).  
> Ne pas utiliser `bilan de vitalité` / `bilan métabolique` (interdits par le script).

### 💳 Tarification Dynamique (Interdiction des Prix Fixes en Dur)
- **Ne jamais coder de prix chiffrés fixes en dur** dans les composants UI, les pages marketing ou la documentation client (ex: pas de `29€/mois` ou `99€`).
- **Utiliser les dénominations de formules d'abonnement** :
  - `Accès Libre` (Gratuit / Formule découverte)
  - `Formule Standard`
  - `Formule Premium`
- La facturation et l'affichage des montants réels sont entièrement délégués à l'interface dynamique de **Stripe Checkout**.

---

## 📱 2. Stack Technique & Framework (Expo SDK 56)

Consulter impérativement la documentation officielle [Expo SDK 56.0.0](https://docs.expo.dev/versions/v56.0.0/).

- **Framework Native** : Expo v56.0.0 avec React Native et TypeScript.
- **Variables d'Environnement** :
  - Tout secret ou identifiant exposé côté client/frontend **doit obligatoirement** commencer par `EXPO_PUBLIC_` (ex: `EXPO_PUBLIC_FIREBASE_API_KEY`).
  - **Aucune clé API en clair** (Firebase client, Stripe public keys) ne doit être écrite en dur dans le code source. Utiliser exclusivement `process.env`.
- **Composants & Icônes** :
  - Composants natifs de `react-native`.
  - Iconographie issue exclusivement de `lucide-react-native`.

---

## 🎨 3. Charte Graphique & UI/UX (Luxe / Haut de Gamme)

Le rendu visuel de Pure Ascension doit susciter un effet "WOW" immédiat et s'inspirer des standards de marque d'Apple et Stripe.

### Palette de Couleurs
- **Sauge (Sage)** : Teintes végétales douces, rassurantes et luxueuses.
- **Terre Cuite (Clay)** : Accents chaleureux réservés aux boutons et éléments d'appel à l'action (CTA).
- **Sable (Sand)** : Fond neutre et doux (`#fbf8f3`) remplaçant systématiquement le blanc pur `#ffffff` agressif.
- **Encre (Ink)** : Typographie et contrastes sombres (pas de noir pur `#000000`).

### Typographies
- **Spectral** (Serif élégante) : Dédiée aux titres principal (`h1`, `h2`) et accroches.
- **Hanken Grotesk** (Sans-serif géométrique) : Dédiée au corps de texte, labels, boutons et valeurs chiffrées.

### Micro-interactions & Ressenti Natif
- **Retours Haptiques (`expo-haptics`)** : Intégrer obligatoirement des retours haptiques sur les interactions clés :
  - `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)` pour les boutons principaux et CTA.
  - `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` pour les validations d'actions.
- **Animations** : Transitions fluides via `react-native-reanimated`.

---

## 🔒 4. Données, Authentification & Sécurité

- **Authentification Réactive** : Tous les contextes globaux de données (progression, workout, calories) doivent écouter l'état d’authentification via `auth.onAuthStateChanged`.
- **Persistance & Cloud Sync** :
  - Workout actif : `useActiveWorkoutStore` couplé à `@react-native-async-storage/async-storage`.
  - Synchronisation Cloud : `AppState` React Native avec enregistrement dans Firestore sous `users/{uid}/activeWorkout/current`.
- **Sécurité Firestore** : Les droits d'écriture sur le statut d'abonnement Stripe sont réservés exclusivement aux webhooks Netlify via le SDK Firebase Admin.
- **Mode Démo** : Tout composant ou bouton d'activation du Mode Démo doit être strictement protégé par la condition `{__DEV__ && (...)}`.

---

## 📋 5. Processus de Pull Request (PR)

Avant de soumettre une Pull Request :
1. **Vérification de la conformité terminologique** : Exécuter une recherche globale sur le projet pour s'assurer qu'aucun terme proscrit n'est présent.
2. **Validation des types & Lint** : S'assurer que le projet compile sans erreurs TypeScript (`npx tsc --noEmit`).
3. **Test d'exécution Expo** : Vérifier le fonctionnement sur iOS / Android via Expo SDK 56.
4. **Description de la PR** : Spécifier explicitement les fonctionnalités ajoutées et confirmer le respect des règles d'anti-poursuite et de la charte de prix dynamique.
