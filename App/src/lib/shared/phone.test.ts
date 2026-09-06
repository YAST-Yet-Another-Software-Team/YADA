import { describe, expect, it } from "vitest";

import {
  formatPhone,
  maskPhone,
  normalisePhone,
  PHONE_PATTERN,
  phoneDigits,
} from "./phone";

/**
 * Ghanaian mobile numbers, in the three forms the app keeps them in.
 *
 * The invariant underneath all of it: `users.phone_number` is unique, so every
 * spelling of one phone must reduce to one stored value. Two spellings becoming
 * two accounts is the bug this module exists to prevent.
 */

const SPELLINGS = [
  "0241234567",
  "024 123 4567",
  "+233241234567",
  "+233 24 123 4567",
  "233241234567",
];

describe("phoneDigits", () => {
  it("reduces every spelling of one number to the same national digits", () => {
    for (const spelling of SPELLINGS) {
      expect(phoneDigits(spelling), spelling).toBe("241234567");
    }
  });

  it("survives null and undefined", () => {
    expect(phoneDigits(null)).toBe("");
    expect(phoneDigits(undefined)).toBe("");
    expect(phoneDigits("")).toBe("");
  });

  it("never returns more than the nine significant digits", () => {
    expect(phoneDigits("0241234567890123").length).toBe(9);
  });
});

describe("normalisePhone", () => {
  it("stores one E.164 value whatever was typed", () => {
    for (const spelling of SPELLINGS) {
      expect(normalisePhone(spelling), spelling).toBe("+233241234567");
    }
  });

  /**
   * Clearing the field on a profile screen must stay a way of saying "no
   * number", not a way of saving a bare country code.
   */
  it("returns empty for empty input rather than a bare country code", () => {
    expect(normalisePhone("")).toBe("");
    expect(normalisePhone(null)).toBe("");
    expect(normalisePhone("   ")).toBe("");
  });
});

describe("formatPhone", () => {
  it("groups a complete number for reading", () => {
    expect(formatPhone("0241234567")).toBe("+233 24 123 4567");
  });

  it("hands back anything incomplete untouched", () => {
    // A half-typed or foreign number should look like what it is, not be
    // dressed up as a valid Ghanaian one.
    expect(formatPhone("0241")).toBe("0241");
    expect(formatPhone("+44 20 7946 0958")).toBe("+44 20 7946 0958");
  });

  it("is stable over its own output", () => {
    expect(formatPhone(formatPhone("0241234567"))).toBe("+233 24 123 4567");
  });
});

describe("maskPhone", () => {
  it("promotes a leading zero to the country code", () => {
    expect(maskPhone("0")).toBe("+233 ");
    expect(maskPhone("024")).toBe("+233 24");
    expect(maskPhone("0241")).toBe("+233 24 1");
    expect(maskPhone("0241234567")).toBe("+233 24 123 4567");
  });

  it("stops taking digits at nine — the mask is the length rule", () => {
    expect(maskPhone("02412345678901")).toBe("+233 24 123 4567");
  });

  it("is idempotent over its own output", () => {
    const once = maskPhone("0241234567");
    expect(maskPhone(once)).toBe(once);
  });

  /**
   * A value already starting with `+` is one this function wrote, so its first
   * three digits are the country code whatever they now say. That is what makes
   * backspacing into the prefix repair it rather than promote a stray `23` to a
   * national number.
   */
  it("lets a backspace into the prefix empty the field", () => {
    expect(maskPhone("+23")).toBe("");
    expect(maskPhone("+2")).toBe("");
  });

  it("returns empty for no digits at all", () => {
    expect(maskPhone("")).toBe("");
    expect(maskPhone("abc")).toBe("");
  });
});

describe("PHONE_PATTERN", () => {
  it("accepts the spellings the schema promises to take", () => {
    for (const value of ["0241234567", "+233241234567", "233241234567"]) {
      expect(PHONE_PATTERN.test(value), value).toBe(true);
    }
  });

  it("rejects a number of the wrong length", () => {
    expect(PHONE_PATTERN.test("024123456")).toBe(false);
    expect(PHONE_PATTERN.test("02412345678")).toBe(false);
  });

  it("rejects letters and separators", () => {
    // The schema strips separators before testing; the pattern itself is strict.
    expect(PHONE_PATTERN.test("024 123 4567")).toBe(false);
    expect(PHONE_PATTERN.test("024abc4567")).toBe(false);
  });
});
