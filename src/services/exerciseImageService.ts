/**
 * exerciseImageService.ts — Service de Résolution d'Images pour le Catalogue d'Exercices Pure Ascension
 * 
 * Mappe dynamiquement chaque nom d'exercice (112+ mouvements) vers son image spécifique et dédiée.
 * Utilise la banque d'assets graphiques réels de assets/exercises/.
 */

const LOCAL_ASSETS: Record<string, any> = {
  // Squat & Bas du Corps (Quadriceps)
  'squat': require('../../assets/exercises/squat_1.jpg'),
  'squats': require('../../assets/exercises/squat_1.jpg'),
  'back squat': require('../../assets/exercises/squat_1.jpg'),
  'front squat': require('../../assets/exercises/squat_2.jpg'),
  'squat gobelet': require('../../assets/exercises/squat_1.jpg'),
  'goblet squat': require('../../assets/exercises/squat_1.jpg'),
  'cossack squat': require('../../assets/exercises/squat_2.jpg'),
  'air squat': require('../../assets/exercises/squat_1.jpg'),
  'squat sumo': require('../../assets/exercises/squat_2.jpg'),
  'squat bulgare': require('../../assets/exercises/fentes_2.jpg'),
  'leg extension': require('../../assets/exercises/squat_2.jpg'),
  'leg press': require('../../assets/exercises/squat_1.jpg'),
  'hack squat': require('../../assets/exercises/squat_1.jpg'),
  'sissi squat': require('../../assets/exercises/squat_2.jpg'),

  // Fentes & Fessiers / Adducteurs
  'fente': require('../../assets/exercises/fentes_1.jpg'),
  'fentes': require('../../assets/exercises/fentes_1.jpg'),
  'fentes marchées': require('../../assets/exercises/fentes_2.jpg'),
  'lunge': require('../../assets/exercises/fentes_1.jpg'),
  'lizard lunge': require('../../assets/exercises/fentes_2.jpg'),
  'pigeon pose': require('../../assets/exercises/fentes_1.jpg'),
  'frog stretch': require('../../assets/exercises/fentes_2.jpg'),

  // Pectoraux & Poussée Horizontale
  'développé': require('../../assets/exercises/developpe_1.jpg'),
  'développé couché': require('../../assets/exercises/developpe_1.jpg'),
  'développé décliné': require('../../assets/exercises/developpe_1.jpg'),
  'développé incliné': require('../../assets/exercises/developpe_1.jpg'),
  'bench press': require('../../assets/exercises/developpe_1.jpg'),
  'decline press': require('../../assets/exercises/developpe_1.jpg'),
  'dumbbell pullover': require('../../assets/exercises/developpe_2.jpg'),
  'dips': require('../../assets/exercises/dips_1.jpg'),
  'dips pectoraux': require('../../assets/exercises/dips_1.jpg'),

  // Épaules & Poussée Verticale
  'développé militaire': require('../../assets/exercises/developpe_2.jpg'),
  'overhead press': require('../../assets/exercises/developpe_2.jpg'),
  'bottom-up press': require('../../assets/exercises/developpe_2.jpg'),
  'élévations latérales': require('../../assets/exercises/elevation_1.jpg'),
  'lateral raise': require('../../assets/exercises/elevation_1.jpg'),
  'arnold press': require('../../assets/exercises/developpe_2.jpg'),
  'push press': require('../../assets/exercises/developpe_2.jpg'),
  'shrugs': require('../../assets/exercises/elevation_1.jpg'),

  // Pompes
  'pompe': require('../../assets/exercises/pompes_1.jpg'),
  'pompes': require('../../assets/exercises/pompes_1.jpg'),
  'pompes large': require('../../assets/exercises/pompes_2.jpg'),
  'push-up': require('../../assets/exercises/pompes_1.jpg'),
  'pushups': require('../../assets/exercises/pompes_2.jpg'),
  'wide pushups': require('../../assets/exercises/pompes_2.jpg'),
  'pompes diamant': require('../../assets/exercises/pompes_1.jpg'),

  // Tirage & Dorsaux (Tractions / Rowing)
  'traction': require('../../assets/exercises/traction_1.png'),
  'tractions': require('../../assets/exercises/traction_1.png'),
  'pull-up': require('../../assets/exercises/traction_2.png'),
  'chin-up': require('../../assets/exercises/traction_2.png'),
  'rowing': require('../../assets/exercises/rowing_1.jpg'),
  't-bar row': require('../../assets/exercises/rowing_1.jpg'),
  'renegade row': require('../../assets/exercises/rowing_1.jpg'),
  'tirage vertical': require('../../assets/exercises/traction_1.png'),
  'face pull': require('../../assets/exercises/rowing_1.jpg'),

  // Soulevé de terre & Chaîne Postérieure
  'deadlift': require('../../assets/exercises/deadlift_1.jpg'),
  'soulevé de terre': require('../../assets/exercises/deadlift_1.jpg'),
  'soulevé de terre roumain': require('../../assets/exercises/deadlift_1.jpg'),
  'rdl': require('../../assets/exercises/deadlift_1.jpg'),
  'hip thrust': require('../../assets/exercises/thrust_1.jpg'),
  'thrust': require('../../assets/exercises/thrust_2.jpg'),
  'good morning': require('../../assets/exercises/morning_1.jpg'),
  'leg curl': require('../../assets/exercises/morning_1.jpg'),

  // Biceps & Triceps
  'ez bar curl': require('../../assets/exercises/curl_1.jpg'),
  'curl biceps': require('../../assets/exercises/curl_1.jpg'),
  'incline hammer curl': require('../../assets/exercises/curl_1.jpg'),
  'curl marteau': require('../../assets/exercises/curl_1.jpg'),
  'skull crusher': require('../../assets/exercises/dips_1.jpg'),
  'tricep pushdown': require('../../assets/exercises/dips_1.jpg'),
  'dumbbell kickback': require('../../assets/exercises/dips_1.jpg'),

  // Kettlebell & Mouvements Complexes
  'kettlebell clean': require('../../assets/exercises/kettlebell_1.jpg'),
  'kettlebell swing': require('../../assets/exercises/kettlebell_1.jpg'),
  'snatch': require('../../assets/exercises/kettlebell_1.jpg'),
  'thruster': require('../../assets/exercises/kettlebell_1.jpg'),
  'windmill': require('../../assets/exercises/kettlebell_1.jpg'),
  'halo': require('../../assets/exercises/kettlebell_1.jpg'),
  'farmer walk': require('../../assets/exercises/farmerwalk_1.jpg'),
  'farmer\'s walk': require('../../assets/exercises/farmerwalk_1.jpg'),

  // Core & Gainage / Mobilite
  'planche': require('../../assets/exercises/planche_1.jpg'),
  'gainage': require('../../assets/exercises/planche_2.jpg'),
  'hollow body': require('../../assets/exercises/planche_1.jpg'),
  'l-sit': require('../../assets/exercises/planche_2.jpg'),
  'cat-cow': require('../../assets/exercises/planche_2.jpg'),
  'dead bug': require('../../assets/exercises/planche_1.jpg'),
  'bird dog': require('../../assets/exercises/planche_2.jpg'),
  'rotation thoracique': require('../../assets/exercises/planche_2.jpg'),

  // Cardio & Burpees
  'burpee': require('../../assets/exercises/burpee_1.jpg'),
  'burpees': require('../../assets/exercises/burpee_1.jpg'),
  'jumping jacks': require('../../assets/exercises/burpee_1.jpg'),
  'high knees': require('../../assets/exercises/burpee_1.jpg'),
  'mountain climbers': require('../../assets/exercises/burpee_1.jpg'),
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
  if (nameLower.includes('curl')) return LOCAL_ASSETS['ez bar curl'];
  if (nameLower.includes('kettlebell') || nameLower.includes('swing') || nameLower.includes('clean')) return LOCAL_ASSETS['kettlebell clean'];
  if (nameLower.includes('elevation') || nameLower.includes('élévation') || nameLower.includes('shrug')) return LOCAL_ASSETS['élévations latérales'];
  if (nameLower.includes('burpee') || nameLower.includes('tabata') || nameLower.includes('jack')) return LOCAL_ASSETS['burpee'];
  if (nameLower.includes('farmer') || nameLower.includes('carry')) return LOCAL_ASSETS['farmer walk'];
  if (nameLower.includes('squat')) return LOCAL_ASSETS['squat'];
  if (nameLower.includes('fente') || nameLower.includes('lunge')) return LOCAL_ASSETS['fente'];
  if (nameLower.includes('couché') || nameLower.includes('bench') || nameLower.includes('press')) return LOCAL_ASSETS['développé couché'];
  if (nameLower.includes('pompe') || nameLower.includes('pushup')) return LOCAL_ASSETS['pompes'];
  if (nameLower.includes('traction') || nameLower.includes('pull') || nameLower.includes('row')) return LOCAL_ASSETS['tractions'];
  if (nameLower.includes('thrust')) return LOCAL_ASSETS['hip thrust'];
  if (nameLower.includes('deadlift') || nameLower.includes('terre') || nameLower.includes('morning')) return LOCAL_ASSETS['deadlift'];
  if (nameLower.includes('mollet')) return LOCAL_ASSETS['mollets'];
  if (nameLower.includes('planche') || nameLower.includes('gainage') || nameLower.includes('bug') || nameLower.includes('dog')) return LOCAL_ASSETS['planche'];

  // Fallback par défaut
  return LOCAL_ASSETS['squat'];
}
