/**
 * biomechanics.ts — Système expert biomécanique Pure Ascension
 * Fournit les 4 phases de séance, tempos normalisés (ex: 3-1-1-0), RPE cibles,
 * conseils d'exécution anatomiques et générateur d'alternatives 1-tap.
 */

export interface WorkoutPhaseInfo {
  phaseNumber: 1 | 2 | 3 | 4;
  name: string;
  shortName: string;
  category: 'warmup' | 'main' | 'accessory' | 'cooldown';
  description: string;
  color: string;
  bgColor: string;
  defaultRestSec: number;
  defaultRpe: string;
}

export const WORKOUT_PHASES: Record<1 | 2 | 3 | 4, WorkoutPhaseInfo> = {
  1: {
    phaseNumber: 1,
    name: 'Phase 1 • Échauffement & Activation',
    shortName: 'P1 · Activation',
    category: 'warmup',
    description: 'Mobilisation articulaire, élévation de température et activation neuromusculaire.',
    color: '#3B82F6', // Bleu vibrant
    bgColor: '#EFF6FF',
    defaultRestSec: 45,
    defaultRpe: 'RPE 5-6 (Échauffement / RIR 4)',
  },
  2: {
    phaseNumber: 2,
    name: 'Phase 2 • Force & Polyarticulaire',
    shortName: 'P2 · Force Principale',
    category: 'main',
    description: 'Mouvements fondamentaux lourds. Recrutement des unités motrices à haute intensité.',
    color: '#4E7358', // Sage Pure Ascension
    bgColor: '#EAF2EC',
    defaultRestSec: 90,
    defaultRpe: 'RPE 8-9 (Intense / RIR 1-2)',
  },
  3: {
    phaseNumber: 3,
    name: 'Phase 3 • Accessoires & Isolation',
    shortName: 'P3 · Hypertrophie',
    category: 'accessory',
    description: 'Volume ciblé et surcharge progressive sur les muscles agonistes et stabilisateurs.',
    color: '#C85D32', // Clay Pure Ascension
    bgColor: '#FCF2ED',
    defaultRestSec: 45,
    defaultRpe: 'RPE 7.5-8.5 (Volume / RIR 2)',
  },
  4: {
    phaseNumber: 4,
    name: 'Phase 4 • Retour au Calme & Récupération',
    shortName: 'P4 · Cooldown',
    category: 'cooldown',
    description: 'Baisse du tonus sympathique, étirements myofasciaux et régulation respiratoire.',
    color: '#8B5CF6', // Violet régénération
    bgColor: '#F5F3FF',
    defaultRestSec: 30,
    defaultRpe: 'RPE 3-4 (Récupération active)',
  },
};

export interface ExerciseBiomechanics {
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  tempoCode: string; // Ex: "3-1-1-0"
  tempoDescription: string; // Ex: "3s descente · 1s bas · 1s montée · 0s haut"
  rpeTarget: string; // Ex: "RPE 8 / 10"
  rpeNumeric: number; // 8
  biomechanicalTip: string;
  movementPattern: 'squat' | 'hinge' | 'push_horizontal' | 'push_vertical' | 'pull_horizontal' | 'pull_vertical' | 'lunge' | 'carry' | 'isolation' | 'core' | 'cardio';
  phaseNumber: 1 | 2 | 3 | 4;
  recommendedRestSec: number; // 90 or 45
}

export interface ExerciseAlternative {
  name: string;
  category: string; // e.g. "Quadriceps / Fessiers"
  equipment: 'Haltères' | 'Barre' | 'Poulie' | 'Machine' | 'Élastique' | 'Poids du corps';
  difficulty: 'Facile' | 'Équivalent' | 'Avancé';
  biomechanicMatch: string; // Rationale for why it's a 1:1 replacement
  tempoCode: string;
  rpeTarget: string;
}

/* ─── BASE DE DONNÉES BIOMÉCANIQUE EXHAUSTIVE ───────────────────────────── */
const BIOMECHANICS_DB: Record<string, Partial<ExerciseBiomechanics>> = {
  // SQUAT & PATRONS JAMBES
  'squat': {
    primaryMuscles: ['Quadriceps (Droit Fémoral, Vastes)', 'Fessiers (Grand Fessier)'],
    secondaryMuscles: ['Ischio-jambiers', 'Adducteurs', 'Érecteurs du Rachis'],
    tempoCode: '3-1-1-0',
    tempoDescription: '3s descente excentrique · 1s pause bas · 1s montée explosive · 0s pause haut',
    rpeTarget: 'RPE 8.5 / 10 (RIR 1-2)',
    rpeNumeric: 8.5,
    biomechanicalTip: 'Aligner genoux avec le 2e orteil. Ancrer le trépied du pied (talon, 1er et 5e métatarses). Conserver la colonne neutre.',
    movementPattern: 'squat',
    phaseNumber: 2,
    recommendedRestSec: 90,
  },
  'gobelet': {
    primaryMuscles: ['Quadriceps', 'Fessiers'],
    secondaryMuscles: ['Sangle Abdominale (Core)', 'Deltoïde Antérieur'],
    tempoCode: '3-1-1-0',
    tempoDescription: '3s descente · 1s pause bas · 1s montée · 0s haut',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: 'Placer l\'haltère contre le sternum. Pousser les coudes vers l\'intérieur des genoux en bas d\'amplitude.',
    movementPattern: 'squat',
    phaseNumber: 2,
    recommendedRestSec: 90,
  },
  'fente': {
    primaryMuscles: ['Quadriceps', 'Grand Fessier'],
    secondaryMuscles: ['Ischio-jambiers', 'Moyen Fessier (Stabilisateur)'],
    tempoCode: '2-1-1-0',
    tempoDescription: '2s descente verticale · 1s effleurement bas · 1s montée · 0s haut',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: 'Conserver le buste légèrement penché en avant (15°) pour engager le grand fessier. Garder le genou arrière aligné.',
    movementPattern: 'lunge',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },

  // HINGE / CHAÎNE POSTÉRIEURE
  'soulevé': {
    primaryMuscles: ['Ischio-jambiers (Biceps Fémoral)', 'Grand Fessier', 'Érecteurs du Rachis'],
    secondaryMuscles: ['Grand Dorsal', 'Trapèzes', 'Avant-bras (Grip)'],
    tempoCode: '3-1-1-0',
    tempoDescription: '3s descente contrôlée · 1s étirement · 1s verrouillage hanches · 0s haut',
    rpeTarget: 'RPE 8.5 / 10',
    rpeNumeric: 8.5,
    biomechanicalTip: 'Initier le mouvement par le recul des hanches (hip hinge). Garder la charge collée aux tibias et cuisses.',
    movementPattern: 'hinge',
    phaseNumber: 2,
    recommendedRestSec: 90,
  },
  'deadlift': {
    primaryMuscles: ['Ischio-jambiers', 'Fessiers', 'Chaine Postérieure globale'],
    secondaryMuscles: ['Lombaires', 'Trapèzes', 'Core'],
    tempoCode: '2-1-1-0',
    tempoDescription: '2s descente · 1s pose au sol · 1s tirage explosif · 0s haut',
    rpeTarget: 'RPE 9 / 10',
    rpeNumeric: 9,
    biomechanicalTip: 'Contracter les grands dorsaux ("casser la barre") avant de décoller. Pousser dans le sol plutôt que tirer.',
    movementPattern: 'hinge',
    phaseNumber: 2,
    recommendedRestSec: 90,
  },
  'thrust': {
    primaryMuscles: ['Grand Fessier (Contraction Maximale en Raccourcissement)'],
    secondaryMuscles: ['Ischio-jambiers', 'Quadriceps'],
    tempoCode: '2-1-2-0',
    tempoDescription: '2s montée · 1s contraction maximale haut · 2s descente contrôlée · 0s bas',
    rpeTarget: 'RPE 8.5 / 10',
    rpeNumeric: 8.5,
    biomechanicalTip: 'Rentrer le menton vers la poitrine (regard vers l\'avant). Basculer le bassin en rétroversion au sommet.',
    movementPattern: 'hinge',
    phaseNumber: 2,
    recommendedRestSec: 90,
  },

  // PUSH / POUSSÉE
  'développé': {
    primaryMuscles: ['Grand Pectoral (Faisceau Moyen/Claviculaire)', 'Deltoïde Antérieur'],
    secondaryMuscles: ['Triceps Brachial', 'Dentelé Antérieur'],
    tempoCode: '3-1-1-0',
    tempoDescription: '3s descente contrôlée · 1s contact poitrine · 1s poussée · 0s haut',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: 'Ancrer les omoplates en rétraction et dépression. Coudes inclinés à 45° par rapport au buste.',
    movementPattern: 'push_horizontal',
    phaseNumber: 2,
    recommendedRestSec: 90,
  },
  'pompe': {
    primaryMuscles: ['Grand Pectoral', 'Triceps Brachial'],
    secondaryMuscles: ['Deltoïde Antérieur', 'Transverse (Core)'],
    tempoCode: '2-1-1-0',
    tempoDescription: '2s descente · 1s bas · 1s poussée · 0s haut',
    rpeTarget: 'RPE 7.5 / 10',
    rpeNumeric: 7.5,
    biomechanicalTip: 'Garder le corps rigide de la tête aux talons. Serrer les fessiers et le transverse tout au long de la répétition.',
    movementPattern: 'push_horizontal',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },
  'dips': {
    primaryMuscles: ['Triceps Brachial', 'Bas du Pectoral', 'Deltoïde Antérieur'],
    secondaryMuscles: ['Stabilité Épaule'],
    tempoCode: '3-1-1-0',
    tempoDescription: '3s descente contrôlée à 90° · 1s pause · 1s extension · 0s haut',
    rpeTarget: 'RPE 8.5 / 10',
    rpeNumeric: 8.5,
    biomechanicalTip: 'Ne pas descendre en dessous de 90° de flexion de coude pour préserver la capsule antérieure de l\'épaule.',
    movementPattern: 'push_vertical',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },
  'militaire': {
    primaryMuscles: ['Deltoïde Antérieur & Moyen', 'Faisceau Claviculaire Pectoral'],
    secondaryMuscles: ['Triceps Brachial', 'Trapèze Supérieur', 'Core'],
    tempoCode: '2-1-1-0',
    tempoDescription: '2s descente sous le menton · 1s bas · 1s poussée verticale · 0s haut',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: 'Garder les avant-bras parfaitement verticaux. Verrouiller la sangle abdominale sans archer excessivement le bas du dos.',
    movementPattern: 'push_vertical',
    phaseNumber: 2,
    recommendedRestSec: 90,
  },

  // PULL / TIRAGE
  'traction': {
    primaryMuscles: ['Grand Dorsal', 'Grand Rond'],
    secondaryMuscles: ['Biceps Brachial', 'Rhomboïdes', 'Trapèze Moyen/Inférieur'],
    tempoCode: '3-1-1-1',
    tempoDescription: '3s descente contrôlée · 1s étirement · 1s tirage menton au-dessus barre · 1s contraction',
    rpeTarget: 'RPE 8.5 / 10',
    rpeNumeric: 8.5,
    biomechanicalTip: 'Tirer les coudes vers les hanches plutôt que de tirer avec les mains. Sortir la poitrine vers la barre.',
    movementPattern: 'pull_vertical',
    phaseNumber: 2,
    recommendedRestSec: 90,
  },
  'rowing': {
    primaryMuscles: ['Grand Dorsal', 'Rhomboïdes', 'Trapèzes Moyens'],
    secondaryMuscles: ['Biceps Brachial', 'Deltoïde Postérieur'],
    tempoCode: '2-1-1-1',
    tempoDescription: '2s retour étiré · 1s bas · 1s tirage au nombril · 1s resserrement omoplates',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: 'Buste penché à 45° ou parallèle au sol. Amener la barre/l\'haltère vers les hanches en serrant les omoplates.',
    movementPattern: 'pull_horizontal',
    phaseNumber: 2,
    recommendedRestSec: 90,
  },
  'tirage': {
    primaryMuscles: ['Grand Dorsal', 'Grand Rond'],
    secondaryMuscles: ['Biceps Brachial', 'Avant-bras'],
    tempoCode: '2-1-1-0',
    tempoDescription: '2s remontée · 1s étirement haut · 1s tirage poitrine · 0s bas',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: 'Léger inclinement du buste vers l\'arrière (10-15°). Tirer vers le haut de la poitrine sans balancer le buste.',
    movementPattern: 'pull_vertical',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },

  // ISOLATION & BRAS / ÉPAULES
  'curl': {
    primaryMuscles: ['Biceps Brachial', 'Brachial Antérieur'],
    secondaryMuscles: ['Brachioradialis (Avant-bras)'],
    tempoCode: '3-1-1-1',
    tempoDescription: '3s descente excentrique · 1s bas · 1s flexion · 1s suppression haut',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: 'Conserver les coudes immobiles collés aux côtes. Éviter tout balancement du buste (pas d\'élan).',
    movementPattern: 'isolation',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },
  'élévation': {
    primaryMuscles: ['Deltoïde Latéral (Faisceau Moyen)'],
    secondaryMuscles: ['Trapèze Supérieur'],
    tempoCode: '2-1-1-1',
    tempoDescription: '2s descente · 1s bas · 1s montée latérale · 1s pause à hauteur d\'épaule',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: 'Monter les coudes légèrement en avant du plan frontal (30° dans le plan de la scapula). Pouces orientés neutres.',
    movementPattern: 'isolation',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },
  'face': {
    primaryMuscles: ['Deltoïde Postérieur', 'Infra-épineux', 'Petit Rond'],
    secondaryMuscles: ['Rhomboïdes', 'Trapèze Moyen/Inférieur'],
    tempoCode: '2-1-1-1',
    tempoDescription: '2s retour contrôlé · 1s étirement · 1s tirage au visage · 1s rotation externe haut',
    rpeTarget: 'RPE 7.5 / 10',
    rpeNumeric: 7.5,
    biomechanicalTip: 'Tirer la corde vers le front/yeux tout en effectuant une rotation externe des poignets au-dessus des coudes.',
    movementPattern: 'isolation',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },

  // TRONC & CORE
  'planche': {
    primaryMuscles: ['Transverse de l\'Abdomen', 'Grand Droit'],
    secondaryMuscles: ['Obliques', 'Serratus', 'Fessiers'],
    tempoCode: 'Tenir en statique',
    tempoDescription: 'Isométrie continue avec respiration diaphragmatique constante',
    rpeTarget: 'RPE 7.5 / 10',
    rpeNumeric: 7.5,
    biomechanicalTip: 'Rétroversion du bassin (effacer la cambrure). Aspirer le nombril vers la colonne et pousser le sol avec les coudes.',
    movementPattern: 'core',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },
  'gainage': {
    primaryMuscles: ['Transverse', 'Obliques'],
    secondaryMuscles: ['Lombaires', 'Érecteurs du Rachis'],
    tempoCode: 'Tenir en statique',
    tempoDescription: 'Maintien postural sous tension constante',
    rpeTarget: 'RPE 7.5 / 10',
    rpeNumeric: 7.5,
    biomechanicalTip: 'Maintenir la ligne cheville-bassin-épaule alignée sans affaissement des hanches.',
    movementPattern: 'core',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },

  // ÉCHAUFFEMENT & MOBILITÉ (PHASE 1)
  'dead bug': {
    primaryMuscles: ['Transverse', 'Stabilité Core'],
    secondaryMuscles: ['Fléchisseurs de Hanchere'],
    tempoCode: '2-1-2-1',
    tempoDescription: '2s descente bras/jambe opposés · 1s ras du sol · 2s retour · 1s haut',
    rpeTarget: 'RPE 5 / 10',
    rpeNumeric: 5,
    biomechanicalTip: 'Plaquer le bas du dos fermement contre le sol durant toute la durée du mouvement.',
    movementPattern: 'core',
    phaseNumber: 1,
    recommendedRestSec: 45,
  },
  'bird dog': {
    primaryMuscles: ['Érecteurs du Rachis', 'Grand Fessier'],
    secondaryMuscles: ['Core', 'Deltoïde'],
    tempoCode: '2-1-2-1',
    tempoDescription: '2s extension alignée · 1s maintien · 2s retour · 1s pause',
    rpeTarget: 'RPE 5 / 10',
    rpeNumeric: 5,
    biomechanicalTip: 'Garder le bassin parfaitement horizontal sans basculer sur le côté.',
    movementPattern: 'core',
    phaseNumber: 1,
    recommendedRestSec: 45,
  },

  // RETOUR AU CALME (PHASE 4)
  'étirement': {
    primaryMuscles: ['Fascias & Muscles sollicités'],
    secondaryMuscles: ['Système Parasympathique'],
    tempoCode: 'Relâchement passif',
    tempoDescription: 'Tenir 45 à 60 secondes en respiration profonde (Inspir 4s / Expir 6s)',
    rpeTarget: 'RPE 3-4 / 10',
    rpeNumeric: 3.5,
    biomechanicalTip: 'Chercher la sensation d\'allongement doux sans douleur aiguë. Laisser les muscles se relâcher sur chaque expiration.',
    movementPattern: 'isolation',
    phaseNumber: 4,
    recommendedRestSec: 30,
  },
};

/* ─── FONCTION RESOLVER DE BIOMÉCANIQUE ──────────────────────────────────── */
export function getExerciseBiomechanics(
  exName: string,
  exIdx: number = 0,
  totalExercises: number = 4
): ExerciseBiomechanics {
  const n = exName.toLowerCase();

  // Détection si c'est la Phase 1 ou 4 par la position / le nom
  let detectedPhase: 1 | 2 | 3 | 4 = 3;
  if (exIdx === 0 && totalExercises >= 4 && (n.includes('échauffement') || n.includes('dead bug') || n.includes('bird dog') || n.includes('corde') || n.includes('mobilité') || n.includes('cardio'))) {
    detectedPhase = 1;
  } else if (exIdx === totalExercises - 1 && (n.includes('étirement') || n.includes('stretch') || n.includes('respiration') || n.includes('foam roller') || n.includes('colonne'))) {
    detectedPhase = 4;
  } else if (exIdx < 2 && (n.includes('squat') || n.includes('soulevé') || n.includes('deadlift') || n.includes('développé') || n.includes('traction') || n.includes('rowing') || n.includes('thrust') || n.includes('militaire'))) {
    detectedPhase = 2;
  } else {
    detectedPhase = 3;
  }

  // Recherche dans la DB par mots clés
  let entry: Partial<ExerciseBiomechanics> | null = null;
  for (const [key, val] of Object.entries(BIOMECHANICS_DB)) {
    if (n.includes(key)) {
      entry = val;
      break;
    }
  }

  const phaseInfo = WORKOUT_PHASES[entry?.phaseNumber ?? detectedPhase];

  return {
    name: exName,
    primaryMuscles: entry?.primaryMuscles ?? ['Muscles principaux cibles'],
    secondaryMuscles: entry?.secondaryMuscles ?? ['Stabilisateurs secondaires'],
    tempoCode: entry?.tempoCode ?? (phaseInfo.phaseNumber === 2 ? '3-1-1-0' : phaseInfo.phaseNumber === 1 ? '2-1-2-0' : '2-0-1-0'),
    tempoDescription: entry?.tempoDescription ?? '2s excentrique · 0s pause · 1s concentrique · 0s haut',
    rpeTarget: entry?.rpeTarget ?? phaseInfo.defaultRpe,
    rpeNumeric: entry?.rpeNumeric ?? (phaseInfo.phaseNumber === 2 ? 8.5 : phaseInfo.phaseNumber === 3 ? 8 : 6),
    biomechanicalTip: entry?.biomechanicalTip ?? 'Conserver un alignement neutre du rachis et contrôler la trajectoire de la charge sur toute l\'amplitude.',
    movementPattern: entry?.movementPattern ?? 'isolation',
    phaseNumber: entry?.phaseNumber ?? detectedPhase,
    recommendedRestSec: entry?.recommendedRestSec ?? phaseInfo.defaultRestSec,
  };
}

/* ─── BANQUE D'ALTERNATIVES ÉQUIVALENTES BIOMÉCANIQUEMENT ───────────────── */
export function getExerciseAlternatives(exName: string): ExerciseAlternative[] {
  const n = exName.toLowerCase();

  // Jambes - Pattern Squat
  if (n.includes('squat') || n.includes('presse')) {
    return [
      {
        name: 'Goblet Squat avec Haltère',
        category: 'Quadriceps / Fessiers',
        equipment: 'Haltères',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Même patron de flexion de genoux, charge antérieure réduisant la compression lombaire.',
        tempoCode: '3-1-1-0',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Presse à Cuisses Inclinée',
        category: 'Quadriceps / Fessiers',
        equipment: 'Machine',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Permet de surcharger les quadriceps en toute sécurité sans solliciter le bas du dos.',
        tempoCode: '3-1-1-0',
        rpeTarget: 'RPE 8.5 / 10',
      },
      {
        name: 'Squat Bulgare Fente Arrière',
        category: 'Quadriceps / Grand Fessier',
        equipment: 'Haltères',
        difficulty: 'Avancé',
        biomechanicMatch: 'Travail unilatéral supprimant les déséquilibres gauche/droite et étirant le psoas.',
        tempoCode: '2-1-1-0',
        rpeTarget: 'RPE 8.5 / 10',
      },
      {
        name: 'Squat au Poids du Corps Tempo Lent',
        category: 'Quadriceps / Fessiers',
        equipment: 'Poids du corps',
        difficulty: 'Facile',
        biomechanicMatch: 'Alternative sans matériel idéale en cas de fatigue lombaire ou entraînement maison.',
        tempoCode: '4-1-1-0',
        rpeTarget: 'RPE 7.5 / 10',
      },
    ];
  }

  // Chaîne Postérieure - Pattern Hinge (Soulevé de terre / Hip Thrust)
  if (n.includes('soulevé') || n.includes('deadlift') || n.includes('thrust') || n.includes('ischio') || n.includes('morning')) {
    return [
      {
        name: 'Soulevé de Terre Roumain aux Haltères',
        category: 'Ischio-jambiers / Fessiers',
        equipment: 'Haltères',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Focus maximal sur la phase excentrique et l\'étirement des ischio-jambiers.',
        tempoCode: '3-1-1-0',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Hip Thrust à la Barre / Haltère',
        category: 'Grand Fessier (Contraction maximale)',
        equipment: 'Barre',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Recrutement fessier maximal en position de raccourcissement avec tension constante.',
        tempoCode: '2-1-2-0',
        rpeTarget: 'RPE 8.5 / 10',
      },
      {
        name: 'Good Morning aux Haltères / Barre',
        category: 'Ischio-jambiers / Lombaires',
        equipment: 'Haltères',
        difficulty: 'Avancé',
        biomechanicMatch: 'Même levier de hip hinge pour renforcer les érecteurs du rachis et les ischios.',
        tempoCode: '3-1-1-0',
        rpeTarget: 'RPE 7.5 / 10',
      },
      {
        name: 'Leg Curl unilatéral au sol (Serviette glissée)',
        category: 'Ischio-jambiers',
        equipment: 'Poids du corps',
        difficulty: 'Facile',
        biomechanicMatch: 'Isolation directe de la flexion de genou sans aucune contrainte axiale.',
        tempoCode: '2-1-2-0',
        rpeTarget: 'RPE 8 / 10',
      },
    ];
  }

  // Poussée Horizontale - Développé couché / Pompes
  if (n.includes('développé') || n.includes('pompe') || n.includes('push') || n.includes('pec')) {
    return [
      {
        name: 'Développé Incliné aux Haltères',
        category: 'Pectoraux (Faisceau Claviculaire)',
        equipment: 'Haltères',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Amplitude naturelle accrue au bas du mouvement et liberté de rotation des poignets.',
        tempoCode: '3-1-1-0',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Pompes Lestées avec Pause au Bas',
        category: 'Pectoraux / Triceps / Core',
        equipment: 'Poids du corps',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Active la sangle abdominale en synergie avec les pectoraux et libère les omoplates.',
        tempoCode: '2-1-1-0',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Dips sur Banc ou Barres Parallèles',
        category: 'Bas des Pectoraux / Triceps',
        equipment: 'Poids du corps',
        difficulty: 'Avancé',
        biomechanicMatch: 'Poussée déclinée à haute intensité sollicitant fortement la portion sternale.',
        tempoCode: '3-1-1-0',
        rpeTarget: 'RPE 8.5 / 10',
      },
      {
        name: 'Écarté Vis-à-Vis à la Poulie Haute',
        category: 'Pectoraux (Isolation)',
        equipment: 'Poulie',
        difficulty: 'Facile',
        biomechanicMatch: 'Tension continue sur toute l\'amplitude sans fatigue pour les coudes.',
        tempoCode: '2-1-1-1',
        rpeTarget: 'RPE 8 / 10',
      },
    ];
  }

  // Tirage Vertical / Horizontal - Tractions / Rowing
  if (n.includes('traction') || n.includes('rowing') || n.includes('tirage') || n.includes('pull')) {
    return [
      {
        name: 'Rowing Haltère Unilatéral',
        category: 'Grand Dorsal / Rhomboïdes',
        equipment: 'Haltères',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Excellente trajectoire de tirage le long des hanches avec support du buste.',
        tempoCode: '2-1-1-1',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Tirage Poitrine Poulie Haute',
        category: 'Grand Dorsal (Largeur)',
        equipment: 'Poulie',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Reproduit la trajectoire exacte des tractions avec ajustement précis de la charge.',
        tempoCode: '2-1-1-0',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Rowing Inversé sous Table / Barre',
        category: 'Haut du Dos / Rhomboïdes',
        equipment: 'Poids du corps',
        difficulty: 'Facile',
        biomechanicMatch: 'Renforce la posture arrière et la rétraction scapulaire au poids du corps.',
        tempoCode: '2-1-1-1',
        rpeTarget: 'RPE 7.5 / 10',
      },
      {
        name: 'Face Pull à l\'Élastique ou Poulie',
        category: 'Deltoïde Postérieur / Posture',
        equipment: 'Élastique',
        difficulty: 'Facile',
        biomechanicMatch: 'Focus sur les rotateurs externes et le haut du dos pour la santé de l\'épaule.',
        tempoCode: '2-1-1-1',
        rpeTarget: 'RPE 7.5 / 10',
      },
    ];
  }

  // Épaules / Bras / Divers - Fallback générique par groupe musculaire
  return [
    {
      name: `${exName} aux Haltères`,
      category: 'Variante Haltères',
      equipment: 'Haltères',
      difficulty: 'Équivalent',
      biomechanicMatch: 'Liberté de mouvement accrue et ajustement biomécanique individuel.',
      tempoCode: '2-1-1-0',
      rpeTarget: 'RPE 8 / 10',
    },
    {
      name: `${exName} à l'Élastique`,
      category: 'Variante Élastique',
      equipment: 'Élastique',
      difficulty: 'Facile',
      biomechanicMatch: 'Résistance progressive idéale pour la santé articulaire.',
      tempoCode: '2-1-1-1',
      rpeTarget: 'RPE 7.5 / 10',
    },
    {
      name: `${exName} au Poids du Corps`,
      category: 'Variante Poids du corps',
      equipment: 'Poids du corps',
      difficulty: 'Facile',
      biomechanicMatch: 'Contrôle proprioceptif optimal sans matériel lourd.',
      tempoCode: '3-1-1-0',
      rpeTarget: 'RPE 7.5 / 10',
    },
  ];
}
