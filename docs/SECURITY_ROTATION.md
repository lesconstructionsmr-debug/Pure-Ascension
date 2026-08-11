# Rotation secrets — Pure Ascension (P0)

À faire **manuellement** dans les consoles (ne jamais coller de clés ici ni dans git).

## 1. Firebase Admin
1. [Google Cloud Console](https://console.cloud.google.com/) → IAM → Comptes de service → clé Pure Ascension.
2. Créer une **nouvelle** clé JSON.
3. Netlify → Site settings → Environment variables :
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (garder les `\n` ou coller la PEM multi-lignes selon le format Netlify)
4. **Révoquer / supprimer** toutes les anciennes clés.
5. Sur ta machine : supprimer les fichiers locaux
   - `netlify/functions/serviceAccountKey.json`
   - `netlify/functions/pure-ascension-*.json`
   - tout autre `*adminsdk*.json`
6. Le code n’utilise plus `require('./serviceAccountKey.json')` — env uniquement.

## 2. Stripe (test)
1. Stripe Dashboard → Developers → API keys → Roll the **test** secret key.
2. Mettre à jour `STRIPE_SECRET_KEY` dans Netlify + ton `.env` local.
3. Si le webhook secret change : maj `STRIPE_WEBHOOK_SECRET`.

## 3. Vérifier le git
```bash
git log --all --full-history -- "*serviceAccount*" "*adminsdk*" ".env"
```
Si une clé a été poussée un jour : rotate (déjà fait) + purge historique (BFG / git filter-repo) + force-push coordonné.

## 4. CORS (optionnel)
`CORS_ALLOWED_ORIGINS=https://autre-domaine.com` (virgules) en env Netlify pour ajouter des origines.

## 5. Checklist confirmation (après déploiement)

- [ ] Netlify a `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` (scopes Functions / Runtime)
- [ ] Aucun `*serviceAccount*.json` / `*adminsdk*.json` restant dans le working tree
- [ ] Anciennes clés Admin **révoquées** dans Google Cloud (IAM → comptes de service → clés)
- [ ] Stripe test secret rotaté si jamais exposé ; `STRIPE_SECRET_KEY` à jour sur Netlify
- [ ] `firebase deploy --only firestore:rules` OK
- [ ] Checkout / Coach / Referral renvoient 401 sans Bearer

## 6. Ce que l’agent peut / ne peut pas faire
- **Peut** : supprimer les JSON locaux gitignorés, déployer rules, committer le code env-only.
- **Ne peut pas** : révoquer/créer des clés dans Google Cloud ou Stripe à ta place — tu dois cocher §1–2 dans les consoles.
