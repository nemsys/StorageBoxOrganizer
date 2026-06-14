/**
 * Image processing pipeline.
 *
 * Storage best-practice (Firebase free Spark plan): we never store full-size
 * images inline in the box/item documents. Instead every photo yields two
 * derivatives:
 *   - thumb: ~256px WebP, a few KB, stored INLINE on the entity doc so browsing
 *     (cards / sliders / lists) needs zero extra reads.
 *   - full:  ~1024px WebP, stored in its own `images` collection doc and fetched
 *     on demand (fullscreen) then cached in IndexedDB.
 *
 * WebP is ~25-35% smaller than JPEG at equal quality; we fall back to JPEG on
 * the rare engine that can't encode WebP from a canvas.
 */

// Derivative targets (longest edge, quality). Chosen for a single-user app on
// Spark: small docs, crisp enough fullscreen on a phone.
export const THUMB_MAX = 256;
export const THUMB_QUALITY = 0.6;
export const FULL_MAX = 1024;
export const FULL_QUALITY = 0.78;

// Feature-detect canvas WebP encoding once. If unsupported, toDataURL silently
// returns a PNG, so we sniff the result rather than trust the request.
let _webpSupported = null;
function supportsWebp() {
  if (_webpSupported !== null) return _webpSupported;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    _webpSupported = c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    _webpSupported = false;
  }
  return _webpSupported;
}

/**
 * Load any image source (File/Blob or data/URL string) into an HTMLImageElement.
 */
function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));

    if (typeof source === 'string') {
      img.src = source;
      return;
    }
    if (!source) {
      reject(new Error('No image source'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(source);
  });
}

/**
 * Draw an already-loaded image onto a canvas at a bounded size and encode it.
 * @returns {string} data URL (WebP when supported, else JPEG)
 */
function encode(img, maxEdge, quality) {
  let { width, height } = img;
  if (width > maxEdge) {
    height = (height * maxEdge) / width;
    width = maxEdge;
  }
  if (height > maxEdge) {
    width = (width * maxEdge) / height;
    height = maxEdge;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const mime = supportsWebp() ? 'image/webp' : 'image/jpeg';
  return canvas.toDataURL(mime, quality);
}

/**
 * Produce the thumb + full derivatives for one photo. The source image is
 * decoded a single time and re-encoded at both sizes.
 *
 * @param {File|Blob|string} source
 * @returns {Promise<{thumb: string, full: string} | null>}
 */
export async function makeDerivatives(source) {
  if (!source) return null;
  const img = await loadImage(source);
  const full = encode(img, FULL_MAX, FULL_QUALITY);
  const thumb = encode(img, THUMB_MAX, THUMB_QUALITY);
  return { thumb, full };
}

/**
 * Normalise an entity's images into a list of refs, tolerating every shape the
 * app has ever written:
 *   - new:    images: [{ id, thumb }]            (full lives in `images` coll)
 *   - import: images: [{ thumb, full }]          (no id yet)
 *   - legacy: images: ["data:..."]               (string == full-size)
 *   - legacy: image: "data:..."                  (single string)
 *
 * @returns {Array<{ id?: string, thumb: string, full?: string }>}
 */
export function getImageRefs(entity) {
  if (!entity) return [];
  const imgs = entity.images;
  if (Array.isArray(imgs) && imgs.length > 0) {
    if (typeof imgs[0] === 'object' && imgs[0] !== null) {
      return imgs
        .filter(Boolean)
        .map((r) => ({ id: r.id, thumb: r.thumb || r.full, full: r.full }))
        .filter((r) => r.thumb);
    }
    // Legacy array of full-size base64 strings.
    return imgs.filter(Boolean).map((s) => ({ thumb: s, full: s }));
  }
  if (entity.image) return [{ thumb: entity.image, full: entity.image }];
  return [];
}

/** Thumb strings for display (cards / sliders). */
export const refsToThumbs = (refs) => (refs || []).map((r) => r.thumb).filter(Boolean);

/**
 * Resize an image file to a maximum width/height while maintaining aspect ratio.
 * Retained for backward compatibility; new code should use makeDerivatives.
 * @returns {Promise<string>} - Base64 data URL of the resized image
 */
export async function resizeImage(file, maxWidth = 800, maxHeight = 800, quality = 0.8) {
  if (typeof file === 'string') return file;
  if (!file) return '';
  const img = await loadImage(file);
  // encode() bounds by a single longest edge; pass the larger of the two so the
  // behaviour matches the old max-width/height clamp closely enough.
  return encode(img, Math.max(maxWidth, maxHeight), quality);
}

/**
 * Convert a File/Blob to a base64 data URL without resizing.
 * @param {File|Blob} file - The file to convert
 * @returns {Promise<string>} - Base64 data URL
 */
export async function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    if (typeof file === 'string') {
      resolve(file);
      return;
    }
    if (!file) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
