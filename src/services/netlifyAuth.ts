import { auth } from './firebase';

/**
 * Headers JSON + Bearer Firebase pour les appels Netlify Functions protégés.
 */
export async function getNetlifyAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const user = auth.currentUser;
  if (!user) return headers;

  try {
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  } catch (err) {
    console.warn('getNetlifyAuthHeaders : impossible d\'obtenir le token', err);
  }

  return headers;
}
