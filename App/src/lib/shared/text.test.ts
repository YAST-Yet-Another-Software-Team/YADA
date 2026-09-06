import { describe, expect, it } from "vitest";

import { formatCedis, initials } from "./text";

describe("formatCedis", () => {
  /**
   * One helper so the dashboard, tracking and history cannot disagree: a price
   * that renders as "GH₵55" on one screen and "GH₵55.00" on another reads like
   * two different numbers.
   */
  it("always shows two decimal places", () => {
    expect(formatCedis(55)).toBe("GH₵55.00");
    expect(formatCedis(55.5)).toBe("GH₵55.50");
    expect(formatCedis(0)).toBe("GH₵0.00");
  });

  it("rounds to the pesewa", () => {
    expect(formatCedis(55.554)).toBe("GH₵55.55");
    expect(formatCedis(55.556)).toBe("GH₵55.56");
  });

  it("rounds on the stored binary value, not the decimal one", () => {
    // `toFixed` rounds what a float64 actually holds, and 55.555 is stored a
    // hair below the midpoint — so it goes down. Harmless here (an order price
    // is entered in pesewas, two places), but pinned so it is a known property
    // rather than a surprise if this ever feeds arithmetic.
    expect(formatCedis(55.555)).toBe("GH₵55.55");
  });

  it("shows a dash where there is no number", () => {
    expect(formatCedis(null)).toBe("—");
    expect(formatCedis(undefined)).toBe("—");
    expect(formatCedis(Number.NaN)).toBe("—");
    expect(formatCedis(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("initials", () => {
  it("takes the first letter of the first two names", () => {
    expect(initials("Kwame Asante", "C")).toBe("KA");
    expect(initials("Kwame Nkrumah Asante", "C")).toBe("KN");
  });

  it("handles a single name", () => {
    expect(initials("Favorie", "B")).toBe("F");
  });

  it("upper-cases", () => {
    expect(initials("kwame asante", "C")).toBe("KA");
  });

  it("falls back for a missing name", () => {
    expect(initials(null, "C")).toBe("C");
    expect(initials(undefined, "C")).toBe("C");
    expect(initials("", "C")).toBe("C");
  });

  it("falls back for a name that yields nothing usable", () => {
    // Callers never have to re-check the result, so whitespace must not slip
    // through as an empty avatar.
    expect(initials("   ", "C")).toBe("C");
  });
});
