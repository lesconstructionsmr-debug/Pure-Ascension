const fs = require('fs');
const path = require('path');

// Root project directory
const ROOT_DIR = path.resolve(__dirname, '..');

// Target directories to scan relative to ROOT_DIR
const TARGET_DIRECTORIES = ['src', 'netlify/functions'];

// Target file extensions
const TARGET_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.md'];

// Define prohibited terms, patterns, and recommendations
const PROHIBITED_RULES = [
  {
    id: 'NATUROPATHY',
    term: 'naturopathie',
    patterns: [/naturopath(ie|e|ique|iques|ic)/i],
    description: "Le mot 'naturopathie' et ses dérivés sont strictement prohibés (conformité anti-poursuites).",
    recommendation: "Remplacer par 'bilan de vitalité', 'hygiène de vie', 'vitalité' ou 'santé globale'."
  },
  {
    id: 'INSULIN_CLAIMS',
    term: "sensibilité à l'insuline",
    patterns: [
      /sensibilit[eé]\s+à\s+l['’]insuline/i,
      /sensibilite\s+a\s+l['’]insuline/i,
      /r[eé]sistance\s+à\s+l['’]insuline/i,
      /resistance\s+a\s+l['’]insuline/i,
      / action\s+de\s+l['’]insuline/i,
      /r[eé]gule\s+l['’]insuline/i,
      /pic\s+d['’]insuline/i
    ],
    description: "Les allégations médicales relatives à l'insuline sont prohibées.",
    recommendation: "Remplacer par 'équilibre de la glycémie', 'énergie constante' ou 'gestion des sucres'."
  },
  {
    id: 'HEPATIC_CLAIMS',
    term: "soutien hépatique",
    patterns: [
      /soutien\s+h[eé]patique/i,
      /d[eé]tox\s+h[eé]patique/i,
      /drainage\s+h[eé]patique/i,
      /surcharge\s+h[eé]patique/i,
      /d[eé]toxifier\s+le\s+foie/i
    ],
    description: "Les allégations de soutien/détox/drainage hépatique sont prohibées.",
    recommendation: "Remplacer par 'drainage naturel', 'vitalité du foie', 'confort digestif' ou 'élimination naturelle'."
  },
  {
    id: 'METABOLIC_ASSESSMENT',
    term: "bilan métabolique",
    patterns: [
      /bilan\s+m[eé]tabolique/i,
      /diagnostic\s+naturopathique/i,
      /bilan\s+naturopathique/i,
      /bilans\s+naturopathiques/i
    ],
    description: "Les termes 'bilan métabolique' ou 'diagnostic naturopathique' sont assimilés à un acte médical réglementé.",
    recommendation: "Remplacer par 'bilan de vitalité', 'bilan d'hygiène de vie' ou 'évaluation de forme'."
  },
  {
    id: 'MEDICAL_CLAIMS',
    term: "allégations médicales",
    patterns: [
      /diagnostic\s+m[eé]dical/i,
      /traitement\s+m[eé]dical/i,
      /prescription\s+m[eé]dicale/i,
      /ordonnance\s+m[eé]dicale/i
    ],
    description: "Les termes d'actes médicaux réservés sont prohibés.",
    recommendation: "Remplacer par 'conseil d'hygiène de vie', 'accompagnement forme' ou 'routine vitalité'."
  }
];

function scanFile(filePath) {
  const violations = [];
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    PROHIBITED_RULES.forEach(rule => {
      rule.patterns.forEach(pattern => {
        const match = pattern.exec(line);
        if (match) {
          violations.push({
            ruleId: rule.id,
            term: rule.term,
            matchedText: match[0],
            filePath,
            relativePath: path.relative(ROOT_DIR, filePath),
            lineNumber,
            lineContent: line.trim(),
            description: rule.description,
            recommendation: rule.recommendation
          });
        }
      });
    });
  });

  return violations;
}

function scanDirectory(dirPath) {
  let results = [];
  if (!fs.existsSync(dirPath)) return results;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    // Ignore node_modules, .git, build folders, serviceAccount keys
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build' || entry.name === '__tests__') {
        continue;
      }
      results = results.concat(scanDirectory(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (TARGET_EXTENSIONS.includes(ext) && !entry.name.endsWith('.json.key')) {
        const fileViolations = scanFile(fullPath);
        results = results.concat(fileViolations);
      }
    }
  }

  return results;
}

function runComplianceCheck() {
  console.log('🔍 Execution du scanner de non-regression terminologique Pure Ascension...');
  console.log(`📁 Dossiers scannés : ${TARGET_DIRECTORIES.join(', ')}`);
  
  let allViolations = [];
  let filesCount = 0;

  TARGET_DIRECTORIES.forEach(dir => {
    const fullDirPath = path.join(ROOT_DIR, dir);
    const violations = scanDirectory(fullDirPath);
    allViolations = allViolations.concat(violations);
  });

  // Unique count of scanned files
  function countFiles(dirPath) {
    let count = 0;
    if (!fs.existsSync(dirPath)) return 0;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'dist', 'build', '__tests__'].includes(entry.name)) continue;
        count += countFiles(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (TARGET_EXTENSIONS.includes(ext)) count++;
      }
    }
    return count;
  }

  TARGET_DIRECTORIES.forEach(dir => {
    filesCount += countFiles(path.join(ROOT_DIR, dir));
  });

  console.log(`📄 Total de fichiers analyses : ${filesCount}`);

  if (allViolations.length > 0) {
    console.error(`\n❌ ATTENTION : ${allViolations.length} violation(s) terminologique(s) detectee(s) !\n`);
    allViolations.forEach((v, idx) => {
      console.error(`[Violation #${idx + 1}]`);
      console.error(`  Fichier     : ${v.relativePath}:${v.lineNumber}`);
      console.error(`  Règle       : ${v.ruleId} (${v.description})`);
      console.error(`  Texte detecte : "${v.matchedText}"`);
      console.error(`  Ligne       : ${v.lineContent}`);
      console.error(`  Conseil     : ${v.recommendation}\n`);
    });
  } else {
    console.log('\n✅ SUCCÈS : Aucune violation terminologique détectée. Le code est 100% conforme !');
  }

  return {
    success: allViolations.length === 0,
    filesCount,
    violationsCount: allViolations.length,
    violations: allViolations
  };
}

if (require.main === module) {
  const report = runComplianceCheck();
  if (!report.success) {
    process.exit(1);
  }
  process.exit(0);
}

module.exports = {
  runComplianceCheck,
  scanFile,
  scanDirectory,
  PROHIBITED_RULES
};
