/**
 * exerciseImageService.ts — Service de Résolution d'Images pour le Catalogue d'Exercices Pure Ascension
 * 
 * Mappe dynamiquement chaque nom d'exercice (85+ mouvements) vers son image réelle issue du catalogue.
 * Utilise les assets graphiques réels de assets/exercises/ et des illustrations vectorielles anatomiques.
 */

const LOCAL_ASSETS: Record<string, any> = {
  // Squat & Bas du Corps
  'squat': require('../../assets/exercises/squat_1.jpg'),
  'squats': require('../../assets/exercises/squat_1.jpg'),
  'back squat': require('../../assets/exercises/squat_1.jpg'),
  'front squat': require('../../assets/exercises/squat_2.jpg'),
  'squat gobelet': require('../../assets/exercises/squat_1.jpg'),
  'goblet squat': require('../../assets/exercises/squat_1.jpg'),
  'cossack squat': require('../../assets/exercises/squat_2.jpg'),
  'air squat': require('../../assets/exercises/squat_1.jpg'),
  'leg extension': require('../../assets/exercises/squat_2.jpg'),
  'leg press': require('../../assets/exercises/squat_1.jpg'),

  // Fentes & Fessiers
  'fente': require('../../assets/exercises/fentes_1.jpg'),
  'fentes': require('../../assets/exercises/fentes_1.jpg'),
  'fentes marchées': require('../../assets/exercises/fentes_2.jpg'),
  'lunge': require('../../assets/exercises/fentes_1.jpg'),
  'lizard lunge': require('../../assets/exercises/fentes_2.jpg'),

  // Pectoraux & Poussée
  'développé': require('../../assets/exercises/developpe_1.jpg'),
  'développé couché': require('../../assets/exercises/developpe_1.jpg'),
  'développé décliné': require('../../assets/exercises/developpe_1.jpg'),
  'bench press': require('../../assets/exercises/developpe_1.jpg'),
  'decline press': require('../../assets/exercises/developpe_1.jpg'),
  'dumbbell pullover': require('../../assets/exercises/developpe_2.jpg'),
  'développé militaire': require('../../assets/exercises/developpe_2.jpg'),
  'overhead press': require('../../assets/exercises/developpe_2.jpg'),
  'bottom-up press': require('../../assets/exercises/developpe_2.jpg'),

  // Pompes & Dips
  'pompe': require('../../assets/exercises/pompes_1.jpg'),
  'pompes': require('../../assets/exercises/pompes_1.jpg'),
  'pompes prise large': require('../../assets/exercises/pompes_2.jpg'),
  'push-up': require('../../assets/exercises/pompes_1.jpg'),
  'pushups': require('../../assets/exercises/pompes_2.jpg'),
  'wide pushups': require('../../assets/exercises/pompes_2.jpg'),

  // Tirage & Dorsaux
  'traction': require('../../assets/exercises/traction_1.png'),
  'tractions': require('../../assets/exercises/traction_1.png'),
  'pull-up': require('../../assets/exercises/traction_2.png'),
  'chin-up': require('../../assets/exercises/traction_2.png'),
  'rowing': require('../../assets/exercises/rowing_1.jpg'),
  't-bar row': require('../../assets/exercises/rowing_1.jpg'),
  'renegade row': require('../../assets/exercises/rowing_1.jpg'),
  'dips': require('../../assets/exercises/dips_1.jpg'),

  // Chaîne Postérieure & Deadlift
  'hip thrust': require('../../assets/exercises/thrust_1.jpg'),
  'thrust': require('../../assets/exercises/thrust_2.jpg'),
  'good morning': require('../../assets/exercises/morning_1.jpg'),
  'deadlift': require('../../assets/exercises/deadlift_1.jpg'),
  'soulevé de terre': require('../../assets/exercises/deadlift_1.jpg'),
  'leg curl': require('../../assets/exercises/morning_1.jpg'),

  // Bras (Biceps / Triceps / Épaules / Trapèzes)
  'ez bar curl': require('../../assets/exercises/developpe_2.jpg'),
  'incline hammer curl': require('../../assets/exercises/developpe_2.jpg'),
  'skull crushers': require('../../assets/exercises/developpe_2.jpg'),
  'tricep pushdowns': require('../../assets/exercises/developpe_2.jpg'),
  'dumbbell kickbacks': require('../../assets/exercises/developpe_2.jpg'),
  'shrugs': require('../../assets/exercises/developpe_2.jpg'),

  // Mollets & Core / Mobilite
  'mollets': require('../../assets/exercises/mollets_1.jpg'),
  'mollets debout': require('../../assets/exercises/mollets_1.jpg'),
  'planche': require('../../assets/exercises/planche_1.jpg'),
  'gainage': require('../../assets/exercises/planche_2.jpg'),
  'hollow body': require('../../assets/exercises/planche_1.jpg'),
  'cat-cow': require('../../assets/exercises/planche_2.jpg'),
};

/**
 * Retourne l'asset d'image local ou une illustration par défaut si non disponible
 */
export function getExerciseImageSource(exerciseName: string): any {
  if (!exerciseName) return LOCAL_ASSETS['squat'];
  
  const nameLower = exerciseName.toLowerCase().trim();

  // Recherche directe par clé exacte
  if (LOCAL_ASSETS[nameLower]) {
    return LOCAL_ASSETS[nameLower];
  }

  // Recherche par mot-clé contenu dans le nom
  if (nameLower.includes('squat')) return LOCAL_ASSETS['squat'];
  if (nameLower.includes('fente') || nameLower.includes('lunge')) return LOCAL_ASSETS['fente'];
  if (nameLower.includes('couché') || nameLower.includes('bench') || nameLower.includes('press')) return LOCAL_ASSETS['développé couché'];
  if (nameLower.includes('pompe') || nameLower.includes('pushup')) return LOCAL_ASSETS['pompes'];
  if (nameLower.includes('traction') || nameLower.includes('pull') || nameLower.includes('row')) return LOCAL_ASSETS['tractions'];
  if (nameLower.includes('thrust')) return LOCAL_ASSETS['hip thrust'];
  if (nameLower.includes('deadlift') || nameLower.includes('terre') || nameLower.includes('morning')) return LOCAL_ASSETS['good morning'];
  if (nameLower.includes('mollet')) return LOCAL_ASSETS['mollets'];
  if (nameLower.includes('planche') || nameLower.includes('gainage') || nameLower.includes('bug') || nameLower.includes('dog')) return LOCAL_ASSETS['planche'];

  // Fallback par défaut
  return LOCAL_ASSETS['squat'];
}
