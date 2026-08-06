# Consignes d'Équipe & Règles Personnalisées — Pure Ascension 🛡️

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## 📱 1. Framework & Plateforme (Expo SDK 56)
- **Expo v56.0.0** : Toutes les fonctionnalités mobiles doivent utiliser les API standardisées d'Expo SDK 56.
- **Variables d'environnement** : Toutes les variables exposées côté client/frontend doivent obligatoirement commencer par le préfixe `EXPO_PUBLIC_` (ex: `EXPO_PUBLIC_FIREBASE_API_KEY`).
- **Composants natifs** : Utiliser les composants standards de `react-native` et les icônes de `lucide-react-native`.

## 🎨 2. Charte Graphique & UI/UX (Haut de Gamme / Luxe)
- **Style Visuel** : Rendu extrêmement premium, fluide et épuré. Inspiré du design d'Apple et Stripe.
- **Palette de Couleurs** :
  - **Sauge (Sage)** : Teintes végétales douces, rassurantes et luxueuses.
  - **Terre Cuite (Clay)** : Accents chaleureux pour les éléments d'appel à l'action principaux.
  - **Sable (Sand)** : Fonds neutres et doux (ex: `#fbf8f3`) pour remplacer le blanc pur agressif.
  - **Encre (Ink)** : Typographie et contrastes foncés, pas de noir pur `#000`.
- **Typographies** :
  - Titres et accroches : **Spectral** (Serif élégante).
  - Corps de texte et chiffres : **Hanken Grotesk** (Sans-serif géométrique lisible).
- **Micro-interactions** :
  - Intégrer systématiquement des retours haptiques via `expo-haptics` sur tous les boutons importants et validations d'actions (`Haptics.impactAsync`, `Haptics.notificationAsync`).
  - Utiliser `react-native-reanimated` pour des transitions fluides.

## 🔒 3. Sécurité, Environnement & Production
- **Aucune clé API en clair** : Ne jamais coder en dur des identifiants Firebase client ou Stripe. Utiliser exclusivement `process.env`.
- **Authentification réactive** : Tous les contextes globaux de données de l'utilisateur (progression, calories) doivent écouter réactivement `auth.onAuthStateChanged`.
- **Mode Démo** : Le bouton Mode Démo est strictement conditionné par `{__DEV__ && (...)}`.

## ⚖️ 4. Conformité Légale, Réglementaire & Médicale (Strict Anti-Poursuites)
- **Coaching Fitness & Nutrition** : Pure Ascension est strictement un outil de coaching fitness et nutrition. Il ne remplace pas un avis médical professionnel.
- **Mention Légale Obligatoire** : Doit figurer sur l'onboarding et les Paramètres : *"Pure Ascension est un outil de coaching fitness et nutrition. Il ne remplace pas un avis médical professionnel."*
- **Termes Médicaux Interdits** : Interdiction totale des termes à connotation médicale ou naturopathique (`naturopathie`, `diagnostic`, `sensibilité à l'insuline`, `soutien hépatique`, `éliminer l'inflammation`, `énergie cellulaire`, `synthèse protéique`, `périodisation métabolique`, `maîtrise métabolique`, `renforcement métabolique`).
- **Table de Remplacement Obligatoire** :
  - `naturopathie` ➔ supprimer la référence
  - `bilan/profil métabolique` ➔ `profil fitness`
  - `diagnostic` ➔ `aperçu`, `synthèse` ou `quiz de profil fitness`
  - `synthèse protéique` ➔ `développement musculaire`
  - `renforcement métabolique` ➔ `entraînement à haute intensité`
  - `périodisation métabolique` ➔ `périodisation de l'effort`
  - `maîtrise métabolique` ➔ `constance`
  - `énergie cellulaire` ➔ `énergie`
- **Tarifs / Prix** : Ne jamais afficher de prix chiffrés fixes en dur dans l'application ou sur la landing page. Préférer des mentions de formules ("Accès Libre", "Formule Standard", "Formule Premium") et laisser l'interface de Stripe Checkout gérer dynamiquement la facturation.
- **Verrouillage Automatisé** : Tout commit ou déploiement doit valider `npm run compliance` sans aucune erreur.

## 💾 5. Architecture de Données & Persistance
- **Workout Actif** : `useActiveWorkoutStore` avec `AsyncStorage`.
- **Double Filet de Sécurité (Cloud Sync)** : `AppState` React Native sync instantanée vers Firestore sous `users/{uid}/activeWorkout/current`.
- **Firestore Rules** : Seul le webhook Netlify a les droits d'écriture sur les statuts d'abonnement Stripe.

## 🌐 6. Intégrité du Build Web (Expo SDK 56 & React Native Web)
- **Importation React Stricte** : `import React from 'react';` doit OBLIGATOIREMENT être conservé en haut de `App.tsx` et de tous les fichiers `.tsx` qui utilisent `React.Component`, `React.useState` ou `React.useEffect`. Ne jamais le supprimer lors des modifications.
- **Gabarit HTML Source (`public/index.html`)** : `public/index.html` est le modèle source unique pour `npx expo export -p web`. Il doit OBLIGATOIREMENT inclure :
  `html, body, #root, #root > div { width: 100%; height: 100%; min-height: 100vh; display: flex; flex-direction: column; flex: 1; background-color: #FBF8F3; }`
  pour garantir un étirement plein écran sans écran vert effondré.

