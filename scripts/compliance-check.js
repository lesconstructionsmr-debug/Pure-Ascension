/**
 * Script de vérification automatisée de conformité réglementaire et médicale.
 * Ce script échoue immédiatement (exit code 1) si l'un des termes strictement interdits est détecté
 * dans le code source (src/, netlify/, assets/, public/).
 */

const fs = require('fs');
const path = require('path');

const FORBIDDEN_TERMS = [
  'naturopathie',
  'naturopathe',
  'naturopathique',
  'sensibilité à l\'insuline',
  'réinitialiser l\'insuline',
  'résistance à l\'insuline',
  'soutien hépatique',
  'détox hépatique',
  'surcharge hépatique',
  'énergie cellulaire',
  'périodisation métabolique',
  'maîtrise métabolique',
  'renforcement métabolique',
  'cartographie de vos cycles cellulaires',
  'éliminer l\'inflammation',
  'holistique',
  'holistiques',
];

const TARGET_DIRECTORIES = [
  path.join(__dirname, '..', 'src'),
  path.join(__dirname, '..', 'netlify'),
  path.join(__dirname, '..', 'public'),
];

const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.md'];

let totalErrors = 0;
let totalFilesChecked = 0;

function checkFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) return;

  totalFilesChecked++;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Éviter les faux positifs dans le script de check lui-même ou les commentaires de style guide
    if (filePath.includes('compliance-check.js')) return;

    FORBIDDEN_TERMS.forEach((term) => {
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(line)) {
        console.error(
          `\x1b[31m[ERREUR COMPLIANCE]\x1b[0m Terme interdit "${term}" trouvé dans :\n  -> ${filePath}:${index + 1}\n  Ligne : "${line.trim()}"\n`
        );
        totalErrors++;
      }
    });
  });
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        walkDir(fullPath);
      }
    } else {
      checkFile(fullPath);
    }
  });
}

console.log('🛡️  Démarrage du contrôle de conformité réglementaire et médicale...\n');

TARGET_DIRECTORIES.forEach((dir) => walkDir(dir));

console.log(`📊 Bilan : ${totalFilesChecked} fichiers contrôlés.`);

if (totalErrors > 0) {
  console.error(`\x1b[31m❌ ÉCHEC : ${totalErrors} violation(s) de conformité détectée(s).\x1b[0m`);
  process.exit(1);
} else {
  console.log('\x1b[32m✅ SUCCÈS : Aucune violation de conformité médicale ou réglementaire détectée.\x1b[0m');
  process.exit(0);
}
