/** Messages API Netlify → texte FR utilisateur (jamais les codes bruts). */
export function apiErrorMessage(
  data: { error?: string; message?: string } | null | undefined,
  fallback: string
): string {
  if (data?.message && typeof data.message === 'string' && data.message.trim()) {
    return data.message.trim();
  }

  const code = (data?.error || '').toUpperCase();
  switch (code) {
    case 'AUTH_REQUIRED':
      return 'Connecte-toi à ton compte Pure Ascension pour continuer.';
    case 'AUTH_INVALID':
      return 'Ta session a expiré. Reconnecte-toi puis réessaie.';
    case 'FORBIDDEN':
      return 'Accès refusé. Reconnecte-toi puis réessaie.';
    default:
      if (data?.error && !/^[A-Z0-9_]+$/.test(data.error)) {
        return data.error;
      }
      return fallback;
  }
}
