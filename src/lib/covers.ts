/**
 * Image intake: what a cover upload has to be, how it is shrunk to get there,
 * and where it is served from afterwards.
 *
 * **Nothing here is server-side image processing, and nothing here may become
 * it.** The shrinking happens on the device that took the photo, using the
 * canvas every browser already has — which keeps the platform's per-request
 * compute ceiling and its paid image pipeline out of the picture entirely. The
 * Worker only ever stores the bytes it is handed.
 *
 * This module is imported by both the browser and the server, so it must stay
 * free of server-only imports: the limits below are checked in the browser for
 * a useful message and checked again in the action, because a form is never a
 * trust boundary.
 *
 * What is checked is the *declared* type, not the bytes. Sniffing them would be
 * reading the image, which is the thing this module exists not to do on the
 * server — and it buys nothing here, because `/cover/` serves an object back
 * under the same declared type, so a file lying about being a PNG is served as
 * a PNG and is a broken image rather than anything a browser will run.
 */

/** The most we take, measured on the file a Contributor picked. */
const MAX_COVER_BYTES = 5 * 1024 * 1024;

/** Roughly what the long edge is shrunk to before anything is uploaded. */
const LONG_EDGE = 800;

/** What we accept, and the extension each is stored under. */
export const COVER_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** "HEIC images", "That kind of file" — whatever we can say about what they picked. */
function describe(type: string) {
  const [top, sub] = type.split('/');
  return top === 'image' && sub ? `${sub.split('+')[0].toUpperCase()} images` : 'That kind of file';
}

/**
 * Why this file can't be a cover, in words that say what to do instead, or
 * null. Phone-native formats land in the first branch — an iPhone photographs
 * in HEIC by default and nothing but Safari can decode it — so the message
 * names the setting that stops it happening again.
 */
export function coverProblem(file: { type: string; size: number }): string | null {
  // `hasOwn`, not a truthiness test: a forged upload claiming to be
  // `constructor` would otherwise find something on Object's prototype and
  // pass. Everything downstream reads the extension out of this same table, so
  // once this returns null the type is one of exactly three.
  if (!Object.hasOwn(COVER_TYPES, file.type)) {
    return `${describe(file.type)} can't be used as a cover — we take JPEG, PNG and WebP. Export or convert it to one of those and try again. On an iPhone, Settings → Camera → Formats → “Most Compatible” makes the camera take JPEGs from now on.`;
  }
  if (file.size > MAX_COVER_BYTES) {
    return `That image is ${(file.size / 1024 / 1024).toFixed(1)}MB and 5MB is the most we take. Export a smaller copy — most photo apps offer a “medium” or “email” size — and try again.`;
  }
  return null;
}

/**
 * The image, redrawn at about 800 pixels on its long edge. Browser-only: it
 * wants a canvas.
 *
 * A photo straight off a phone is several megabytes and several thousand
 * pixels wide; a cover is rendered at a few hundred. Uploading the original
 * would be the slow part of contributing from a phone, so it never happens —
 * what leaves the device is tens of kilobytes.
 *
 * WebP at 0.85 for everything, transparency included. A browser too old to
 * encode WebP gets PNG from `toBlob` instead, silently and by specification,
 * which is why the caller reads the type off the blob rather than assuming it.
 */
export async function resizeCover(file: File): Promise<Blob> {
  // `from-image` so a photo taken sideways is stored the way it was taken: the
  // orientation lives in EXIF, and the canvas would otherwise drop it.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, LONG_EDGE / Math.max(bitmap.width, bitmap.height));

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.85),
  );
  if (!blob) throw new Error('the browser could not re-encode the image');
  return blob;
}

/**
 * Uploaded covers are served by the application from the bucket, never from the
 * bucket's own public development URL, which is rate-limited and documented as
 * being for development only. The key becomes the path after `/cover/`, a
 * segment at a time, so a seeded filename carrying a `+` or a space still
 * addresses its object.
 */
export const coverPath = (key: string) =>
  `/cover/${key.split('/').map(encodeURIComponent).join('/')}`;
