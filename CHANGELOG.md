# Changelog — Pure Ascension 🛡️

Toutes les modifications notables apportées à ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

---

## [1.1.0] - 2026-07-26 — Documentation Réglementaire & Verrouillage des Règles de Contribution

### ⚖️ Conformité Réglementaire — Documentation & Verrouillage

> **Responsable** : Documentation Compliance Agent (Rédacteur Technique Pure Ascension)
> **Périmètre** : Mise en conformité anti-poursuites totale — Création des documents de gouvernance éditoriale et réglementaire du projet.

#### 📄 Fichiers Créés / Modifiés

| Fichier | Action | Description |
|:---|:---:|:---|
| `STYLE_GUIDE.md` | ✅ Créé | Charte éditoriale officielle — référence contraignante de conformité |
| `CHANGELOG.md` | 🔄 Mis à jour | Entrée v1.1.0 — Documentation de la mise en conformité |
| `AGENTS.md` | 🔄 Mis à jour | Ajout de la section `## ⚖️ Conformité Réglementaire & Médicale` |

#### 🚫 Termes Bannis Documentés (14 catégories)

Les termes suivants sont maintenant officiellement bannis et documentés avec leur raison légale et leur sévérité dans `STYLE_GUIDE.md` :

| Terme Proscrit | Sévérité | Remplacé par |
|:---|:---:|:---|
| `naturopathie`, `naturopathe`, `naturopathique` | 🔴 CRITIQUE | `bilan de vitalité`, `hygiène de vie`, `bilan métabolique` |
| `diagnostic`, `poser un diagnostic` | 🔴 CRITIQUE | `bilan de vitalité`, `analyse de forme` |
| `ordonnance`, `prescription`, `prescrire` | 🔴 CRITIQUE | `recommandations personnalisées`, `programme d'hygiène de vie` |
| `traitement`, `traiter une maladie` | 🔴 CRITIQUE | `accompagnement`, `routine bien-être` |
| `guérison`, `guérir`, `soigner` | 🔴 CRITIQUE | `renforcement de la vitalité`, `épanouissement` |
| `thérapie`, `thérapeutique`, `thérapeute` | 🔴 CRITIQUE | `démarche globale`, `coaching bien-être` |
| `patient`, `malade` | 🟠 ÉLEVÉE | `utilisateur`, `membre`, `client` |
| `remède`, `remède naturel` | 🟠 ÉLEVÉE | `conseil de vitalité`, `recommandation bien-être` |
| `maladie`, `pathologie`, `symptôme` | 🟠 ÉLEVÉE | *Éviter tout contexte* |
| `cure`, `protocole médical` | 🟠 ÉLEVÉE | `programme personnalisable` |
| `détoxification médicale` | 🟡 MODÉRÉE | `programme de vitalité` |
| `prévention des maladies` | 🟡 MODÉRÉE | `maintien de votre vitalité` |
| `clinique`, `cabinet médical` | 🟡 MODÉRÉE | *Éviter tout contexte* |
| Prix fixes (`29€/mois`, `99€`) | 🟠 ÉLEVÉE | Formules Stripe dynamiques |

#### 📜 Mentions Légales Obligatoires Officialisées

- **Écran Onboarding** : Mention légale complète (voir `STYLE_GUIDE.md §4.1`)
- **Section Paramètres > Mentions légales** : Version condensée (voir `STYLE_GUIDE.md §4.2`)
- **Footer Landing Page** : Balise `<p class="legal-notice">` (voir `STYLE_GUIDE.md §4.3`)

#### 🔒 Gate de Conformité CI/CD

- **Script** : `npm run compliance` — Obligation avant tout commit
- **Workflow** : `compliance → tsc --noEmit → commit → PR → CI/CD Netlify → merge`
- **Blocage** : Tout commit contenant un terme interdit est systématiquement rejeté

#### 💳 Règle Zéro Prix Fixes — Officialisée

- Aucun prix chiffré (`€`, `$`) en dur dans l'UI, le marketing ou le code
- Price IDs Stripe dans `EXPO_PUBLIC_STRIPE_PRICE_STANDARD` / `EXPO_PUBLIC_STRIPE_PRICE_PREMIUM`
- Affichage des montants délégué entièrement à Stripe Checkout

---

## [Unreleased] - 2026-07-26

### ⚖️ Refonte Terminologique Réglementaire & Conformité Juridique (Strict Anti-Poursuites)
- **Élimination intégrale du vocabulaire naturopathique et médical** :
  - Banissement strict du mot **"naturopathie"** et de tous ses dérivés dans le code source, les interfaces utilisateur, la landing page, et la documentation.
  - Remplacement par les concepts réglementés et autorisés : **"bilan de vitalité"**, **"hygiène de vie"**, et **"bilan métabolique"**.
  - Substitution du lexique médical (*diagnostic*, *ordonnance*, *patient*, *traitement*, *soin*, *guérison*, *thérapie*) par une terminologie orientée bien-être et accompagnement (*accompagnement*, *conseils d'hygiène de vie*, *utilisateur/membre*, *programme personnalisabilité*, *optimisation de vitalité*).
- **Verrouillage de la Tarification Dynamique** :
  - Suppression de tous les prix chiffrés fixes en dur (ex: `29€/mois`, `99€`) de l'application mobile et de la landing page pour éviter tout litige ou incohérence tarifaire.
  - Adoption exclusive des dénominations de formules d'abonnement (**"Accès Libre"**, **"Formule Standard"**, **"Formule Premium"**) couplées à une redirection dynamique vers le checkout Stripe Checkout.

### 📚 Documentation & Normes Éditioriales
- **Création du guide d'aide à la contribution (`CONTRIBUTING.md`)** :
  - Intégration des consignes strictes sur la conformité légale anti-poursuites.
  - Ajout des règles de contribution pour Expo SDK 56, TypeScript, et le respect des variables d'environnement `EXPO_PUBLIC_*`.
- **Création du Guide de Style Éditorial & UI (`style-guide.md`)** :
  - Cartographie exhaustive des termes proscrits et de leurs équivalents réglementaires autorisés.
  - Définition du Ton de Voix (Luxe, Apple/Stripe-inspired, bien-être, empouvoirment sans allégations de santé).
  - Charte graphique premium (Couleurs Sauge, Terre Cuite, Sable `#fbf8f3`, Encre; Typographies Spectral & Hanken Grotesk).
- **Mise à jour d'AGENTS.md** :
  - Consolidation des directives d'équipe et des consignes systèmes d'IA.

### 🔒 Sécurité & Conformité de Données
- **Gestion des Clés d'API** : Interdiction absolue des clés Firebase / Stripe codées en dur, obligation d'utiliser `process.env` et le préfixe `EXPO_PUBLIC_` pour le client.
- **Règles Firestore & Stripe** : Droits d'écriture des statuts d'abonnement réservés exclusivement au Webhook Netlify Stripe.
- **Mode Démo** : Encadrement strict de l'affichage du mode démo sous condition `{__DEV__ && (...)}`.

### 🎨 UI/UX & Micro-interactions
- **Expo Haptics** : Intégration systématique du retour haptique via `expo-haptics` (`Haptics.impactAsync`, `Haptics.notificationAsync`) sur l'ensemble des boutons et validations d'actions.
- **Animations** : Standardisation des transitions et micro-animations fluides avec `react-native-reanimated`.
