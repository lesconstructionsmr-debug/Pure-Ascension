/**
 * Affiche les portées (scopes) et contextes des variables d'environnement Netlify.
 * Aucune valeur n'est affichée — uniquement les noms et leur configuration.
 */
const { execSync } = require('child_process');

const SITE_ID = 'e29f2e24-5fd8-4a4f-93ca-05bf880c6856';

function api(method, payload) {
  // Windows : les guillemets internes doivent être échappés pour cmd.exe
  const json = JSON.stringify(payload).replace(/"/g, '\\"');
  const out = execSync(`npx netlify api ${method} --data "${json}"`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const first = out.search(/[[{]/);
  return JSON.parse(out.slice(first));
}

const site = api('getSite', { site_id: SITE_ID });
const accountId = site.account_slug || site.account_id;

const vars = api('getEnvVars', { accountId, siteId: SITE_ID });

console.log('\nVariables du site (aucune valeur affichée) :\n');
console.log('CLÉ'.padEnd(24) + 'PORTÉES'.padEnd(38) + 'CONTEXTES');
console.log('-'.repeat(90));

for (const v of vars.sort((a, b) => a.key.localeCompare(b.key))) {
  const scopes = (v.scopes || []).join('+');
  const contexts = (v.values || [])
    .map((x) => x.context + (x.context_parameter ? `:${x.context_parameter}` : ''))
    .join(', ');
  const flag = v.key === 'GEMINI_API_KEY' ? ' ←' : '';
  console.log(v.key.padEnd(24) + scopes.padEnd(38) + contexts + flag);
}

console.log('\nLongueur des valeurs en contexte production (contrôle de troncature) :');
for (const v of vars) {
  const prod = (v.values || []).find((x) => x.context === 'production' || x.context === 'all');
  const len = prod && typeof prod.value === 'string' ? prod.value.length : null;
  console.log('  LEN ' + v.key.padEnd(24) + (len === null ? 'non expose' : `${len} chars`));
}

const gemini = vars.find((v) => v.key === 'GEMINI_API_KEY');
console.log('\n--- Diagnostic GEMINI_API_KEY ---');
if (!gemini) {
  console.log('ABSENTE du site : le scanner ne peut pas fonctionner.');
} else {
  const scopes = gemini.scopes || [];
  const contexts = (gemini.values || []).map((x) => x.context);
  console.log('Visible par les fonctions :', scopes.includes('functions') ? 'OUI' : 'NON  ⚠️');
  console.log('Contexte production      :', contexts.includes('production') || contexts.includes('all') ? 'OUI' : 'NON  ⚠️');
  console.log('Portées configurées      :', scopes.join(', ') || '(aucune)');
  console.log('Contextes configurés     :', contexts.join(', ') || '(aucun)');

  console.log('\nRemplissage par contexte (longueur seulement) :');
  for (const v of gemini.values || []) {
    const len = typeof v.value === 'string' ? v.value.length : null;
    const etat = len === null ? 'valeur masquée par l\'API' : len === 0 ? 'VIDE  ⚠️' : `${len} caractères`;
    console.log('  ' + String(v.context).padEnd(16) + etat);
  }
}
console.log('');
