/**
 * Réduction d'image côté client (web uniquement).
 *
 * `expo-image-picker` ignore l'option `quality` sur le web : une photo de
 * téléphone part alors en Base64 brut et dépasse la limite de 5 Mo du scanner.
 * Réduire avant l'envoi évite le rejet, accélère l'upload et diminue le nombre
 * de tokens image facturés par l'IA.
 */

const MAX_SIDE_PX = 1024;
const JPEG_QUALITY = 0.72;

function canResizeHere(): boolean {
  return typeof document !== 'undefined' && typeof Image !== 'undefined';
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image illisible'));
    img.src = src;
  });
}

/**
 * Retourne un Data URL JPEG réduit, ou l'entrée inchangée si le
 * redimensionnement est impossible (natif, format exotique, erreur canvas).
 */
export async function downscaleDataUrl(
  dataUrl: string,
  maxSide: number = MAX_SIDE_PX
): Promise<string> {
  if (!canResizeHere() || !dataUrl.startsWith('data:image/')) return dataUrl;

  try {
    const img = await loadImage(dataUrl);
    const longest = Math.max(img.width, img.height);
    if (!longest) return dataUrl;

    const ratio = Math.min(1, maxSide / longest);
    const width = Math.round(img.width * ratio);
    const height = Math.round(img.height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, width, height);

    const resized = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    return resized.length < dataUrl.length ? resized : dataUrl;
  } catch (err) {
    console.warn('downscaleDataUrl :', err);
    return dataUrl;
  }
}
