/**
 * Turning a chosen photo into something small enough to store on the user row.
 *
 * YADA has no file storage — no bucket, no CDN, and an adapter-node process
 * whose filesystem is not somewhere to put durable uploads. What it does have is
 * `users.image`, a text column. So the photo is downscaled to a square thumbnail
 * in the browser and carried as a data URL: a few tens of kilobytes, no upload
 * endpoint, no orphaned files to clean up.
 *
 * That is a real ceiling, not a temporary hack to be embarrassed about, but it
 * is a ceiling: this is a 256 px avatar, not a photograph anyone can inspect. If
 * courier verification ever needs the original — checking a face against an ID —
 * that needs actual storage, and this module is where the seam would be.
 */

/** Longest edge of the stored thumbnail. Avatars render at 48 px; this covers 2x. */
const MAX_EDGE = 256;

/** JPEG quality. 0.8 is the usual knee: visibly clean, roughly a third the bytes. */
const QUALITY = 0.8;

/** Refuse absurd source files before decoding them into memory. */
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

/**
 * The cap the server also enforces. A 256 px JPEG lands well under this; the
 * limit exists so a hand-written request can't park a megabyte in a text column.
 */
export const MAX_PHOTO_DATA_URL_LENGTH = 150_000;

export class ProfilePhotoError extends Error {}

/**
 * Read an image file into a square JPEG data URL, cropped to the centre.
 *
 * Centre-cropped rather than letterboxed because the result is only ever shown
 * in a circle — padding would just become visible bars inside it.
 */
export async function readProfilePhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new ProfilePhotoError('That file is not an image. Choose a photo.');
  }

  if (file.size > MAX_SOURCE_BYTES) {
    throw new ProfilePhotoError('That photo is too large. Choose one under 8 MB.');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ProfilePhotoError("We couldn't read that photo. Try a different one.");
  }

  try {
    const edge = Math.min(bitmap.width, bitmap.height);
    const size = Math.min(edge, MAX_EDGE);

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new ProfilePhotoError("We couldn't process that photo on this device.");
    }

    context.drawImage(
      bitmap,
      // Source: the largest centred square of the original.
      (bitmap.width - edge) / 2,
      (bitmap.height - edge) / 2,
      edge,
      edge,
      0,
      0,
      size,
      size
    );

    const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);

    if (dataUrl.length > MAX_PHOTO_DATA_URL_LENGTH) {
      throw new ProfilePhotoError('That photo is too detailed to store. Try a simpler one.');
    }

    return dataUrl;
  } finally {
    bitmap.close();
  }
}
