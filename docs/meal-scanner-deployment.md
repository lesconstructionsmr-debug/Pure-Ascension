# Meal Scanner — Guide de déploiement & tests QA

Ce guide couvre la configuration des variables d'environnement Netlify, le développement local, la sécurité, et les scénarios de test pour l'endpoint `/.netlify/functions/scan-meal`.

> Pure Ascension est un **outil de coaching fitness et nutrition**. Il ne remplace pas un avis médical professionnel.

---

## Prérequis

- Compte [Netlify](https://www.netlify.com/) avec le site Pure Ascension déployé
- Node.js 18+ et npm
- [Netlify CLI](https://docs.netlify.com/cli/get-started/) (`npm install -g netlify-cli`)
- Clé API Google AI (Gemini) — **requise en production** pour des résultats vision réels

---

## Variables d'environnement

### Meal Scanner (vision)

| Variable | Requis | Description |
|----------|--------|-------------|
| `GEMINI_API_KEY` | **Oui** (production) | Clé API Google Generative AI pour Gemini 2.0 Flash Vision |
| `OPENAI_API_KEY` | Non (repli) | Clé OpenAI pour GPT-4o-mini Vision si Gemini est indisponible |

Sans `GEMINI_API_KEY` ni `OPENAI_API_KEY`, la fonction retourne une estimation via le **moteur de repli par empreinte d'image** (`source: "fallback"`, déterministe, non basée sur la vision réelle).

### Firebase Admin (optionnel pour scan-meal)

Initialisé dans `scan-meal.ts` mais **non utilisé** pour la persistance d'images. Utile si d'autres fonctions Netlify partagent le même runtime :

| Variable | Description |
|----------|-------------|
| `FIREBASE_PROJECT_ID` | ID projet Firebase |
| `FIREBASE_CLIENT_EMAIL` | Email du compte de service |
| `FIREBASE_PRIVATE_KEY` | Clé privée PEM (avec `\n` échappés dans Netlify) |

> Ne jamais committer `netlify/functions/serviceAccountKey.json`. Préférer les variables d'environnement ci-dessus.

---

## Checklist de déploiement

Utilisez cette liste avant chaque mise en production du Meal Scanner :

- [ ] `GEMINI_API_KEY` configurée dans Netlify (scope **Production**)
- [ ] `OPENAI_API_KEY` configurée si repli OpenAI souhaité (optionnel)
- [ ] Variables Firebase Admin renseignées si d'autres fonctions en dépendent (optionnel pour scan-meal)
- [ ] Aucune clé API en dur dans le code source ou le dépôt Git
- [ ] `npm run compliance` passe sans erreur (terminologie légale)
- [ ] Test curl post-déploiement retourne `200` + `"source": "gemini"` (voir section Vérification)
- [ ] Function logs Netlify : message `Exécution de l'analyse visuelle via Google Gemini 2.0 Flash...`
- [ ] HSTS et CORS actifs (`netlify.toml` — pas de modification requise si fichier intact)
- [ ] Aucun log de Base64 complet en production

---

## Configuration Netlify Dashboard

1. Ouvrir **[Netlify Dashboard](https://app.netlify.com/)** → sélectionner le site **pure-ascension**
2. Aller dans **Site configuration** → **Environment variables**
3. Cliquer **Add a variable** → **Add a single variable**
4. Ajouter :

   | Key | Value | Scopes |
   |-----|-------|--------|
   | `GEMINI_API_KEY` | *(votre clé — voir Google AI Studio)* | Production, Deploy previews (optionnel) |
   | `OPENAI_API_KEY` | *(votre clé — optionnel)* | Production |

5. **Save** puis **Trigger deploy** → **Deploy site** pour recharger les fonctions avec les nouvelles variables

### Obtenir une clé Gemini

1. [Google AI Studio](https://aistudio.google.com/app/apikey) → **Create API key**
2. Restreindre la clé à l'API Generative Language si possible
3. Coller la valeur dans Netlify (jamais dans le dépôt Git, jamais dans la documentation)

---

## Développement local

### 1. Cloner et installer

```bash
git clone <repo-url>
cd mon-nouveau-projet
npm install
```

### 2. Créer le fichier `.env` local

Créer un fichier `.env` à la racine (listé dans `.gitignore`) :

```env
# ─── Meal Scanner Vision API ───────────────────────────────
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# ─── Firebase Admin (Netlify Functions) ──────────────────
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="your_private_key_with_escaped_newlines"
```

> **Important :** Ne jamais committer `.env`, `.env.local`, ni de vraies clés. Utiliser uniquement des placeholders dans la documentation.

### 3. Lancer Netlify Dev

```bash
npx netlify dev
```

Par défaut, le serveur local écoute sur **http://localhost:8888**.

Netlify Dev charge automatiquement les variables depuis :
- `.env`
- `.env.local` (si présent)

### 4. Tester l'endpoint local

```bash
curl -X POST "http://localhost:8888/.netlify/functions/scan-meal" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800"}'
```

Réponse attendue : `200` avec `"success": true`, `"source": "gemini"` (si clé configurée) et un objet `meal`.

### 5. Tester depuis l'app web Expo

Avec `expo start --web`, le client appelle `/.netlify/functions/scan-meal` en relatif — compatible avec `netlify dev` si les deux tournent simultanément.

Pour mobile natif, l'app cible `https://pure-ascension.netlify.app/.netlify/functions/scan-meal` par défaut.

---

## Déploiement production

### Build & deploy Netlify

Le fichier `netlify.toml` configure :

```toml
[build]
  functions = "netlify/functions"
  publish = "dist"
```

Workflow typique :

```bash
npm run build:web    # Export Expo web → dist/
git push origin main # Déclenche le build Netlify (CI)
```

Les fonctions serverless dans `netlify/functions/` sont déployées automatiquement à chaque build.

### Vérification post-déploiement

```bash
curl -X POST "https://pure-ascension.netlify.app/.netlify/functions/scan-meal" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800"}'
```

Contrôler dans les **Function logs** Netlify :
- `Exécution de l'analyse visuelle via Google Gemini 2.0 Flash...` → clé Gemini active
- `Exécution de l'analyse visuelle via OpenAI GPT-4o Vision...` → repli OpenAI
- `Clés API distantes absentes ou indisponibles : activation du Moteur d'Analyse d'Empreinte d'Image` → mode fallback

---

## Sécurité — Ne jamais committer de clés

| ✅ À faire | ❌ À ne pas faire |
|-----------|-------------------|
| Utiliser les variables Netlify Dashboard | Coder `GEMINI_API_KEY` en dur dans `.ts` |
| Maintenir des placeholders dans la doc | Committer `.env`, `.env.local`, `.env.production` |
| Ajouter `serviceAccountKey.json` au `.gitignore` | Pousser `netlify/functions/serviceAccountKey.json` |
| Rotater les clés si fuite suspectée | Partager les clés par Slack/email |
| Transmettre les images en Base64 sur HTTPS uniquement (prod) | Exposer des clés via `EXPO_PUBLIC_*` |

Si une clé a été exposée :
1. Révoquer immédiatement dans Google AI Studio / OpenAI
2. Générer une nouvelle clé
3. Mettre à jour Netlify Environment Variables
4. Redéployer le site

### Mesures de sécurité image (résumé)

| Mesure | Détail |
|--------|--------|
| Transit | Base64 dans corps JSON, **HTTPS obligatoire** en production |
| Taille max | **5 Mo** binaire décodé (`MAX_BASE64_BYTES`) |
| Persistance | **Aucune** — traitement en mémoire uniquement |
| CORS | `Access-Control-Allow-Origin: *` sur les fonctions |
| HSTS | Activé globalement via `netlify.toml` |
| Sanitisation | Termes médicaux interdits filtrés via `sanitizeText()` |
| Logs | Ne pas logger le Base64 complet |

Voir le détail complet dans [`meal-scanner-api.md`](./meal-scanner-api.md#sécurité--transit-et-traitement-des-images).

---

## Conformité avant déploiement

Exécuter le contrôle terminologique obligatoire :

```bash
npm run compliance
```

Le script scanne `src/`, `netlify/` et `public/` pour les termes médicaux interdits. Tout déploiement doit passer sans erreur.

---

## Guide QA — Scénarios de test

Ces scénarios couvrent l'API directement (curl/Postman) et l'expérience in-app (`MealScannerModal`).

### Préparation

| Outil | Usage |
|-------|-------|
| App mobile ou web Expo | Tests UI complets |
| `curl` ou Postman | Tests API isolés |
| Netlify Function logs | Vérifier `source` et erreurs |
| Mode avion / DevTools offline | Test repli client |

---

### Scénario 1 — Photo nette d'un repas (happy path)

**Objectif :** Vérifier une analyse vision réelle avec confiance élevée.

**Étapes :**
1. Ouvrir **Repas** → **Scanner IA**
2. Prendre ou importer une photo nette d'une assiette (lumière naturelle, plat centré)
3. Attendre la fin de l'analyse

**Résultat attendu :**
- `200`, `"success": true`, `"source": "gemini"` (ou `"openai"` si repli)
- Nom de plat cohérent, macros > 0, `confidence` ≥ 0.70
- Liste `items` non vide avec portions en grammes
- Badge source visible si implémenté (`Gemini Vision`)
- Haptique succès, champs éditables avant ajout au journal

**Test API équivalent :**

```bash
curl -X POST "https://pure-ascension.netlify.app/.netlify/functions/scan-meal" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800"}'
```

---

### Scénario 2 — Photo floue ou mal éclairée

**Objectif :** Vérifier la gestion d'une image de faible qualité.

**Étapes :**
1. Photographier un repas en mouvement, dans l'obscurité, ou volontairement flou
2. Lancer le scan

**Résultat attendu :**
- `200` avec analyse (pas d'erreur HTTP)
- `confidence` entre **0.40 et 0.65** (prompt IA)
- `fitnessNote` mentionne la qualité d'image ou l'incertitude
- L'utilisateur peut ajuster les macros manuellement avant validation

---

### Scénario 3 — Image non alimentaire

**Objectif :** Vérifier le rejet des objets, visages, paysages, documents.

**Étapes :**
1. Photographier un clavier, un visage, un paysage ou un écran
2. Lancer le scan

**Résultat attendu (API) :**
- `422`, `"code": "NOT_FOOD"`
- `"success": false`, objet `meal` avec `"isFood": false`, macros à 0

**Résultat attendu (app) :**
- Message : *« Aucun aliment détecté sur cette photo… »*
- Pas d'ajout automatique au journal calorique
- Haptique d'avertissement

**Test API :**

```bash
curl -X POST "https://pure-ascension.netlify.app/.netlify/functions/scan-meal" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800"}'
```

*(URL clavier/bureau — ajuster si le modèle détecte quand même de la nourriture)*

---

### Scénario 4 — Repli offline / backend indisponible

**Objectif :** Vérifier le comportement client quand l'API est inaccessible.

**Étapes :**
1. Activer le **mode avion** ou bloquer le réseau (DevTools → Offline)
2. Prendre une photo de repas et lancer le scan
3. Attendre l'échec réseau

**Résultat attendu :**
- L'app affiche le repas de repli local `OFFLINE_FALLBACK_MEAL` :
  - Titre : *« Poulet Grillé, Riz Basmati & Brocolis »*
  - `source: "fallback"`, badge *« Estimation locale »*
  - kcal ≈ 540, confiance ≈ 0.92
- L'utilisateur peut modifier et ajouter au journal
- Pas de crash ni écran blanc

**Note :** Ce repli est **côté client** (`MealScannerModal.tsx`). Le repli serveur (`analyzeImageHash`) s'active quand les clés IA sont absentes mais l'API répond quand même.

---

### Scénario 5 — Repli serveur sans clés IA

**Objectif :** Vérifier le moteur empreinte d'image quand Gemini/OpenAI sont indisponibles.

**Étapes :**
1. En local, retirer `GEMINI_API_KEY` et `OPENAI_API_KEY` du `.env`
2. Relancer `netlify dev`
3. Envoyer une requête avec une image valide

**Résultat attendu :**
- `200`, `"source": "fallback"`
- Plat parmi les profils prédéfinis (ex. Saumon & Quinoa, Buddha Bowl…)
- `confidence` ≈ 0.82–0.94 (déterministe selon hash)
- Log : `activation du Moteur d'Analyse d'Empreinte d'Image`

---

### Scénario 6 — Image trop volumineuse (> 5 Mo)

**Objectif :** Vérifier le rejet côté serveur.

**Étapes :**
1. Préparer une image > 5 Mo (ou simuler via curl avec un gros payload Base64)
2. Envoyer à l'API

**Résultat attendu :**
- `400`, `"code": "IMAGE_TOO_LARGE"`
- Message : *« Image trop volumineuse (max 5 Mo). »*
- L'app mobile avec `quality: 0.7` ne devrait normalement pas atteindre cette limite

---

### Scénario 7 — Requête invalide (sans image)

**Objectif :** Vérifier la validation d'entrée.

**Test API :**

```bash
curl -X POST "https://pure-ascension.netlify.app/.netlify/functions/scan-meal" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Résultat attendu :**
- `400`, `"code": "MISSING_IMAGE"`

---

### Scénario 8 — Méthode HTTP incorrecte

```bash
curl -X GET "https://pure-ascension.netlify.app/.netlify/functions/scan-meal"
```

**Résultat attendu :**
- `405`, `"code": "METHOD_NOT_ALLOWED"`

---

### Scénario 9 — Clé API personnelle (option avancée)

**Objectif :** Vérifier le flux clé utilisateur → appel direct → repli serveur.

**Étapes :**
1. Dans les paramètres du scanner, saisir une clé Gemini valide
2. Scanner un repas

**Résultat attendu :**
- Analyse directe depuis l'app (`source: "custom"`)
- Si la clé échoue : repli automatique sur le backend Netlify
- La clé reste en AsyncStorage local, jamais envoyée au serveur Pure Ascension

---

### Scénario 10 — Conformité terminologique

**Objectif :** S'assurer qu'aucune réponse IA ne contient de termes médicaux interdits.

**Étapes :**
1. Scanner 5 repas variés en production
2. Lire `fitnessNote`, `name` et `items[].name` dans les réponses
3. Exécuter `npm run compliance` sur le dépôt

**Résultat attendu :**
- Vocabulaire fitness uniquement (énergie, développement musculaire, profil fitness…)
- Aucun terme de la liste interdite (voir `meal-scanner-api.md`)
- `npm run compliance` : 0 erreur

---

## Dépannage

| Symptôme | Cause probable | Action |
|----------|---------------|--------|
| Toujours `"source": "fallback"` | Pas de clé Gemini/OpenAI | Vérifier `GEMINI_API_KEY` dans Netlify, redéployer |
| `405 Method Not Allowed` | Requête GET au lieu de POST | Utiliser `POST` avec `Content-Type: application/json` |
| `400 IMAGE_TOO_LARGE` | Image > 5 Mo | Réduire résolution / `quality` du picker |
| Timeout (> 10 s) | Image lourde ou latence IA | Réduire la résolution ; vérifier quotas Gemini |
| CORS bloqué en local | Origin non autorisé | Utiliser `netlify dev` ou vérifier headers `netlify.toml` |
| Gemini HTTP 403 | Clé invalide ou API non activée | Regénérer la clé, activer Generative Language API |
| `429 QUOTA_EXCEEDED` | Quota Gemini épuisé sur tous les modèles | Voir la section ci-dessous |
| `422 NOT_FOOD` sur vraie assiette | Photo trop partielle ou angle extrême | Reprendre avec l'assiette centrée et bien éclairée |
| App affiche repas générique offline | Réseau coupé | Comportement attendu (`OFFLINE_FALLBACK_MEAL`) |

### Quota Gemini épuisé — panne silencieuse la plus fréquente

Symptôme côté app : le scanner ne rend jamais de résultat. Côté API : `429`
avec le code `QUOTA_EXCEEDED`.

Le palier gratuit de l'API Gemini impose un nombre d'analyses par minute **et**
par jour, compté séparément pour chaque modèle. `callGeminiVision` parcourt donc
une cascade (`gemini-2.0-flash-lite` → `gemini-2.0-flash` → `gemini-2.5-flash-lite`
→ `gemini-2.5-flash`) : un `429` sur un modèle n'interrompt pas l'analyse, le
suivant est tenté. Le code `QUOTA_EXCEEDED` n'apparaît que si **tous** ont saturé.

Diagnostic — les journaux de la fonction donnent la réponse exacte de Google :

```bash
npx netlify logs --source functions --function scan-meal --since 30m
```

Correction durable : activer la facturation sur le projet Google AI Studio
associé à `GEMINI_API_KEY`. Le palier payant supprime les limites journalières,
et une analyse d'image sur un modèle Flash coûte une fraction de centime.

Vérification de bout en bout après correction (crée puis supprime un compte de
test, et effectue une vraie analyse) :

```bash
node scratch/audit-scan-meal.js https://pure-ascension.netlify.app
```

---

## Références

| Document / Fichier | Contenu |
|--------------------|---------|
| [`meal-scanner-api.md`](./meal-scanner-api.md) | Contrat JSON complet, codes d'erreur, sécurité |
| `netlify/functions/scan-meal.ts` | Handler Netlify |
| `netlify/functions/meal-scan-core.ts` | Pipeline vision, `MAX_BASE64_BYTES` |
| `src/services/mealScannerService.ts` | Client API, parsing, repli offline |
| `src/components/MealScannerModal.tsx` | UI scanner |
