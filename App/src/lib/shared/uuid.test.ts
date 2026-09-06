import { describe, expect, it } from "vitest";

import { isUuid } from "./uuid";

/**
 * Trip ids are `uuid` columns, and Postgres answers a malformed uuid with a
 * type error rather than an empty result — so an unscreened id is a 500 where
 * a 400 belongs. Every API route that takes a trip id goes through here first.
 */

describe("isUuid", () => {
  it("accepts a v4 uuid", () => {
    expect(isUuid("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(true);
  });

  it("accepts upper case", () => {
    expect(isUuid("F47AC10B-58CC-4372-A567-0E02B2C3D479")).toBe(true);
  });

  it("rejects the wrong shape", () => {
    for (const value of [
      "",
      "not-a-uuid",
      "f47ac10b58cc4372a5670e02b2c3d479",
      "f47ac10b-58cc-4372-a567",
      "f47ac10b-58cc-4372-a567-0e02b2c3d479-extra",
      "00000000-0000-0000-0000-000000000000",
    ]) {
      expect(isUuid(value), value).toBe(false);
    }
  });

  it("rejects a SQL fragment", () => {
    expect(isUuid("' OR 1=1 --")).toBe(false);
  });

  it("rejects non-strings", () => {
    for (const value of [null, undefined, 42, {}, [], true]) {
      expect(isUuid(value)).toBe(false);
    }
  });
});
