import { describe, expect, it } from "vitest";

import { MAX_PHOTO_DATA_URL_LENGTH } from "$lib/client/images/profile-photo";

import { photoDataUrl } from "./photo";

/**
 * Profile photo validation — the security-relevant schema in the app.
 *
 * The accepted string ends up in an `<img src>`. `data:image/...` cannot carry
 * script; `data:text/html` and `data:image/svg+xml` can. Two paths write this
 * column (sign-up and `PUT /api/account/photo`) and both go through here, so
 * this is the single place the rule is enforced — and therefore the single
 * place worth testing hard.
 */

const body = (length = 32) => "A".repeat(length);

describe("accepts what the browser-side downscale produces", () => {
  it.each(["png", "jpeg", "webp"])("accepts a %s data URL", (type) => {
    const result = photoDataUrl.safeParse(
      `data:image/${type};base64,${body()}`,
    );
    expect(result.success).toBe(true);
  });

  it("accepts base64 padding", () => {
    expect(
      photoDataUrl.safeParse(`data:image/png;base64,${body()}==`).success,
    ).toBe(true);
  });
});

describe("rejects anything that could carry script", () => {
  /**
   * The whole reason the scheme is pinned rather than merely checked for being
   * a data URL.
   */
  it("rejects data:text/html", () => {
    expect(
      photoDataUrl.safeParse(
        "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
      ).success,
    ).toBe(false);
  });

  it("rejects SVG, which can carry script despite being an image", () => {
    expect(
      photoDataUrl.safeParse(`data:image/svg+xml;base64,${body()}`).success,
    ).toBe(false);
  });

  it("rejects a javascript: URL", () => {
    expect(photoDataUrl.safeParse("javascript:alert(1)").success).toBe(false);
  });

  it("rejects a remote URL", () => {
    // No off-origin image loading from a column rendered into an <img>.
    expect(photoDataUrl.safeParse("https://example.com/evil.png").success).toBe(
      false,
    );
  });

  it("rejects an unlisted image type", () => {
    expect(
      photoDataUrl.safeParse(`data:image/gif;base64,${body()}`).success,
    ).toBe(false);
  });

  it("rejects a plain-text data URL", () => {
    expect(photoDataUrl.safeParse("data:,hello").success).toBe(false);
  });

  it("rejects a non-base64 data URL", () => {
    expect(photoDataUrl.safeParse("data:image/png,notbase64").success).toBe(
      false,
    );
  });

  it("rejects characters outside the base64 alphabet", () => {
    // `<` is the one that matters — it is what an injected tag starts with.
    expect(
      photoDataUrl.safeParse("data:image/png;base64,abc<script>").success,
    ).toBe(false);
  });

  it("rejects a smuggled prefix", () => {
    expect(
      photoDataUrl.safeParse(`x-data:image/png;base64,${body()}`).success,
    ).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(photoDataUrl.safeParse("").success).toBe(false);
  });
});

describe("the size cap", () => {
  it("accepts a photo at the limit", () => {
    const prefix = "data:image/jpeg;base64,";
    const exact =
      prefix + "A".repeat(MAX_PHOTO_DATA_URL_LENGTH - prefix.length);
    expect(exact.length).toBe(MAX_PHOTO_DATA_URL_LENGTH);
    expect(photoDataUrl.safeParse(exact).success).toBe(true);
  });

  it("refuses a hand-written request parking a megabyte in the column", () => {
    const prefix = "data:image/jpeg;base64,";
    const oversized =
      prefix + "A".repeat(MAX_PHOTO_DATA_URL_LENGTH - prefix.length + 1);
    expect(photoDataUrl.safeParse(oversized).success).toBe(false);
  });
});
