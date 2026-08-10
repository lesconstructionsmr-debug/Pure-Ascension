/**
 * biomechanics.ts — Système expert biomécanique Pure Ascension
 * Fournit les 4 phases de séance, tempos normalisés (ex: 3-1-1-0), RPE cibles,
 * conseils d'exécution anatomiques et générateur d'alternatives 1-tap.
 */

import { filterAlternativesForHealth } from './healthExerciseFilters';

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



  // ── EXERCICES EXTRAITS DES INFOGRAPHIES PECTORAUX, BRAS ET DOS (PINTEREST) ──
  'développé décliné': {
    primaryMuscles: ['Grand Pectoral (Faisceau Sterno-costal / Bas du Péc)'],
    secondaryMuscles: ['Triceps Brachial', 'Deltoïde Antérieur'],
    tempoCode: '3-1-1-0',
    tempoDescription: '3s descente contrôlée sur le bas de la poitrine · 1s bas · 1s poussée explosive',
    rpeTarget: 'RPE 8.5 / 10',
    rpeNumeric: 8.5,
    biomechanicalTip: 'Verrouiller les jambes sous les boudins de maintien. Réduit la sollicitation du deltoïde antérieur.',
    movementPattern: 'push_horizontal',
    phaseNumber: 2,
    recommendedRestSec: 90,
  },
  'dumbbell pullover': {
    primaryMuscles: ['Grand Dorsal', 'Grand Pectoral (Faisceau Claviculaire)', 'Grand Dentelé'],
    secondaryMuscles: ['Chef Long du Triceps'],
    tempoCode: '3-1-1-1',
    tempoDescription: '3s étirement profond derrière la tête · 1s pause étirement · 1s remontée au-dessus poitrine',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: 'Garder une coudure fixe de 15° aux coudes. Ne pas cambrer excessivement le bas du dos.',
    movementPattern: 'pull_vertical',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },
  'pompes large': {
    primaryMuscles: ['Grand Pectoral (Focus Étirement Externe)'],
    secondaryMuscles: ['Deltoïde Antérieur', 'Triceps', 'Core'],
    tempoCode: '2-1-1-0',
    tempoDescription: '2s descente · 1s bas · 1s poussée explosive',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: 'Écarter les mains à 1.5x la largeur des épaules. Maintenir le corps parfaitement aligné.',
    movementPattern: 'push_horizontal',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },
  'ez bar curl': {
    primaryMuscles: ['Biceps Brachial (Chef Long & Court)', 'Brachial Antérieur'],
    secondaryMuscles: ['Brachioradialis (Avant-bras)'],
    tempoCode: '3-1-1-1',
    tempoDescription: '3s descente excentrique · 1s bas · 1s flexion · 1s contraction maximale',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: 'La courbure de la barre EZ soulage la pression sur les poignets. Garder les coudes immobiles.',
    movementPattern: 'isolation',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },
  'incline hammer curl': {
    primaryMuscles: ['Brachial Antérieur', 'Brachioradialis', 'Chef Long du Biceps'],
    secondaryMuscles: ['Avant-bras'],
    tempoCode: '3-1-1-1',
    tempoDescription: '3s descente étirée · 1s bas · 1s montée prise neutre · 1s contraction',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: "Banc incliné à 60°. La prise neutre (pouce vers le haut) cible l'épaisseur du bras.",
    movementPattern: 'isolation',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },
  'skull crusher': {
    primaryMuscles: ['Triceps Brachial (Chef Long & Chef Latéral)'],
    secondaryMuscles: ['Anconé', 'Avant-bras'],
    tempoCode: '3-1-1-0',
    tempoDescription: '3s descente vers le front/au-dessus tête · 1s bas · 1s extension complète des coudes',
    rpeTarget: 'RPE 8.5 / 10',
    rpeNumeric: 8.5,
    biomechanicalTip: "Incliner légèrement les bras à 80° vers l'arrière pour maintenir une tension constante sur le chef long.",
    movementPattern: 'isolation',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },
  'tricep pushdown': {
    primaryMuscles: ['Triceps Brachial (Chef Latéral & Médial)'],
    secondaryMuscles: ['Anconé'],
    tempoCode: '3-1-1-1',
    tempoDescription: '3s remontée contrôlée 90° · 1s haut · 1s poussée vers le bas · 1s verrouillage bas',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: "Garder les coudes scellés contre les côtes. Ne pas utiliser l'élan du buste.",
    movementPattern: 'isolation',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },
  'dumbbell kickback': {
    primaryMuscles: ['Triceps Brachial (Contraction Maximale en Raccourcissement)'],
    secondaryMuscles: ['Deltoïde Postérieur'],
    tempoCode: '2-1-1-2',
    tempoDescription: '2s retour 90° · 1s bas · 1s extension horizontale · 2s blocage bras tendu',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: "Buste parallèle au sol. Le bras reste parallèle au sol, seul l'avant-bras pivote.",
    movementPattern: 'isolation',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },
  't-bar row': {
    primaryMuscles: ['Grand Dorsal', 'Rhomboïdes', 'Trapèze Moyen'],
    secondaryMuscles: ['Biceps', 'Deltoïde Postérieur', 'Érecteurs du Rachis'],
    tempoCode: '2-1-1-1',
    tempoDescription: '2s retour étiré · 1s bas · 1s tirage puissant contre poitrine · 1s resserrement omoplates',
    rpeTarget: 'RPE 8.5 / 10',
    rpeNumeric: 8.5,
    biomechanicalTip: "Garder le bas du dos gainé et genoux déverrouillés. Tirer les coudes vers l'arrière.",
    movementPattern: 'pull_horizontal',
    phaseNumber: 2,
    recommendedRestSec: 90,
  },
  'shrugs': {
    primaryMuscles: ['Trapèze Supérieur (Portion Descendante)'],
    secondaryMuscles: ['Élévateur de la Scapula', 'Avant-bras / Grip'],
    tempoCode: '2-1-1-2',
    tempoDescription: '2s descente étirée · 1s bas · 1s élévation verticale épaules · 2s contraction haute',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: "Monter les épaules verticalement vers les oreilles. Ne pas effectuer de ronds d'épaules.",
    movementPattern: 'isolation',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },

  // ── EXERCICES EXTRAITS DES ROULES DE MOBILITÉ & KETTLEBELL (SANS VIDÉO HUMAINE) ──
  'cossack squat': {
    primaryMuscles: ['Quadriceps', 'Adducteurs', 'Grand Fessier'],
    secondaryMuscles: ['Ischio-jambiers', 'Cheville (Mobilité Flechisseurs)'],
    tempoCode: '3-1-1-0',
    tempoDescription: '3s descente latérale profonde · 1s bas · 1s poussée au talon · 0s centre',
    rpeTarget: 'RPE 7 / 10',
    rpeNumeric: 7,
    biomechanicalTip: 'Garder le talon de la jambe fléchie ancré au sol. Pivoter la pointe du pied opposé vers le ciel.',
    movementPattern: 'squat',
    phaseNumber: 1,
    recommendedRestSec: 45,
  },
  'rotation thoracique': {
    primaryMuscles: ['Mobilité Thoracique (Rachis Dorsal)', 'Serratus'],
    secondaryMuscles: ['Deltoïdes Postérieurs', 'Adducteurs'],
    tempoCode: '2-2-2-0',
    tempoDescription: '2s ouverture coude/main vers ciel · 2s maintien haut · 2s retour sol',
    rpeTarget: 'RPE 4 / 10',
    rpeNumeric: 4,
    biomechanicalTip: 'Maintenir la position de squat profond sans décoller les talons. Suivre la main du regard.',
    movementPattern: 'isolation',
    phaseNumber: 1,
    recommendedRestSec: 30,
  },
  'kick through': {
    primaryMuscles: ['Core & Obliques', 'Stabilité Épaules'],
    secondaryMuscles: ['Quadriceps', 'Fessiers'],
    tempoCode: 'Rythmé',
    tempoDescription: 'Rotation contrôlée du bassin · Extension de leg latérale',
    rpeTarget: 'RPE 7.5 / 10',
    rpeNumeric: 7.5,
    biomechanicalTip: "Garder l'épaule d'appui solide et dépressée. Pivoter les hanches près du sol.",
    movementPattern: 'core',
    phaseNumber: 1,
    recommendedRestSec: 45,
  },
  'clean kettlebell': {
    primaryMuscles: ['Chaîne Postérieure (Fessiers/Ischios)', 'Avant-bras'],
    secondaryMuscles: ['Biceps', 'Trapèzes', 'Core'],
    tempoCode: 'Explosif',
    tempoDescription: 'Tirage près du corps · Réception fluide du kettlebell en rack sans choc',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: 'Garder la charge près du corps comme pour fermer une fermeture éclair. Glisser la main sous la poignée.',
    movementPattern: 'hinge',
    phaseNumber: 2,
    recommendedRestSec: 90,
  },
  'renegade row': {
    primaryMuscles: ['Grand Dorsal', 'Transverse / Core Anti-Rotation'],
    secondaryMuscles: ['Triceps', 'Pectoraux', 'Obliques'],
    tempoCode: '2-1-1-1',
    tempoDescription: '2s retour sol · 1s bas · 1s tirage au nombril · 1s resserrement omoplate',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: 'Écarter les pieds pour stabiliser le bassin. Empêcher toute rotation des hanches pendant le tirage.',
    movementPattern: 'pull_horizontal',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },
  'pigeon pose': {
    primaryMuscles: ['Grand & Moyen Fessier (Étirage Profond)', 'Rotateurs de Hanche'],
    secondaryMuscles: ['Psoas (Côté Arrière)'],
    tempoCode: 'Statique',
    tempoDescription: 'Maintien respiratoire 30-45s par côté',
    rpeTarget: 'RPE 3-4 / 10',
    rpeNumeric: 4,
    biomechanicalTip: 'Aligner les hanches face au sol sans basculer sur la fesse avant. Expirer profondément.',
    movementPattern: 'isolation',
    phaseNumber: 4,
    recommendedRestSec: 30,
  },
  'lizard lunge': {
    primaryMuscles: ['Flexeurs de Hanche (Psoas)', 'Adducteurs'],
    secondaryMuscles: ['Ischio-jambiers', 'Lombaires'],
    tempoCode: 'Fluide',
    tempoDescription: '3s descente des coudes vers sol · 2s maintien · 2s retour',
    rpeTarget: 'RPE 4 / 10',
    rpeNumeric: 4,
    biomechanicalTip: "Descendre les coudes vers l'intérieur du pied avant tout en poussant la hanche arrière vers le sol.",
    movementPattern: 'lunge',
    phaseNumber: 1,
    recommendedRestSec: 30,
  },
  'frog stretch': {
    primaryMuscles: ['Adducteurs (Grand/Court Adducteur)', 'Bassin'],
    secondaryMuscles: ['Fessiers', 'Lombaires'],
    tempoCode: 'Statique',
    tempoDescription: 'Maintien doux 45s · Ouverture progressive des genoux',
    rpeTarget: 'RPE 3.5 / 10',
    rpeNumeric: 3.5,
    biomechanicalTip: "Genoux écartés à 90° et pieds orientés vers l'extérieur. Reculer doucement le bassin.",
    movementPattern: 'isolation',
    phaseNumber: 4,
    recommendedRestSec: 30,
  },
  'bottom up press': {
    primaryMuscles: ['Stabilité Poignet / Avant-bras', 'Coiffe des Rotateurs'],
    secondaryMuscles: ['Deltoïde Antérieur', 'Triceps'],
    tempoCode: '3-1-1-0',
    tempoDescription: "3s descente contrôlée · 1s bas · 1s poussée verticale avec kettlebell à l'envers",
    rpeTarget: 'RPE 7.5 / 10',
    rpeNumeric: 7.5,
    biomechanicalTip: 'Serrer la poignée au maximum pour maintenir le kettlebell en équilibre vertical parfait.',
    movementPattern: 'push_vertical',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },
  'windmill': {
    primaryMuscles: ['Obliques & Sangle Abdominale', 'Stabilité Épaule'],
    secondaryMuscles: ['Ischio-jambiers', 'Grand Fessier'],
    tempoCode: '3-1-1-0',
    tempoDescription: '3s descente de la main vers pied · 1s bas · 1s remontée contrôlée',
    rpeTarget: 'RPE 7.5 / 10',
    rpeNumeric: 7.5,
    biomechanicalTip: 'Pousser la hanche vers le côté du kettlebell levé. Garder les yeux fixés sur la charge.',
    movementPattern: 'hinge',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },
  'halo': {
    primaryMuscles: ['Mobilité Épaule & Ceinture Scapulaire'],
    secondaryMuscles: ['Core', 'Trapèzes'],
    tempoCode: 'Fluide',
    tempoDescription: 'Rotation continue autour de la tête · 5 tours horaire / anti-horaire',
    rpeTarget: 'RPE 4 / 10',
    rpeNumeric: 4,
    biomechanicalTip: 'Faire passer le kettlebell au plus près du cou et des oreilles sans bouger le buste.',
    movementPattern: 'isolation',
    phaseNumber: 1,
    recommendedRestSec: 30,
  },

  // NOUVEAUX EXERCICES FORCE BARRE & POLYARTICULAIRE
  'back squat': {
    primaryMuscles: ['Quadriceps (Droit Fémoral, Vastes)', 'Grand Fessier'],
    secondaryMuscles: ['Ischio-jambiers', 'Érecteurs du Rachis', 'Sangle Abdominale'],
    tempoCode: '3-1-1-0',
    tempoDescription: '3s descente sous la parallèle · 1s pause bas · 1s remontée explosive · 0s haut',
    rpeTarget: 'RPE 8.5 / 10',
    rpeNumeric: 8.5,
    biomechanicalTip: "Garder la barre verrouillée sur les trapèzes, genoux orientés dans l'axe de la pointe des pieds.",
    movementPattern: 'squat',
    phaseNumber: 2,
    recommendedRestSec: 90,
  },
  'front squat': {
    primaryMuscles: ['Quadriceps (Focus Vaste Externe/Intermédiaire)', 'Core / Sangle Abdominale'],
    secondaryMuscles: ['Grand Fessier', 'Haut du Dos (Rhomboïdes)'],
    tempoCode: '3-1-1-0',
    tempoDescription: '3s descente verticale · 1s bas · 1s remontée · 0s haut',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: 'Coudes hauts parallèles au sol. Conserver le buste parfaitement vertical.',
    movementPattern: 'squat',
    phaseNumber: 2,
    recommendedRestSec: 90,
  },
  'deadlift': {
    primaryMuscles: ['Ischio-jambiers', 'Grand Fessier', 'Érecteurs du Rachis'],
    secondaryMuscles: ['Trapèzes', 'Grand Dorsal', 'Avant-bras / Grip'],
    tempoCode: '2-1-1-0',
    tempoDescription: '2s descente contrôlée · 1s sol · 1s poussée dans le sol · 0s verrouillage hanches',
    rpeTarget: 'RPE 8.5 / 10',
    rpeNumeric: 8.5,
    biomechanicalTip: "Verrouiller le grand dorsal avant le départ. Pousser le sol avec le milieu du pied sans arrondir le bas du dos.",
    movementPattern: 'hinge',
    phaseNumber: 2,
    recommendedRestSec: 90,
  },
  'bench press': {
    primaryMuscles: ['Grand Pectoral (Faisceau Moyen/Sterno-costal)'],
    secondaryMuscles: ['Deltoïde Antérieur', 'Triceps Brachial'],
    tempoCode: '3-1-1-0',
    tempoDescription: '3s descente sur le bas du sternum · 1s contact léger · 1s poussée dynamique · 0s haut',
    rpeTarget: 'RPE 8.5 / 10',
    rpeNumeric: 8.5,
    biomechanicalTip: 'Rétracter et abaisser les omoplates. Pieds ancrés au sol avec légère cambrure thoracique naturelle.',
    movementPattern: 'push_horizontal',
    phaseNumber: 2,
    recommendedRestSec: 90,
  },
  'hip thrust': {
    primaryMuscles: ['Grand Fessier (Contraction Maximale en Raccourcissement)'],
    secondaryMuscles: ['Ischio-jambiers', 'Quadriceps'],
    tempoCode: '2-1-1-2',
    tempoDescription: '2s descente contrôlée · 1s bas · 1s extension hanche · 2s contraction maximale haut',
    rpeTarget: 'RPE 8.5 / 10',
    rpeNumeric: 8.5,
    biomechanicalTip: "Regard orienté vers l'avant, menton rentré. Verrouiller le bassin en rétroversion au sommet de l'extension.",
    movementPattern: 'hinge',
    phaseNumber: 2,
    recommendedRestSec: 90,
  },

  // HALTÈRES & KETTLEBELL AVANCÉS
  'turkish get-up': {
    primaryMuscles: ['Stabilité Épaule / Coiffe des Rotateurs', 'Core & Obliques'],
    secondaryMuscles: ['Quadriceps', 'Fessiers', 'Triceps'],
    tempoCode: 'Contrôle continu',
    tempoDescription: 'Mouvement séquentiel fluide et articulé · 0 élan',
    rpeTarget: 'RPE 7.5 / 10',
    rpeNumeric: 7.5,
    biomechanicalTip: "Regard fixe sur la charge au-dessus de la tête tout au long des 7 étapes du relevé.",
    movementPattern: 'carry',
    phaseNumber: 1,
    recommendedRestSec: 45,
  },
  'snatch': {
    primaryMuscles: ['Chaîne Postérieure (Fessiers/Ischios)', 'Deltoïdes & Trapèzes'],
    secondaryMuscles: ['Core', 'Avant-bras / Grip'],
    tempoCode: 'Explosif',
    tempoDescription: 'Extension balistique de hanche · Verrouillage instantané bras tendu',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: 'Propulser le kettlebell avec la hanche et non avec le bras. Garder la charge proche du corps.',
    movementPattern: 'hinge',
    phaseNumber: 2,
    recommendedRestSec: 90,
  },
  'thruster': {
    primaryMuscles: ['Quadriceps', 'Deltoïdes Antérieurs & Moyens'],
    secondaryMuscles: ['Grand Fessier', 'Triceps Brachial', 'Core'],
    tempoCode: '2-0-1-0',
    tempoDescription: "2s squat complet · 0s bas · 1s poussée continue combinée épaules · 0s haut",
    rpeTarget: 'RPE 8.5 / 10',
    rpeNumeric: 8.5,
    biomechanicalTip: "Utiliser l'élan de la remontée du squat pour propulser les charges au-dessus de la tête sans temps d'arrêt.",
    movementPattern: 'squat',
    phaseNumber: 2,
    recommendedRestSec: 90,
  },
  'farmer': {
    primaryMuscles: ['Grip / Avant-bras', 'Trapèzes Supérieurs', 'Core / Obliques'],
    secondaryMuscles: ['Quadriceps', 'Mollets'],
    tempoCode: 'Marche contrôlée',
    tempoDescription: 'Pas réguliers · Buste droit et aligné',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: "Épaules tirées en arrière et vers le bas. Marcher d'un pas fluide sans balancer les charges.",
    movementPattern: 'carry',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },

  // MACHINES & POULIES ISOLATION
  'leg extension': {
    primaryMuscles: ['Quadriceps (Focus Droit Fémoral)'],
    secondaryMuscles: ['Tensor Fasciae Latae'],
    tempoCode: '3-1-1-1',
    tempoDescription: '3s descente contrôlée · 1s bas · 1s extension genoux · 1s contraction maximale haut',
    rpeTarget: 'RPE 8.5 / 10',
    rpeNumeric: 8.5,
    biomechanicalTip: 'Plaquer le bassin contre le siège en tirant sur les poignées latérales. Ne pas décoller les fesses.',
    movementPattern: 'isolation',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },
  'leg curl': {
    primaryMuscles: ['Ischio-jambiers (Semi-tendineux, Semi-membraneux, Biceps Fémoral)'],
    secondaryMuscles: ['Gastrocnémiens (Mollets)'],
    tempoCode: '3-1-1-1',
    tempoDescription: '3s retour excentrique · 1s étirement · 1s flexion de genou · 1s contraction',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: 'Maintenir les chevilles en dorsiflexion (pointes vers les tibias) pour maximiser le recrutement des ischios.',
    movementPattern: 'isolation',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },
  'pulley fly': {
    primaryMuscles: ['Grand Pectoral (Faisceau Claviculaire ou Sterno-costal)'],
    secondaryMuscles: ['Deltoïde Antérieur'],
    tempoCode: '3-1-1-1',
    tempoDescription: '3s ouverture excentrique étirée · 1s bas · 1s rapprochement mains · 1s contraction',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: 'Garder une coudure fixe aux coudes. Imaginer enserrer un grand arbre pour isoler les pectoraux.',
    movementPattern: 'isolation',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },

  // CALISTHENICS & CORPS LIBRE
  'pull-up': {
    primaryMuscles: ['Grand Dorsal', 'Grand Rond'],
    secondaryMuscles: ['Biceps', 'Brachial', 'Rhomboïdes'],
    tempoCode: '3-1-1-1',
    tempoDescription: '3s descente contrôlée · 1s étirement bas · 1s tirage menton au-dessus barre · 1s contraction',
    rpeTarget: 'RPE 8.5 / 10',
    rpeNumeric: 8.5,
    biomechanicalTip: "Casser la barre en deux vers l'extérieur pour engager les dorsaux et fixer les omoplates.",
    movementPattern: 'pull_vertical',
    phaseNumber: 2,
    recommendedRestSec: 90,
  },
  'hollow body': {
    primaryMuscles: ["Grand Droit de l'Abdomen", 'Transverse'],
    secondaryMuscles: ['Ilio-psoas', 'Quadriceps'],
    tempoCode: 'Statique',
    tempoDescription: 'Maintien de la cuvette lombaire au sol · Respiration costale',
    rpeTarget: 'RPE 8 / 10',
    rpeNumeric: 8,
    biomechanicalTip: 'Plaquer impérativement le bas du dos au sol. Allonger les bras et les jambes selon le niveau.',
    movementPattern: 'core',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },
  'l-sit': {
    primaryMuscles: ['Grand Droit', 'Ilio-psoas', 'Serratus Antérieur'],
    secondaryMuscles: ['Triceps', 'Quadriceps'],
    tempoCode: 'Statique',
    tempoDescription: 'Maintien jambes parallèles au sol · Poussée active des bras',
    rpeTarget: 'RPE 8.5 / 10',
    rpeNumeric: 8.5,
    biomechanicalTip: 'Repousser le sol au maximum avec les mains (dépression scapulaire). Verrouiller les genoux tendus.',
    movementPattern: 'core',
    phaseNumber: 3,
    recommendedRestSec: 45,
  },

  // MOBILITÉ & PRÉVENTION SÉCURITÉ
  'cat-cow': {
    primaryMuscles: ['Érecteurs du Rachis', 'Transverse'],
    secondaryMuscles: ['Trapezes', 'Lombaires'],
    tempoCode: 'Fluide',
    tempoDescription: '3s extension vertébrale · 3s flexion arrondie',
    rpeTarget: 'RPE 3-4 / 10',
    rpeNumeric: 4,
    biomechanicalTip: "Articuler chaque vertèbre une à une. Synchroniser l'inspiration sur l'extension et l'expiration sur la flexion.",
    movementPattern: 'isolation',
    phaseNumber: 1,
    recommendedRestSec: 30,
  },
  'world greatest stretch': {
    primaryMuscles: ['Psoas / Adducteurs', 'Thoracique'],
    secondaryMuscles: ['Ischio-jambiers', 'Fessiers'],
    tempoCode: 'Lent',
    tempoDescription: '3s fente basse · 2s rotation coude vers ciel',
    rpeTarget: 'RPE 4 / 10',
    rpeNumeric: 4,
    biomechanicalTip: 'Garder le genou arrière tendu. Amener le coude intérieur au sol puis pivoter la poitrine vers le ciel.',
    movementPattern: 'lunge',
    phaseNumber: 1,
    recommendedRestSec: 30,
  },

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
export function getExerciseAlternatives(
  exName: string,
  healthConditions?: string | null,
): ExerciseAlternative[] {
  const n = exName.toLowerCase().trim();

  // Helper de filtrage strict : ne supprime QUE si le nom de l'alternative est quasi-identique à l'exercice actuel.
  const filterCurrent = (alts: ExerciseAlternative[]) =>
    filterAlternativesForHealth(
      alts.filter(alt => {
        const altName = alt.name.toLowerCase().trim();
        if (altName === n) return false;
        if (altName.startsWith('variante ') && altName.includes(n)) return false;
        if (n.length > 8 && (altName.includes(n) || n.includes(altName))) return false;
        return true;
      }),
      healthConditions,
    );

  // 1. Core / Sangle Abdominale & Stabilité (Plank, Crunch, Gainage, Deadbug)
  if (n.includes('gainage') || n.includes('plank') || n.includes('core') || n.includes('crunch') || n.includes('commando') || n.includes('hollow') || n.includes('deadbug') || n.includes('bird') || n.includes('russian') || n.includes('relevé') || n.includes('abs') || n.includes('ventral')) {
    return filterCurrent([
      {
        name: 'Plank Statique Coude-Orteils',
        category: 'Transverse / Sangle Abdominale',
        equipment: 'Poids du corps',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Renforcement isométrique du transverse et stabilité lombo-pelvienne sans flexion de colonne.',
        tempoCode: 'Statique 45s',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Mountain Climbers Contrôlés',
        category: 'Transverse / Obliques / Flexion Hanche',
        equipment: 'Poids du corps',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Gainage dynamique combinant stabilité du tronc et travail anti-extension.',
        tempoCode: '2-0-2-0',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Deadbug avec Extension Opposée',
        category: 'Transverse / Stabilité Lombaire',
        equipment: 'Poids du corps',
        difficulty: 'Facile',
        biomechanicMatch: 'Excellente alternative pour engager le transverse en maintenant le bas du dos plaqué au sol.',
        tempoCode: '3-1-1-0',
        rpeTarget: 'RPE 7.5 / 10',
      },
      {
        name: 'Gainage Latéral Obliques (Side Plank)',
        category: 'Obliques / Carré des Lombes',
        equipment: 'Poids du corps',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Focus sur la stabilité latérale et le renforcement des obliques sans torsion.',
        tempoCode: 'Statique 30s',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Bird Dog avec Pause 2s',
        category: 'Érecteurs / Stabilité Postérieure',
        equipment: 'Poids du corps',
        difficulty: 'Facile',
        biomechanicMatch: 'Stabilité anti-rotation de la colonne et travail croisé chaîne postérieure.',
        tempoCode: '2-2-2-0',
        rpeTarget: 'RPE 7 / 10',
      },
    ]);
  }

  // 2. Poussée Verticale / Épaules (Militaire, Overhead Press, Push Press, Arnold)
  if (n.includes('militaire') || n.includes('overhead') || n.includes('push press') || n.includes('arnold press') || (n.includes('press') && !n.includes('bench') && !n.includes('chest') && !n.includes('leg') && !n.includes('presse')) || (n.includes('développé') && (n.includes('épaul') || n.includes('assise') || n.includes('debout')))) {
    return filterCurrent([
      {
        name: 'Développé Militaire aux Haltères / KB (Debout)',
        category: 'Deltoïdes & Poussée Verticale',
        equipment: 'Kettlebell / Haltères',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Poussée verticale bilatérale renforçant la coiffe des rotateurs et le gainage debout.',
        tempoCode: '2-1-1-0',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Push Press Explosif aux Haltères',
        category: 'Poussée Verticale & Impulsion',
        equipment: 'Haltères',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Utilise la poussée des jambes pour passer la charge en puissance au-dessus de la tête.',
        tempoCode: '1-0-1-0',
        rpeTarget: 'RPE 8.5 / 10',
      },
      {
        name: 'Arnold Press Assis aux Haltères',
        category: 'Deltoïdes & Rotation Épaules',
        equipment: 'Haltères',
        difficulty: 'Avancé',
        biomechanicMatch: 'Rotation complète des poignets recrutant les 3 faisceaux du deltoïde.',
        tempoCode: '3-1-1-0',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Pompes Pique (Pike Push-ups)',
        category: 'Deltoïdes Antérieurs / Triceps',
        equipment: 'Poids du corps',
        difficulty: 'Facile',
        biomechanicMatch: 'Alternative sans charge externe sollicitant les épaules en poussée verticale.',
        tempoCode: '3-1-1-0',
        rpeTarget: 'RPE 7.5 / 10',
      },
    ]);
  }

  // 3. Pattern Squat / Quadriceps & Presse à Cuisses
  if (n.includes('squat') || n.includes('presse') || n.includes('leg press') || n.includes('hacksquat') || n.includes('sissi')) {
    return filterCurrent([
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
    ]);
  }

  // 4. Chaîne Postérieure - Pattern Hinge (Soulevé de Terre, RDL, Good Morning)
  if (n.includes('soulevé') || n.includes('deadlift') || n.includes('rdl') || n.includes('morning') || n.includes('ischio') || n.includes('leg curl')) {
    return filterCurrent([
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
        name: 'Good Morning aux Haltères / Barre',
        category: 'Ischio-jambiers / Lombaires',
        equipment: 'Haltères',
        difficulty: 'Avancé',
        biomechanicMatch: 'Même levier de hip hinge pour renforcer les érecteurs du rachis et les ischios.',
        tempoCode: '3-1-1-0',
        rpeTarget: 'RPE 7.5 / 10',
      },
      {
        name: 'Leg Curl Unilatéral au Sol (Serviette)',
        category: 'Ischio-jambiers',
        equipment: 'Poids du corps',
        difficulty: 'Facile',
        biomechanicMatch: 'Isolation directe de la flexion de genou sans aucune contrainte axiale.',
        tempoCode: '2-1-2-0',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Kettlebell Swings Explosifs',
        category: 'Ischio-jambiers / Fessiers Balistique',
        equipment: 'Équivalent',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Extension balistique de hanche sollicitant la puissance de la chaîne postérieure.',
        tempoCode: '1-0-1-0',
        rpeTarget: 'RPE 8.5 / 10',
      },
    ]);
  }

  // 5. Poussée Horizontale - Développé couché / Bench / Pompes
  if (n.includes('développé') || n.includes('pompe') || n.includes('bench') || n.includes('chest press') || n.includes('pec') || (n.includes('push') && !n.includes('push press') && !n.includes('pike'))) {
    return filterCurrent([
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
        name: 'Dips sur Barres Parallèles',
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
    ]);
  }

  // 6. Tirage Vertical / Tractions & Lat Pulldown
  if (n.includes('traction') || n.includes('lat pull') || n.includes('tirage poitrine') || n.includes('vertical pull')) {
    return filterCurrent([
      {
        name: 'Tirage Poitrine Poulie Haute Prise Large',
        category: 'Grand Dorsal (Largeur)',
        equipment: 'Poulie',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Reproduit la trajectoire exacte des tractions avec ajustement précis de la charge.',
        tempoCode: '2-1-1-0',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Tractions Assistées à l\'Élastique',
        category: 'Grand Dorsal / Grand Rond',
        equipment: 'Élastique',
        difficulty: 'Facile',
        biomechanicMatch: 'Conserve le schéma moteur exact des tractions en réduisant la charge effective.',
        tempoCode: '3-1-1-0',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Tirage Vertical Bras Tendus à la Poulie',
        category: 'Grand Dorsal (Isolation)',
        equipment: 'Poulie',
        difficulty: 'Facile',
        biomechanicMatch: 'Recrutement du grand dorsal sans engager les biceps.',
        tempoCode: '2-1-1-1',
        rpeTarget: 'RPE 7.5 / 10',
      },
      {
        name: 'Rowing Inversé sous Barre (Inverted Row)',
        category: 'Haut du Dos / Rhomboïdes',
        equipment: 'Poids du corps',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Poids du corps avec travail de stabilité dorsale et gainage du buste.',
        tempoCode: '2-1-1-1',
        rpeTarget: 'RPE 8 / 10',
      },
    ]);
  }

  // 7. Tirage Horizontal / Rowing
  if (n.includes('rowing') || n.includes('tirage') || n.includes('pull') || n.includes('renforcement dos')) {
    return filterCurrent([
      {
        name: 'Rowing Haltère Unilatéral sur Banc',
        category: 'Grand Dorsal / Rhomboïdes',
        equipment: 'Haltères',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Excellente trajectoire de tirage le long des hanches avec support du buste.',
        tempoCode: '2-1-1-1',
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
      {
        name: 'Rowing Buste Penché aux Haltères',
        category: 'Rhomboïdes / Trapèzes Moyens',
        equipment: 'Haltères',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Tirage bilatéral horizontal sollicitant le gainage lombaire et le haut du dos.',
        tempoCode: '2-1-1-0',
        rpeTarget: 'RPE 8 / 10',
      },
    ]);
  }

  // 8. Isolation Biceps
  if (n.includes('curl') || n.includes('biceps') || n.includes('brachial')) {
    return filterCurrent([
      {
        name: 'Curl Biceps Incliné aux Haltères',
        category: 'Biceps (Chef Long)',
        equipment: 'Haltères',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Étirement maximal du chef long du biceps grâce à la rétraction des bras en arrière du buste.',
        tempoCode: '3-1-1-0',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Curl Marteau aux Haltères (Hammer Curl)',
        category: 'Brachioradialis / Brachial Antérieur',
        equipment: 'Haltères',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Prise neutre ciblant l\'épaisseur du bras et le muscle brachio-radial.',
        tempoCode: '2-1-1-0',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Curl Biceps à la Poulie Basse',
        category: 'Biceps Brachial (Tension Continue)',
        equipment: 'Poulie',
        difficulty: 'Facile',
        biomechanicMatch: 'Offre une tension constante y compris au sommet de la flexion.',
        tempoCode: '2-1-1-1',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Curl Concentré Unilatéral',
        category: 'Biceps (Peak & Isolation)',
        equipment: 'Haltères',
        difficulty: 'Facile',
        biomechanicMatch: 'Elimine totalement le balancement et isole la contraction maximale.',
        tempoCode: '3-1-1-1',
        rpeTarget: 'RPE 8.5 / 10',
      },
    ]);
  }

  // 9. Isolation Triceps
  if (n.includes('triceps') || n.includes('french press') || n.includes('kickback') || n.includes('barre au front')) {
    return filterCurrent([
      {
        name: 'Extension Triceps au-dessus de la Tête (French Press)',
        category: 'Triceps (Chef Long)',
        equipment: 'Haltères',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Focus sur l\'étirement du chef long du triceps en position overhead.',
        tempoCode: '3-1-1-0',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Pushdown Triceps à la Poulie Corde',
        category: 'Triceps (Chefs Lateral & Médial)',
        equipment: 'Poulie',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Isolation directe des coudes avec écartement des cordes en bas d\'amplitude.',
        tempoCode: '2-1-1-1',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Pompes Prise Serrée (Diamant)',
        category: 'Triceps / Pectoraux',
        equipment: 'Poids du corps',
        difficulty: 'Facile',
        biomechanicMatch: 'Recrutement des triceps au poids du corps avec liberté articulaire des poignets.',
        tempoCode: '2-1-1-0',
        rpeTarget: 'RPE 7.5 / 10',
      },
      {
        name: 'Dips sur Banc (Bench Dips)',
        category: 'Triceps Brachial',
        equipment: 'Poids du corps',
        difficulty: 'Facile',
        biomechanicMatch: 'Extension de coude fermée accessible partout sans équipement complexe.',
        tempoCode: '2-1-1-0',
        rpeTarget: 'RPE 8 / 10',
      },
    ]);
  }

  // 10. Isolation Épaules / Deltoïdes (Élévations Latérales / Oiseau)
  if (n.includes('élévation') || n.includes('lateral') || n.includes('oiseau') || n.includes('deltoide') || n.includes('rear delt')) {
    return filterCurrent([
      {
        name: 'Élévations Latérales aux Haltères',
        category: 'Deltoïde Moyen (Largeur Épaules)',
        equipment: 'Haltères',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Isolation ciblée de la portion moyenne des deltoïdes sans solliciter les trapèzes supérieurs.',
        tempoCode: '2-1-2-0',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Élévations Latérales à la Poulie Basse',
        category: 'Deltoïde Moyen (Tension Continue)',
        equipment: 'Poulie',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Maintient la résistance en bas du mouvement contrairement aux haltères.',
        tempoCode: '2-1-1-1',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Oiseau Buste Penché aux Haltères',
        category: 'Deltoïde Postérieur',
        equipment: 'Haltères',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Renforce l\'arrière de l\'épaule et la posture scapulaire.',
        tempoCode: '2-1-1-1',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Élévations Frontales avec Disque / Haltère',
        category: 'Deltoïde Antérieur',
        equipment: 'Haltères',
        difficulty: 'Facile',
        biomechanicMatch: 'Flexion d\'épaule ciblée sollicitant la portion antérieure du deltoïde.',
        tempoCode: '2-1-1-0',
        rpeTarget: 'RPE 7.5 / 10',
      },
    ]);
  }

  // 11. Isolation Fessiers & Hip Thrust
  if (n.includes('fessier') || n.includes('thrust') || n.includes('frog') || n.includes('clamshell') || n.includes('abduction') || n.includes('glute')) {
    return filterCurrent([
      {
        name: 'Hip Thrust à la Barre / Haltère',
        category: 'Grand Fessier (Contraction Maximale)',
        equipment: 'Barre',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Recrutement fessier maximal en position de raccourcissement avec tension constante.',
        tempoCode: '2-1-2-0',
        rpeTarget: 'RPE 8.5 / 10',
      },
      {
        name: 'Frog Pumps au Sol (Contraction Fessière)',
        category: 'Grand Fessier (Isolation)',
        equipment: 'Poids du corps',
        difficulty: 'Facile',
        biomechanicMatch: 'Isolation fessière en rotation externe de hanche réduisant le recrutement des ischios.',
        tempoCode: '2-1-2-0',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Clamshell avec Élastique',
        category: 'Moyen Fessier / Stabilité Hanche',
        equipment: 'Élastique',
        difficulty: 'Facile',
        biomechanicMatch: 'Renforcement du moyen fessier pour la stabilité du bassin en course et en squat.',
        tempoCode: '2-1-2-0',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Kickback Fessier à la Poulie ou Élastique',
        category: 'Grand & Moyen Fessier',
        equipment: 'Élastique',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Extension de hanche isolée avec contraction maximale en haut d\'amplitude.',
        tempoCode: '2-1-1-1',
        rpeTarget: 'RPE 8 / 10',
      },
    ]);
  }

  // 12. Mollets & Cheville
  if (n.includes('mollet') || n.includes('calf') || n.includes('extension cheville')) {
    return filterCurrent([
      {
        name: 'Extensions Mollets Unilatérales Debout',
        category: 'Mollets (Gastrocnémiens)',
        equipment: 'Poids du corps',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Travail unilatéral avec étirement profond et pause isométrique en haut.',
        tempoCode: '2-2-1-0',
        rpeTarget: 'RPE 8.5 / 10',
      },
      {
        name: 'Extensions Mollets Assis (Soleus)',
        category: 'Mollets (Soléaire)',
        equipment: 'Haltères',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Genoux fléchis à 90° isolant le muscle soléaire sous le gastrocnémien.',
        tempoCode: '3-1-1-0',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Sauts Pliométriques sur Pointe des Pieds',
        category: 'Mollets & Tendon d\'Achille',
        equipment: 'Poids du corps',
        difficulty: 'Avancé',
        biomechanicMatch: 'Améliore la raideur tendineuse et le renvoi d\'énergie élastique.',
        tempoCode: 'Explosif',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Extension Mollets sur Marche (Amplitude Maximale)',
        category: 'Mollets (Étirement)',
        equipment: 'Poids du corps',
        difficulty: 'Facile',
        biomechanicMatch: 'Accentue la phase excentrique pour stimuler l\'hypertrophie des mollets.',
        tempoCode: '4-1-1-0',
        rpeTarget: 'RPE 8 / 10',
      },
    ]);
  }

  // 13. Mobilité / Étirements / Activation (Phase 1 & Phase 4)
  if (n.includes('stretch') || n.includes('étirement') || n.includes('mobilité') || n.includes('ouverture') || n.includes('assouplissement') || n.includes('flexibilité') || n.includes('cooldown') || n.includes('warmup') || n.includes('échauffement') || n.includes('souplesse')) {
    return filterCurrent([
      {
        name: 'Fente Basse avec Ouverture Thoracique (Low Lunge Twist)',
        category: 'Mobilité Hanches & Rachis Thoracique',
        equipment: 'Poids du corps',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Excellente ouverture de hanche combinée à la rotation de la colonne thoracique sans contrainte.',
        tempoCode: 'Fluide 30s par côté',
        rpeTarget: 'RPE 6 / 10',
      },
      {
        name: 'Cossack Squat (Mobilité Hanches & Adducteurs)',
        category: 'Mobilité Frontale & Adducteurs',
        equipment: 'Poids du corps',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Travail d\'amplitude latérale des chevilles, genoux et adducteurs.',
        tempoCode: '2-1-2-0',
        rpeTarget: 'RPE 6.5 / 10',
      },
      {
        name: 'Chien Tête en Bas vers Fente Dynamique',
        category: 'Chaîne Postérieure & Flexion de Hanche',
        equipment: 'Poids du corps',
        difficulty: 'Facile',
        biomechanicMatch: 'Étire la chaîne postérieure complète (mollets, ischios) et décompresse les épaules.',
        tempoCode: 'Fluide 45s',
        rpeTarget: 'RPE 6 / 10',
      },
      {
        name: 'Rotation Thoracique Quadrupédique (Quadruped T-Spine)',
        category: 'Mobilité Thoracique & Épaules',
        equipment: 'Poids du corps',
        difficulty: 'Facile',
        biomechanicMatch: 'Isole la rotation thoracique en verrouillant les lombaires à quatre pattes.',
        tempoCode: '2-2-2-0',
        rpeTarget: 'RPE 5.5 / 10',
      },
    ]);
  }

  // 14. Cardio / HIIT / Plyométrie
  if (n.includes('burpee') || n.includes('jack') || n.includes('jump') || n.includes('corde') || n.includes('knee') || n.includes('cardio') || n.includes('skipping') || n.includes('saut')) {
    return filterCurrent([
      {
        name: 'Jumping Jacks Contrôlés Tempo Régulier',
        category: 'Cardio / Endurance',
        equipment: 'Poids du corps',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Élévation de la fréquence cardiaque avec faible impact articulaire.',
        tempoCode: 'Continu 45s',
        rpeTarget: 'RPE 7.5 / 10',
      },
      {
        name: 'Corde à Sauter Virtuelle (Sauts Légers)',
        category: 'Cardio / Mollets & Coordination',
        equipment: 'Poids du corps',
        difficulty: 'Facile',
        biomechanicMatch: 'Travail pliométrique léger stimulant le retour veineux sans surcharge.',
        tempoCode: 'Continu 60s',
        rpeTarget: 'RPE 7 / 10',
      },
      {
        name: 'High Knees (Montées de Genoux Dynamiques)',
        category: 'Cardio / Flexeurs de Hanche',
        equipment: 'Poids du corps',
        difficulty: 'Équivalent',
        biomechanicMatch: 'Recrutement des psoas et de la chaîne antérieure en régime cardiovasculaire.',
        tempoCode: 'Continu 30s',
        rpeTarget: 'RPE 8 / 10',
      },
      {
        name: 'Shadow Boxing (Cardio sans Impact)',
        category: 'Cardio HAUT DU CORPS',
        equipment: 'Poids du corps',
        difficulty: 'Facile',
        biomechanicMatch: 'Mobilisation des bras et du buste zéro choc pour les genoux et les chevilles.',
        tempoCode: 'Continu 45s',
        rpeTarget: 'RPE 7 / 10',
      },
    ]);
  }

  // 15. Fallback Généraliste Intelligente (Toujours 4 alternatives au minimum)
  const cleanName = exName.replace(/\(.*\)/g, '').trim();
  return filterCurrent([
    {
      name: `Variante Tempo Lent (4s) : ${cleanName}`,
      category: 'Contrôle Excentrique',
      equipment: 'Poids du corps',
      difficulty: 'Équivalent',
      biomechanicMatch: 'Augmente le temps sous tension et améliore la proprioception.',
      tempoCode: '4-1-1-0',
      rpeTarget: 'RPE 7.5 / 10',
    },
    {
      name: `Variante Pause Isométrique (2s) : ${cleanName}`,
      category: 'Fixation Posturale',
      equipment: 'Poids du corps',
      difficulty: 'Équivalent',
      biomechanicMatch: 'Renforce la stabilité articulaire aux points d\'amplitude maximale.',
      tempoCode: '2-2-1-0',
      rpeTarget: 'RPE 8 / 10',
    },
    {
      name: `Variante Amplitude Réduite / Contrôlée : ${cleanName}`,
      category: 'Sécurité Articulaire',
      equipment: 'Poids du corps',
      difficulty: 'Facile',
      biomechanicMatch: 'Réduit le stress sur les tendons en maintenant l\'activation musculaire.',
      tempoCode: '2-1-2-0',
      rpeTarget: 'RPE 7 / 10',
    },
    {
      name: `Variante Unilatérale / Poids du Corps : ${cleanName}`,
      category: 'Équilibre & Stabilité',
      equipment: 'Poids du corps',
      difficulty: 'Équivalent',
      biomechanicMatch: 'Elimine les asymétries de force et active les muscles stabilisateurs secondaires.',
      tempoCode: '2-1-1-0',
      rpeTarget: 'RPE 8 / 10',
    },
  ]);
}
