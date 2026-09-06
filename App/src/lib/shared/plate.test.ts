import { describe, expect, it } from "vitest";

import { formatPlate, maskPlate, normalisePlate } from "./plate";

/**
 * Number plates: `GT 4521-20`.
 *
 * Lenient by design. A rider whose plate does not match the Ghanaian pattern
 * still has to be able to type it, and a business at the counter reads whatever
 * is painted on the bike — so every function here shapes a value while it can
 * still become a plate and hands it back untouched the moment it cannot.
 *
 * Several assertions below encode regressions the source documents: digits
 * being eaten on paste, a typed hyphen vanishing, and a bare serial being
 * invented into a serial-and-year.
 */

describe("formatPlate", () => {
  it("shapes the canonical form", () => {
    expect(formatPlate("GT4521-20")).toBe("GT 4521-20");
    expect(formatPlate("gt 4521-20")).toBe("GT 4521-20");
    expect(formatPlate("  GT   4521-20  ")).toBe("GT 4521-20");
  });

  it("trusts a stored hyphen over its own guess", () => {
    // Only the owner knows whether GR12311 is GR 1231-1 or GR 123-11.
    expect(formatPlate("GR 123-11")).toBe("GR 123-11");
    expect(formatPlate("GR 1231-1")).toBe("GR 1231-1");
  });

  /**
   * Splitting four digits invents a hyphen and a registration year out of
   * digits nobody offered — `GT4521` is not `GT 45-21`.
   */
  it("leaves a bare serial as a serial", () => {
    expect(formatPlate("GT4521")).toBe("GT 4521");
    expect(formatPlate("GT123")).toBe("GT 123");
  });

  it("reads the last two digits as the year when there are too many for a serial", () => {
    expect(formatPlate("GT452120")).toBe("GT 4521-20");
  });

  it("hands back a plate of an unknown shape rather than guessing", () => {
    expect(formatPlate("1234")).toBe("1234");
    expect(formatPlate("ABCD 1234")).toBe("ABCD 1234");
  });

  it("is empty for empty input", () => {
    expect(formatPlate("")).toBe("");
    expect(formatPlate(null)).toBe("");
    expect(formatPlate(undefined)).toBe("");
  });

  it("is stable over its own output", () => {
    for (const plate of ["GT4521-20", "GT4521", "GR 123-11", "GT452120"]) {
      const once = formatPlate(plate);
      expect(formatPlate(once), plate).toBe(once);
    }
  });
});

describe("normalisePlate", () => {
  it("stores the shaped form", () => {
    expect(normalisePlate("gt4521-20")).toBe("GT 4521-20");
  });

  it("treats a cleared field as null, not a blank string", () => {
    expect(normalisePlate("")).toBeNull();
    expect(normalisePlate("   ")).toBeNull();
    expect(normalisePlate(null)).toBeNull();
  });
});

describe("maskPlate", () => {
  it("holds the region code while it is still being typed", () => {
    expect(maskPlate("G")).toBe("G");
    expect(maskPlate("GT")).toBe("GT");
  });

  it("spaces the serial once digits start", () => {
    expect(maskPlate("GT4")).toBe("GT 4");
    expect(maskPlate("GT4521")).toBe("GT 4521");
  });

  it("places the hyphen once the serial is full", () => {
    expect(maskPlate("GT45212")).toBe("GT 4521-2");
    expect(maskPlate("GT452120")).toBe("GT 4521-20");
  });

  it("upper-cases as it goes", () => {
    expect(maskPlate("gt4521-20")).toBe("GT 4521-20");
  });

  /**
   * A hyphen typed with nothing behind it used to vanish, so a rider with a
   * three-digit serial could never place it: the keystroke disappeared and the
   * next digit was read as a fourth serial digit.
   */
  it("keeps a hyphen the rider typed themselves", () => {
    expect(maskPlate("GT 123-")).toBe("GT 123-");
    expect(maskPlate("GT 123-1")).toBe("GT 123-1");
    expect(maskPlate("GT 123-11")).toBe("GT 123-11");
  });

  /**
   * Truncating a split that doesn't fit *ate a digit the rider had typed* —
   * pasting `GR 12345-2` came back `GR 1234-2`, one character short and wrong,
   * with nothing on screen to say so.
   */
  it("never silently drops a digit from an over-long split", () => {
    expect(maskPlate("GR 12345-2")).toContain("12345");
    expect(maskPlate("GR 1234-123")).toContain("123");
  });

  it("hands back a shape it cannot hold the rider to", () => {
    expect(maskPlate("ABCD1234")).toBe("ABCD1234");
    expect(maskPlate("1234")).toBe("1234");
  });

  it("is empty for empty input", () => {
    expect(maskPlate("")).toBe("");
    expect(maskPlate("  ")).toBe("");
  });

  it("is idempotent over its own output", () => {
    for (const typed of ["GT452120", "GT 123-11", "GT4521", "GT"]) {
      const once = maskPlate(typed);
      expect(maskPlate(once), typed).toBe(once);
    }
  });

  it("emits something formatPlate can read back", () => {
    // The mask and the reader must agree, or a saved plate changes shape.
    for (const typed of ["GT452120", "GT 123-11", "GT4521"]) {
      const masked = maskPlate(typed);
      expect(formatPlate(masked), typed).toBe(masked);
    }
  });
});
