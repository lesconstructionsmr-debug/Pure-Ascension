# Meal Scanner API — Pure Ascension

> **Endpoint principal :** `POST /.netlify/functions/scan-meal`  
> **Alias compatible :** `POST /.netlify/functions/scan-meal-photo` (même contrat)  
> **Implémentation :** `netlify/functions/scan-meal.ts` · logique partagée : `netlify/functions/meal-scan-core.ts`

Pure Ascension est un **outil de coaching fitness et nutrition**. Cette API estime visuellement les macronutriments d'un repas à partir d'une photo. Elle **ne remplace pas un avis médical professionnel** et ne doit produire **aucune allégation médicale**.

---

## Vue d'ensemble

| Propriété | Valeur |
|-----------|--------|
| Méthode | `POST` |
| Content-Type | `application/json` |
| Auth | **ID token Firebase obligatoire** — en-tête `Authorization: Bearer <idToken>` |
| Transport | **HTTPS obligatoire en production** (`https://pure-ascension.netlify.app`) |
| CORS | `Access-Control-Allow-Origin: *` |
| Réponse succès | `200` + JSON (`success: true`) |
| Réponse erreur | `400`, `401`, `405`, `422` + JSON (`success: false`) |

---

## Authentification

Chaque analyse consomme du crédit Gemini. L'endpoint est donc réservé aux comptes Pure Ascension authentifiés.

Le client envoie le token de l'utilisateur courant :

```ts
const idToken = await auth.currentUser.getIdToken();
// Authorization: `Bearer ${idToken}`
```

Le serveur vérifie la signature RS256 du token contre les certificats publics Google
(`netlify/functions/verify-firebase-token.ts`), sans dépendance `firebase-admin`. Les certificats
sont mis en cache pour la durée de vie du conteneur, donc aucun appel réseau supplémentaire à chaud.

Contrôles effectués : algorithme `RS256`, `aud` = ID du projet Firebase, `iss` =
`https://securetoken.google.com/<projectId>`, `exp` non dépassé, `sub` présent, signature valide.

| Variable d'environnement | Rôle |
|--------------------------|------|
| `FIREBASE_PROJECT_ID` | ID du projet attendu dans `aud` / `iss` (défaut : `pure-ascension`) |
| `SCAN_REQUIRE_AUTH` | `false` désactive la vérification — **développement local uniquement** |

---

## Requête

### Corps JSON

Au moins **un** des champs image ci-dessous est **obligatoire**. Sans image, le serveur répond `400 MISSING_IMAGE`.

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `imageBase64` | `string` | Conditionnel | Image encodée en Base64. Accepte une chaîne brute ou un Data URI (`data:image/jpeg;base64,...`). |
| `image` | `string` | Conditionnel | Alias de `imageBase64` (rétrocompatibilité). |
| `imageUrl` | `string` | Conditionnel | URL **HTTPS** publique ; le serveur télécharge l'image et la convertit en Base64. |

**Priorité de résolution :** `imageBase64` ou `image` → sinon `imageUrl`.

### Formats d'image acceptés

- JPEG (`image/jpeg`) — défaut si MIME absent
- PNG (`image/png`)
- WebP (`image/webp`)

### Exemple — Base64 (Data URI)

```bash
curl -X POST "https://pure-ascension.netlify.app/.netlify/functions/scan-meal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -d '{
    "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }'
```

### Exemple — URL distante

```bash
curl -X POST "https://pure-ascension.netlify.app/.netlify/functions/scan-meal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -d '{
    "imageUrl": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800"
  }'
```

### Exemple — Développement local (`netlify dev`)

```bash
# SCAN_REQUIRE_AUTH=false dans .env pour tester sans token
curl -X POST "http://localhost:8888/.netlify/functions/scan-meal" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800"}'
```

> En local, HTTP est accepté pour le développement. En production, le client mobile cible exclusivement l'URL HTTPS Netlify.

---

## Réponse succès (`200`)

```json
{
  "success": true,
  "source": "gemini",
  "meal": {
    "name": "Poulet Rôti & Patates Douces",
    "calories": 520,
    "proteins": 48,
    "carbs": 46,
    "fats": 12,
    "fibers": 10,
    "fitnessNote": "Riche en glucides complexes et protéines maigres pour optimiser le niveau d'énergie.",
    "confidence": 0.87,
    "isFood": true,
    "items": [
      {
        "name": "Blanc de poulet rôti aux herbes",
        "portion": "180g",
        "calories": 290,
        "proteins": 44,
        "carbs": 0,
        "fats": 6,
        "fibers": 0
      }
    ],
    "mealName": "Poulet Rôti & Patates Douces",
    "totalCalories": 520,
    "totalProteins": 48,
    "totalCarbs": 46,
    "totalFats": 12,
    "totalFibers": 10,
    "healthAdvice": "Riche en glucides complexes...",
    "notes": "Riche en glucides complexes..."
  },
  "mealName": "Poulet Rôti & Patates Douces",
  "totalCalories": 520,
  "totalProteins": 48,
  "totalCarbs": 46,
  "totalFats": 12,
  "totalFibers": 10,
  "healthAdvice": "Riche en glucides complexes...",
  "items": []
}
```

### Champ `source`

| Valeur | Signification |
|--------|---------------|
| `gemini` | Analyse via Google Gemini 2.0 Flash Vision |
| `openai` | Repli via OpenAI GPT-4o-mini Vision |
| `fallback` | Moteur empreinte d'image (`analyzeImageHash`) — clés absentes ou IA indisponible |

### Schéma `meal`

| Champ | Type | Description |
|-------|------|-------------|
| `name` | `string` | Nom descriptif du plat (français) |
| `calories` | `number` | Calories totales estimées (kcal) |
| `proteins` | `number` | Protéines totales (g) |
| `carbs` | `number` | Glucides totaux (g) |
| `fats` | `number` | Lipides totaux (g) |
| `fibers` | `number` | Fibres alimentaires (g) |
| `fitnessNote` | `string` | Conseil nutritionnel fitness (sanitisé, sans terme médical) |
| `confidence` | `number` | Indice de confiance `0.0` – `1.0` |
| `isFood` | `boolean` | `true` si un repas a été détecté |
| `items` | `IdentifiedFoodItem[]` | Détail par aliment détecté |

### Schéma `IdentifiedFoodItem`

| Champ | Type | Description |
|-------|------|-------------|
| `name` | `string` | Nom de l'aliment |
| `portion` | `string` | Portion estimée (ex. `"150g"`, `"200ml"`) |
| `calories` | `number` | kcal pour cet aliment |
| `proteins` | `number` | Protéines (g) |
| `carbs` | `number` | Glucides (g) |
| `fats` | `number` | Lipides (g) |
| `fibers` | `number` | Fibres (g) |

**Alias de rétrocompatibilité** (présents sur `meal` et à la racine) : `mealName`, `totalCalories`, `totalProteins`, `totalCarbs`, `totalFats`, `totalFibers`, `healthAdvice`, `notes`.

---

## Réponse erreur

Format commun :

```json
{
  "success": false,
  "error": "Message lisible pour l'utilisateur ou le client",
  "code": "CODE_ERREUR"
}
```

Pour `NOT_FOOD`, un objet `meal` est inclus avec `isFood: false` et des macros à zéro :

```json
{
  "success": false,
  "error": "Aucun aliment détecté sur cette image.",
  "code": "NOT_FOOD",
  "meal": {
    "isFood": false,
    "name": "Aucun aliment détecté",
    "calories": 0,
    "proteins": 0,
    "carbs": 0,
    "fats": 0,
    "fibers": 0,
    "confidence": 0.15,
    "fitnessNote": "Cette image ne semble pas contenir de repas. Prenez une photo de votre assiette.",
    "items": []
  }
}
```

---

## Codes d'erreur HTTP

| Code | `code` | Condition | Comportement client |
|------|--------|-----------|---------------------|
| **200** | — | Succès IA, repli hash, ou exception interne non bloquante | Affiche le résultat |
| **200** | — | Preflight CORS (`OPTIONS`) | Corps vide |
| **400** | `INVALID_JSON` | Corps JSON illisible | Message d'erreur réseau |
| **400** | `MISSING_IMAGE` | Aucun champ `imageBase64`, `image` ou `imageUrl` | Message d'erreur |
| **400** | `INVALID_IMAGE` | Image Base64 vide | Message d'erreur |
| **400** | `IMAGE_TOO_LARGE` | Image > **5 Mo** (binaire décodé) | Inviter à réduire la photo |
| **400** | `INVALID_IMAGE_FORMAT` | MIME non supporté (JPEG/PNG/WebP requis) | Message d'erreur |
| **400** | `INVALID_IMAGE_URL` | URL bloquée (localhost, IP privée, schéma invalide) | Message d'erreur |
| **401** | `AUTH_REQUIRED` | En-tête `Authorization: Bearer` absent | `ScanAuthError` — inviter à se connecter |
| **401** | `AUTH_INVALID` | Token expiré, mal signé, ou d'un autre projet | `ScanAuthError` — inviter à se reconnecter |
| **405** | `METHOD_NOT_ALLOWED` | Méthode autre que `POST` / `OPTIONS` | — |
| **422** | `IMAGE_READ_ERROR` | Base64 corrompu ou échec téléchargement URL | Message d'erreur |
| **422** | `NOT_FOOD` | Vision IA : aucun aliment détecté | `NonFoodScanError` côté client |

> **Repli ultime :** si l'analyse IA échoue (clé absente, panne, timeout), le handler retourne `503`
> (`VISION_UNAVAILABLE` ou `SCAN_UNAVAILABLE`). Aucune estimation fictive n'est renvoyée.

---

## Chaîne de traitement (priorité)

1. **Authentification** — vérification du token Firebase (`401` si absent ou invalide)
2. **Validation** — JSON, présence image, taille ≤ 5 Mo, parse Base64 ou fetch URL
3. **Google Gemini 2.0 Flash** — modèle unique, le moins coûteux ; requiert `GEMINI_API_KEY`
4. **OpenAI GPT-4o-mini Vision** — repli d'urgence, **désactivé tant que `OPENAI_API_KEY` reste vide** (coût nettement supérieur)
5. **Échec** — `503`, sans estimation fictive

Toutes les sorties textuelles passent par `sanitizeText()` pour remplacer les termes interdits (ex. « profil fitness » au lieu de « profil métabolique »).

---

## Conformité légale & terminologie

### Mention obligatoire (UI)

> *Pure Ascension est un outil de coaching fitness et nutrition. Il ne remplace pas un avis médical professionnel.*

### Règles appliquées côté serveur

- Aucun terme médical ou de synthèse clinique dans les réponses IA
- Sanitisation automatique des termes interdits dans `name`, `fitnessNote` et `items[].name`
- Vocabulaire autorisé : « développement musculaire », « énergie », « profil fitness », « récupération physique », « gestion des glucides »

### Termes strictement interdits (exemples)

`naturopathie`, `diagnostic`, `sensibilité à l'insuline`, `soutien hépatique`, `énergie cellulaire`, `synthèse protéique`, `renforcement métabolique`, `périodisation métabolique`, `maîtrise métabolique`, `éliminer l'inflammation`

Validation automatisée : `npm run compliance`

---

## Sécurité — transit et traitement des images

### Transit HTTPS

| Contexte | Protocole | Détail |
|----------|-----------|--------|
| Production (app mobile) | **HTTPS** | `https://pure-ascension.netlify.app/.netlify/functions/scan-meal` |
| Production (web) | **HTTPS** | Même origine ou proxy Netlify |
| Développement local | HTTP | `http://localhost:8888` via `netlify dev` uniquement |
| Appels IA sortants | **HTTPS** | Gemini API et OpenAI API |

Netlify applique **HSTS** (`Strict-Transport-Security`) sur toutes les routes via `netlify.toml`.

### Encodage et taille

| Limite | Valeur | Constante code |
|--------|--------|----------------|
| Taille binaire max (décodée) | **5 Mo** | `MAX_BASE64_BYTES` dans `meal-scan-core.ts` |
| Payload JSON total | ≤ **6 Mo** | Plafond Netlify Functions (corps de requête) |
| Résolution conseillée | ≤ **2048 × 2048 px** | Qualité suffisante, latence réduite |

L'app mobile compresse via `expo-image-picker` (`quality: 0.7`, `aspect: [4, 3]`). Le serveur rejette les images dont le Base64 décodé dépasse 5 Mo avec `400 IMAGE_TOO_LARGE`.

Validation côté serveur :

```typescript
// meal-scan-core.ts
export const MAX_BASE64_BYTES = 5 * 1024 * 1024; // ~5 MB decoded
```

### Aucune persistance d'images

- Les images **ne sont pas stockées** côté serveur (pas de Firestore, pas de Storage, pas de disque)
- Traitement **transitoire en mémoire** : parse Base64 → appel IA → réponse JSON → fin de l'exécution Lambda
- Firebase Admin est initialisé dans `scan-meal.ts` pour compatibilité runtime, mais **n'est pas utilisé** pour persister les photos
- Ne pas logger le contenu Base64 complet en production

### CORS

Headers renvoyés par la fonction (`CORS_HEADERS`) :

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Methods: POST, OPTIONS
Content-Type: application/json
```

Headers globaux Netlify (`netlify.toml`) sur `/.netlify/functions/*` :

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type, Authorization, stripe-signature
Access-Control-Allow-Methods: GET, POST, OPTIONS
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
```

### Clés API

- `GEMINI_API_KEY` et `OPENAI_API_KEY` restent **exclusivement côté serveur** (variables Netlify)
- Ne jamais exposer ces clés dans le client Expo (`EXPO_PUBLIC_*` interdit pour les clés vision)
- Les clés personnelles utilisateur (option UI) sont stockées localement via AsyncStorage, jamais commitées

### Rate limiting (recommandations)

| Mesure | Recommandation |
|--------|----------------|
| Par IP | 30 requêtes / minute / IP |
| Par utilisateur authentifié | 60 requêtes / heure (si auth ajoutée) |
| Protection Netlify | Activer **Netlify Rate Limiting** ou un WAF en amont |
| Coût IA | Surveiller les quotas Gemini/OpenAI ; alerter si > 80 % du budget |
| Abus | Bloquer les payloads répétés identiques (> 10/min) |

---

## Références code

| Fichier | Rôle |
|---------|------|
| `netlify/functions/scan-meal.ts` | Handler Netlify principal |
| `netlify/functions/meal-scan-core.ts` | Pipeline vision, validation, sanitisation |
| `netlify/functions/scan-meal-photo.ts` | Alias rétrocompatible |
| `src/services/mealScannerService.ts` | Parsing client, détection non-alimentaire |
| `src/components/MealScannerModal.tsx` | UI scanner & journal calorique |
