# 📖 Charte Éditoriale & Guide de Style — Pure Ascension 🛡️

> **Document de référence officiel** — Toute contribution au projet Pure Ascension doit impérativement respecter les règles définies dans ce guide.
> **Version** : 1.1.0 — **Dernière mise à jour** : 2026-07-26
> **Statut** : ✅ Document de conformité contraignant (Obligatoire pour tous les contributeurs)

---

## ⚖️ 1. Termes Interdits — Lexique Proscrit & Raisons Légales/Médicales

L'utilisation de tout terme à connotation médicale ou naturopathique est **strictement interdite** dans l'ensemble du projet : code source, interfaces utilisateur, métadonnées SEO, landing page, emails transactionnels, documentation et commentaires visibles par les utilisateurs finaux.

> **Raison légale fondamentale** : En France, l'exercice illégal de la médecine (Art. L. 4161-1 du Code de la Santé Publique) et les allégations thérapeutiques non autorisées (Règlement CE n° 1924/2006) exposent la société à des poursuites pénales et civiles. Pure Ascension est une application de **coaching bien-être et hygiène de vie**, non un dispositif médical ou une pratique de soin réglementée.

### 🚫 Liste Complète des Termes Interdits

| # | Terme Proscrit ❌ | Raison Légale / Médicale | Sévérité |
|---|:---|:---|:---:|
| 1 | `naturopathie`, `naturopathe`, `naturopathique` | Exercice illégal de la médecine / pratique réglementée non reconnue en France | 🔴 CRITIQUE |
| 2 | `diagnostic`, `poser un diagnostic` | Acte médical réservé aux médecins (Art. L. 4161-1 CSP) | 🔴 CRITIQUE |
| 3 | `ordonnance`, `prescription`, `prescrire` | Acte médical exclusif au corps médical | 🔴 CRITIQUE |
| 4 | `traitement`, `traiter une maladie` | Connotation curative — exercice illégal de la médecine | 🔴 CRITIQUE |
| 5 | `guérison`, `guérir`, `soigner`, `soins médicaux` | Allégation thérapeutique non autorisée (CE 1924/2006) | 🔴 CRITIQUE |
| 6 | `thérapie`, `thérapeutique`, `thérapeute` | Terme réservé aux professionnels de santé agréés | 🔴 CRITIQUE |
| 7 | `patient`, `malade` | Implique une relation médecin-patient non établie | 🟠 ÉLEVÉE |
| 8 | `remède`, `remède naturel` | Allégation de santé non autorisée sans AMM | 🟠 ÉLEVÉE |
| 9 | `maladie`, `pathologie`, `symptôme` | Diagnostic médical implicite | 🟠 ÉLEVÉE |
| 10 | `cure`, `protocole médical` | Connotation thérapeutique / médicale | 🟠 ÉLEVÉE |
| 11 | `détoxification médicale`, `detox médical` | Allégation santé non validée par EFSA | 🟡 MODÉRÉE |
| 12 | `prévention des maladies` | Allégation de santé réglementée — formulation interdite sans dossier EFSA | 🟡 MODÉRÉE |
| 13 | `clinique`, `cabinet médical` | Implique un établissement de soin réglementé | 🟡 MODÉRÉE |
| 14 | Prix chiffrés fixes (`29€/mois`, `99€`, `199€`) | Risque de litige tarifaire / incohérence contractuelle | 🟠 ÉLEVÉE |

---

## ✅ 2. Formulations Autorisées — Table de Remplacement Officielle

Chaque terme interdit possède un ou plusieurs équivalents réglementaires approuvés. **Utiliser exclusivement les formulations ci-dessous.**

| Terme Proscrit ❌ | Formulation Autorisée ✅ | Exemple d'Usage Correct |
|:---|:---|:---|
| `naturopathie` | **bilan de vitalité** / **hygiène de vie** / **bilan métabolique** | *"Découvrez votre bilan de vitalité personnalisé"* |
| `naturopathe` | **coach bien-être** / **accompagnateur de vitalité** | *"Votre coach bien-être vous guide"* |
| `diagnostic` | **bilan de vitalité** / **analyse de forme** / **évaluation de votre hygiène de vie** | *"Commencez votre analyse de forme"* |
| `ordonnance` / `prescription` | **recommandations personnalisées** / **programme d'hygiène de vie** | *"Vos recommandations personnalisées sont prêtes"* |
| `traitement` | **accompagnement** / **programme personnalisable** / **routine bien-être** | *"Votre routine bien-être sur-mesure"* |
| `soin` / `soins` | **conseils personnalisés** / **programme d'optimisation** | *"Vos conseils personnalisés du jour"* |
| `guérison` / `guérir` | **renforcement de la vitalité** / **épanouissement** / **optimisation de la forme** | *"Optimisez votre vitalité au quotidien"* |
| `thérapie` | **démarche globale** / **discipline de vie** / **coaching bien-être** | *"Une démarche globale pour votre bien-être"* |
| `patient` | **utilisateur** / **membre** / **client** | *"Bienvenue, membre Pure Ascension"* |
| `remède` | **conseil de vitalité** / **recommandation bien-être** | *"Votre conseil de vitalité du jour"* |
| `maladie` | *Éviter tout contexte* / **déséquilibre de vitalité** (avec prudence) | *Ne pas mentionner les maladies* |
| Prix fixes | **Formule Standard** / **Formule Premium** / **Accès Libre** | *"Découvrez la Formule Premium"* |
| `prévention maladies` | **maintien de votre vitalité** / **équilibre de vie durable** | *"Pour maintenir votre vitalité au quotidien"* |

### 🗣️ Ton de Voix Officiel

| Dimension | Directive |
|:---|:---|
| **Registre** | Premium, bienveillant, empouvoirant — jamais médical ni alarmiste |
| **Personne** | 2ème personne du singulier (`vous` de politesse), direct et chaleureux |
| **Certitude** | Conditionnel ou nuancé pour tout bénéfice (*"peut vous aider à…"*, *"contribue à…"*) |
| **Interdiction** | Jamais de promesse de résultat médical ou chiffré non contractuel |
| **Inspiration** | Apple Health, Calm, Whoop — bien-être premium et scientifiquement neutre |

---

## 🔧 3. Règles de Contribution — Processus Obligatoire avant Commit

### 🛡️ Script de Conformité `npm run compliance`

**Tout nouveau texte, composant ou écran doit passer le script de conformité avant tout commit.**

```bash
# Lancer la vérification de conformité terminologique
npm run compliance

# Vérification combinée (conformité + TypeScript)
npm run compliance && npx tsc --noEmit
```

Le script `npm run compliance` analyse automatiquement :
- ✅ Absence de tous les termes de la liste interdite (Section 1)
- ✅ Absence de prix chiffrés fixes codés en dur
- ✅ Absence de clés API en dur (patterns Firebase / Stripe)
- ✅ Rapport avec fichiers et lignes incriminés

> **⚠️ Un commit contenant des termes interdits sera systématiquement rejeté par le CI/CD Netlify.**

### 📋 Checklist Obligatoire avant Pull Request

Avant de soumettre une Pull Request, le contributeur doit confirmer :

- [ ] **`npm run compliance` passe avec 0 erreur** — Aucun terme interdit détecté
- [ ] **`npx tsc --noEmit` passe sans erreur** — Code TypeScript valide
- [ ] **Aucun prix chiffré fixe** n'a été ajouté dans l'UI ou le marketing
- [ ] **Aucune clé API** n'est codée en dur (Firebase, Stripe, etc.)
- [ ] **La mention légale obligatoire** est présente dans tout nouvel écran d'onboarding
- [ ] **Les retours haptiques** sont intégrés sur tout nouveau bouton CTA
- [ ] **Les variables d'environnement** côté client utilisent le préfixe `EXPO_PUBLIC_`
- [ ] **La description de la PR** confirme explicitement la conformité anti-poursuites

### 🔄 Workflow de Contribution

```
Développement local
       ↓
npm run compliance  ← OBLIGATOIRE
       ↓
npx tsc --noEmit    ← OBLIGATOIRE
       ↓
git commit          ← Bloqué si compliance échoue
       ↓
Pull Request        ← Review + CI/CD Netlify
       ↓
Merge sur main      ← Déploiement automatique
```

---

## 📜 4. Mention Légale Obligatoire

### 4.1 Texte Exact — Écran d'Onboarding

Le texte suivant doit être affiché **mot pour mot** dans l'écran d'onboarding, avant toute collecte de données de bien-être :

```
Pure Ascension est une application de coaching bien-être et d'hygiène de vie.
Les informations, recommandations et contenus fournis par cette application ont
un caractère purement informatif et éducatif.

Ils ne constituent en aucun cas un acte médical, un diagnostic, une ordonnance
ou un avis médical. Ils ne se substituent pas à une consultation auprès d'un
professionnel de santé qualifié.

En cas de doute sur votre état de santé, consultez votre médecin ou un
professionnel de santé compétent.
```

### 4.2 Texte Court — Section Paramètres (`Settings`)

Une version condensée doit également apparaître dans **Paramètres > Mentions légales** :

```
Pure Ascension est une application d'hygiène de vie et de coaching bien-être.
Les contenus proposés sont informatifs et ne constituent pas un avis médical.
Consultez un professionnel de santé pour tout problème de santé.

© 2026 Pure Ascension — Tous droits réservés.
Politique de confidentialité | Conditions Générales d'Utilisation
```

### 4.3 Footer Landing Page

```html
<!-- Mention légale obligatoire dans le footer de la landing page -->
<p class="legal-notice">
  Pure Ascension est une plateforme de coaching bien-être et d'hygiène de vie.
  Les informations fournies ont un caractère purement informatif et ne constituent
  pas un avis médical. Consultez un professionnel de santé pour tout problème de santé.
  © 2026 Pure Ascension. Tous droits réservés.
</p>
```

---

## 💳 5. Règle Zéro Prix Fixes — Tarification Dynamique via Stripe Checkout

### Principe Fondamental

**Aucun prix chiffré fixe ne doit jamais être codé en dur** dans l'application mobile, la landing page, les emails transactionnels ou la documentation client.

### Formules d'Abonnement Officielles

| Formule | Désignation Officielle | Description Autorisée |
|:---:|:---|:---|
| 🆓 | **Accès Libre** | Accès aux fonctionnalités de découverte et au bilan de vitalité de base |
| ⭐ | **Formule Standard** | Accès complet aux routines quotidiennes et au suivi de l'hygiène de vie |
| 👑 | **Formule Premium** | Accès étendu avec accompagnement avancé et fonctionnalités exclusives |

### Règle d'Affichage des Prix

```typescript
// ❌ INTERDIT — Prix codé en dur
const price = "29€/mois";
<Text>Abonnez-vous pour {price}</Text>

// ✅ CORRECT — Redirection vers Stripe Checkout dynamique
const handleSubscribe = (plan: 'standard' | 'premium') => {
  // Le prix est récupéré dynamiquement depuis Stripe
  redirectToStripeCheckout(plan);
};
<Button onPress={() => handleSubscribe('premium')}>
  Découvrir la Formule Premium
</Button>
```

### Gestion des Prix via Stripe

- Les **Price IDs Stripe** sont stockés exclusivement dans les variables d'environnement (`EXPO_PUBLIC_STRIPE_PRICE_STANDARD`, `EXPO_PUBLIC_STRIPE_PRICE_PREMIUM`)
- L'affichage du montant réel est délégué **entièrement** à l'interface Stripe Checkout
- Le webhook Netlify est le **seul** autorisé à écrire les statuts d'abonnement dans Firestore

---

## 📊 6. Tableau de Bord des Règles — Récapitulatif

| Règle | Source Canonique | Statut |
|:---|:---|:---:|
| Zéro terme naturopathique ou médical dans le code | AGENTS.md §4 / STYLE_GUIDE §1 | 🔴 Obligatoire |
| Zéro prix chiffré fixe en dur | AGENTS.md §4 / STYLE_GUIDE §5 | 🔴 Obligatoire |
| `npm run compliance` avant tout commit | STYLE_GUIDE §3 | 🔴 Obligatoire |
| Mention légale dans l'onboarding et les Paramètres | STYLE_GUIDE §4 | 🔴 Obligatoire |
| Variables d'env avec préfixe `EXPO_PUBLIC_` | AGENTS.md §1 / CONTRIBUTING §2 | 🔴 Obligatoire |
| Retours haptiques sur tous les boutons CTA | AGENTS.md §2 | 🟠 Fortement recommandé |
| Mode Démo sous `{__DEV__ && (...)}` | AGENTS.md §3 | 🔴 Obligatoire |
| Firestore : droits d'écriture Stripe → Webhook only | AGENTS.md §5 | 🔴 Obligatoire |

---

*Ce document fait autorité sur tout autre document du projet en matière de conformité réglementaire et de charte éditoriale. En cas de conflit, se référer à ce guide et consulter l'équipe juridique.*
