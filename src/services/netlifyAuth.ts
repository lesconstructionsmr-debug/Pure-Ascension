import { auth } from './firebase';

/**
 * Headers JSON + Bearer Firebase pour les appels Netlify Functions protégés.
 * Lance une erreur claire si l'utilisateur n'est pas connecté / token indisponible.
 */
export async function getNetlifyAuthHeaders(
  options: { forceRefresh?: boolean } = {}
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const user = auth.currentUser;
  if (!user) {
    throw new Error('Connecte-toi à ton compte Pure Ascension pour continuer.');
  }

  try {
    const token = await user.getIdToken(!!options.forceRefresh);
    if (!token) {
      throw new Error('Ta session a expiré. Reconnecte-toi puis réessaie.');
    }
    headers.Authorization = `Bearer ${token}`;
  } catch (err: any) {
    if (err?.message?.includes('Connecte-toi') || err?.message?.includes('session')) {
      throw err;
    }
    console.warn('getNetlifyAuthHeaders : impossible d\'obtenir le token', err);
    throw new Error('Ta session a expiré. Reconnecte-toi puis réessaie.');
  }

  return headers;
}
