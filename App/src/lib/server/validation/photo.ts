import { z } from "zod";

import { MAX_PHOTO_DATA_URL_LENGTH } from "$lib/client/images/profile-photo";

/**
 * A profile photo as `$lib/client/images/profile-photo` produces it: a small
 * square JPEG carried as a data URL, because YADA has no file storage and
 * `users.image` is a text column.
 *
 * The scheme is restricted because this string ends up in an `<img src>`:
 * `data:image/...` cannot carry script, `data:text/html` can. The length cap is
 * the one the browser-side downscale already lands under — it exists so a
 * hand-written request can't park a megabyte in that column.
 *
 * Shared because two paths write the same column: sign-up (a courier's photo is
 * part of registration) and `PUT /api/account/photo` (either role changing it
 * later). One regex, so they cannot disagree about what is acceptable.
 */
export const photoDataUrl = z
  .string()
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, {
    message: "We couldn't accept that photo. Choose a different one.",
  })
  .max(
    MAX_PHOTO_DATA_URL_LENGTH,
    "That photo is too large. Choose a smaller one.",
  );
