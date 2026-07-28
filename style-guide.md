# Guide de Style Éditorial & UI/UX — Pure Ascension 🛡️🎨

Ce document établit la référence officielle concernant la ligne éditoriale, la conformité réglementaire, la charte graphique et l'expérience utilisateur de **Pure Ascension**.

---

## ⚖️ 1. Charte Terminologique & Conformité Réglementaire (Anti-Poursuites)

Pour prémunir Pure Ascension contre tout risque juridique (exercice illégal de la médecine ou allégations thérapeutiques non autorisées), **l'utilisation de termes médicaux ou naturopathiques est strictement bannie**.

### 🚫 Table de Mapping Réglémentaire des Termes

| Terme Proscrit ❌ | Équivalent Réglémentaire Autorisé ✅ | Contexte d'Utilisation & Directive Rédactionnelle |
| :--- | :--- | :--- |
| `naturopathie`, `naturopathe` | **bilan de vitalité**, **hygiène de vie**, **bilan métabolique** | Décrire l'approche globale et les fonctionnalités d'évaluation du bien-être. |
| `diagnostic` | **bilan de vitalité**, **analyse de forme**, **évaluation métabolique** | Évaluer l'état actuel de l'utilisateur sans poser d'acte médical. |
| `ordonnance`, `prescription` | **recommandations d'hygiène de vie**, **programme personnalisé** | Suggérer des routines d'hygiène de vie, de nutrition et de mouvement. |
| `traitement`, `remède`, `soin` | **accompagnement**, **routine bien-être**, **conseils personnalisés** | Désigner les modules et programmes d'optimisation de la vitalité. |
| `patient`, `malade` | **utilisateur**, **membre**, **client** | Nommer les personnes inscrites sur la plateforme. |
| `guérison`, `soigner`, `gérer la maladie` | **renforcement de la vitalité**, **optimisation de la forme**, **épanouissement** | Exprimer la valeur ajoutée et les bénéfices d'accompagnement. |
| `thérapie`, `thérapeutique` | **démarche globale**, **discipline de vie**, **coaching bien-être** | Caractériser la méthodologie d'accompagnement. |

---

## 💳 2. Règle Éditoriale de Tarification Dynamique

Afin de prévenir toute incohérence tarifaire et d'assurer une gestion fluide via Stripe, **aucun prix chiffré fixe ne doit être mentionné en dur dans le code ou l'UI**.

### 🎯 Formules d'Abonnement Officielles
- **Accès Libre** : Offre découverte ou fonctionnalités de base gratuites.
- **Formule Standard** : Accès complet aux routines quotidiennes et au suivi métabolique.
- **Formule Premium** : Accès étendu avec accompagnement avancé et fonctionnalités exclusives.

### 📝 Exemples d'Adaptation Rédactionnelle (Avant / Après)

#### ❌ Incorrect (Interdit) :
> *"Abonnez-vous à notre suivi naturopathique pour seulement 29€/mois et guérissez vos maux grâce à nos soins."*

#### ✅ Correct (Conforme & Standard) :
> *"Accédez à votre bilan de vitalité sur-mesure et optimisez votre hygiène de vie au quotidien. Découvrez nos offres Formule Standard et Formule Premium via notre paiement sécurisé."*

---

## 🎨 3. Charte Graphique & UI/UX (Design Luxe / Haut de Gamme)

Inspirée par l'élégance d'Apple et la clarté fonctionnelle de Stripe, la direction artistique repose sur des teintes organiques nobles et une typographie sophistiquée.

### 🎨 Palette de Couleurs

| Nom de la Couleur | Code HEX / HSL | Application UI/UX |
| :--- | :--- | :--- |
| **Sauge (Sage)** | `#8A9A86` / `hsl(108, 10%, 56%)` | Accents doux, badges, éléments végétaux rassurants. |
| **Terre Cuite (Clay)** | `#C86D51` / `hsl(14, 52%, 55%)` | Boutons d'action principaux (CTA), éléments d'emphase. |
| **Sable (Sand)** | `#FBF8F3` / `hsl(38, 50%, 97%)` | Arrière-plan neutre et chaleureux (remplace le blanc pur). |
| **Encre (Ink)** | `#1A1D1A` / `hsl(120, 5%, 11%)` | Couleur principale de typographie, cartes sombres, contrastes. |

### 🔤 Typographies

1. **Titres & Accroches : Spectral**
   - Style : Serif raffinée, élégante et intemporelle.
   - Usage : Titres de sections (`H1`, `H2`), slogans, cartes de célébration.

2. **Corps de Texte & Chiffres : Hanken Grotesk**
   - Style : Sans-serif géométrique, moderne et très lisible.
   - Usage : Paragraphes, labels de formulaires, indicateurs numériques, boutons.

---

## ⚡ 4. Micro-Interactions & Retours Haptiques

Chaque interaction majeure dans l'application mobile doit offrir un retour physique qualitatif :

```typescript
import * as Haptics from 'expo-haptics';

// Pression sur un bouton CTA principal
const handlePressCTA = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  // Action...
};

// Confirmation de validation d'un bilan ou formulaire
const handleSuccessValidation = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  // Action...
};
```

---

## 🔍 5. Checklist de Validation Éditoriale avant Déploiement

- [ ] Recherche globale du mot `naturopathie` (sensible à la casse ou non) : **0 résultat**.
- [ ] Recherche de termes médicaux (`diagnostic`, `ordonnance`, `soin`, `patient`) : **0 résultat en contexte non autorisé**.
- [ ] Recherche de prix chiffrés durs (`€`, `$`, `€/mois`) dans les composants UI et la landing page : **0 résultat**.
- [ ] Validation des contrastes typographiques avec le fond Sable (`#fbf8f3`).
- [ ] Vérification du déclenchement haptique sur tous les boutons interactifs.
