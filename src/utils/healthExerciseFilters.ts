/**
 * Filtres de sécurité exercices selon conditions de santé (grossesse / post-partum, etc.).
 */

export function parseHealthConditions(raw?: string | null): string[] {
  if (!raw) return [];
  return String(raw)
    .split(/[,;|/]+/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

export function hasCondition(raw: string | null | undefined, id: string): boolean {
  return parseHealthConditions(raw).includes(id.toLowerCase());
}

export function isPregnancySafeMode(raw?: string | null): boolean {
  const list = parseHealthConditions(raw);
  return list.some(c =>
    c.includes('grossesse') ||
    c.includes('post-partum') ||
    c.includes('postpartum') ||
    c.includes('pregnant') ||
    c.includes('pregnancy')
  );
}

const PREGNANCY_BAN_KEYWORDS = [
  'burpee', 'tabata', 'jump', 'saut', 'sauté', 'saute',
  'skater', 'high knees', 'mountain climber', 'climber',
  'swing', 'thruster', 'snatch', 'clean', 'jerk',
  'vma', 'zone 5', 'sprint', 'hiit',
  'crunch', 'sit-up', 'situp', 'reverse crunch',
  'dragon flag', 'toes-to-bar', 'toes to bar', 'l-sit',
  'planche dynamique', 'commando',
  'pistol', 'deficit',
  'box jump', 'depth jump', 'plyo',
];

const PREGNANCY_SAFE_BY_PATTERN: Record<string, string> = {
  impact: 'Marche active contrôlée',
  hinge: 'Hip hinge léger (goblet) — amplitude confortable',
  squat: 'Squat assis-debout (box) — amplitude confortable',
  core: 'Deadbug — respiration + plancher pelvien',
  push: 'Pompes inclinées murales / banc',
  pull: 'Rowing élastique assis — charge légère',
  cardio: 'Cardio Zone 2 — effort conversationnel',
  default: 'Mobilité douce hanches / bassin + respiration',
};

function guessPattern(name: string): string {
  const n = name.toLowerCase();
  if (/(burpee|jump|saut|sprint|hiit|tabata|vma|climber|skater)/.test(n)) return 'impact';
  if (/(swing|deadlift|rdl|hinge|soulevé)/.test(n)) return 'hinge';
  if (/(squat|fente|lunge|leg press)/.test(n)) return 'squat';
  if (/(crunch|sit-up|plank|gainage|abs|core|commando|hollow)/.test(n)) return 'core';
  if (/(pompe|push|développé|presse|pect)/.test(n)) return 'push';
  if (/(row|tirage|traction|pull)/.test(n)) return 'pull';
  if (/(course|run|bike|vélo|cardio|corde)/.test(n)) return 'cardio';
  return 'default';
}

export function isExerciseContraindicated(name: string, healthConditions?: string | null): boolean {
  if (!isPregnancySafeMode(healthConditions)) return false;
  const n = name.toLowerCase();
  return PREGNANCY_BAN_KEYWORDS.some(k => n.includes(k));
}

export function getSafeReplacement(name: string, healthConditions?: string | null): string {
  if (!isExerciseContraindicated(name, healthConditions)) return name;
  const pattern = guessPattern(name);
  return PREGNANCY_SAFE_BY_PATTERN[pattern] || PREGNANCY_SAFE_BY_PATTERN.default;
}

export function sanitizeExerciseName(name: string, healthConditions?: string | null): string {
  return getSafeReplacement(name, healthConditions);
}

/** Cap RPE pour grossesse / post-partum (ex: "RPE 8.5" → "RPE 6.5"). */
export function capRpeForConditions(rpe: string | undefined, healthConditions?: string | null): string | undefined {
  if (!rpe || !isPregnancySafeMode(healthConditions)) return rpe;
  const match = rpe.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 'RPE 6.5';
  const capped = Math.min(parseFloat(match[1]), 6.5);
  return rpe.replace(match[1], String(capped));
}

export function filterAlternativesForHealth<T extends { name: string }>(
  alts: T[],
  healthConditions?: string | null,
): T[] {
  if (!isPregnancySafeMode(healthConditions)) return alts;
  return alts.filter(a => !isExerciseContraindicated(a.name, healthConditions));
}
