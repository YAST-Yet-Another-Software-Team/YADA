/**
 * Turning a chosen photo into something small enough to store on the user row.
 *
 * YADA has no file storage — no bucket, no CDN, and a Workers isolate has no
 * filesystem to put durable uploads on. What it does have is
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
  if (!file.type.startsWith("image/")) {
    throw new ProfilePhotoError("That file is not an image. Choose a photo.");
  }

  if (file.size > MAX_SOURCE_BYTES) {
    throw new ProfilePhotoError(
      "That photo is too large. Choose one under 8 MB.",
    );
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ProfilePhotoError(
      "We couldn't read that photo. Try a different one.",
    );
  }

  try {
    const edge = Math.min(bitmap.width, bitmap.height);
    const size = Math.min(edge, MAX_EDGE);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new ProfilePhotoError(
        "We couldn't process that photo on this device.",
      );
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
      size,
    );

    const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);

    if (dataUrl.length > MAX_PHOTO_DATA_URL_LENGTH) {
      throw new ProfilePhotoError(
        "That photo is too detailed to store. Try a simpler one.",
      );
    }

    return dataUrl;
  } finally {
    bitmap.close();
  }
}

/**
 * The same thing, for a photo that is already on the web — in practice the
 * avatar a Google account arrives with.
 *
 * Storing Google's URL as-is would work until it doesn't: it is a third party's
 * CDN, its lifetime is not ours, and it leaks a request to Google every time
 * anyone in YADA looks at the rider. Fetching it once and putting it through
 * the same downscale means what we hold is a photo, not a link.
 *
 * Throws `ProfilePhotoError` when the fetch is refused — a cross-origin policy
 * we don't control is a perfectly ordinary outcome here, and the caller's job
 * is then to offer an upload rather than to fail.
 */
export async function readProfilePhotoFromUrl(url: string): Promise<string> {
  let blob: Blob;

  try {
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!response.ok) throw new Error(String(response.status));
    blob = await response.blob();
  } catch {
    throw new ProfilePhotoError(
      "We couldn't fetch that picture. Choose a photo instead.",
    );
  }

  // `readProfilePhoto` wants a File for its type and size guards, and a File is
  // a Blob with a name — so this reuses every rule rather than restating them.
  return readProfilePhoto(
    new File([blob], "profile.jpg", { type: blob.type || "image/jpeg" }),
  );
}
