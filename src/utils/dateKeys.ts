/**
 * Clés de jour en calendrier LOCAL (pas UTC).
 * Évite les scores qui « collent » après minuit (ex. Québec UTC-4).
 */
export function localTodayKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
