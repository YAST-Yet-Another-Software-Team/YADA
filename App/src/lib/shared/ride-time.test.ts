import { describe, expect, it } from "vitest";

import {
  formatRideTime,
  formatRideTimeBetween,
  rideMinutes,
} from "./ride-time";

/**
 * How long a ride actually took — measured, not estimated.
 *
 * The clock starts at *accept*, not at request: the minutes a request spends
 * ringing riders belong to dispatch, and folding them in would score a courier
 * for a delay they were not present for.
 */

const at = (iso: string) => new Date(iso).toISOString();

describe("rideMinutes", () => {
  it("measures accept to completion", () => {
    expect(
      rideMinutes(at("2026-08-01T10:00:00Z"), at("2026-08-01T10:14:00Z")),
    ).toBe(14);
  });

  it("accepts Date objects as well as strings", () => {
    expect(
      rideMinutes(
        new Date("2026-08-01T10:00:00Z"),
        new Date("2026-08-01T10:30:00Z"),
      ),
    ).toBe(30);
  });

  it("is null unless both ends happened", () => {
    expect(rideMinutes(null, at("2026-08-01T10:14:00Z"))).toBeNull();
    expect(rideMinutes(at("2026-08-01T10:00:00Z"), null)).toBeNull();
    expect(rideMinutes(null, null)).toBeNull();
    expect(rideMinutes(undefined, undefined)).toBeNull();
  });

  it("is null for an unparseable timestamp", () => {
    expect(rideMinutes("not-a-date", at("2026-08-01T10:14:00Z"))).toBeNull();
  });

  /**
   * A completion timestamped before its accept means clock skew or a backfilled
   * row. "-3 min" in a table is worse than "0 min".
   */
  it("clamps a negative duration to zero", () => {
    expect(
      rideMinutes(at("2026-08-01T10:14:00Z"), at("2026-08-01T10:00:00Z")),
    ).toBe(0);
  });
});

describe("formatRideTime", () => {
  it("reads in minutes below an hour", () => {
    expect(formatRideTime(0)).toBe("0 min");
    expect(formatRideTime(14)).toBe("14 min");
    expect(formatRideTime(59)).toBe("59 min");
  });

  it("switches to hours at sixty", () => {
    // So a long trip doesn't render as an unreadable "137 min".
    expect(formatRideTime(60)).toBe("1 h 00");
    expect(formatRideTime(65)).toBe("1 h 05");
    expect(formatRideTime(137)).toBe("2 h 17");
  });

  it("rounds to the minute", () => {
    expect(formatRideTime(14.4)).toBe("14 min");
    expect(formatRideTime(14.6)).toBe("15 min");
  });

  it("is null for a trip that has no measured time", () => {
    expect(formatRideTime(null)).toBeNull();
    expect(formatRideTime(undefined)).toBeNull();
  });
});

describe("formatRideTimeBetween", () => {
  it("does both steps for a row straight out of the database", () => {
    expect(
      formatRideTimeBetween(
        at("2026-08-01T10:00:00Z"),
        at("2026-08-01T11:05:00Z"),
      ),
    ).toBe("1 h 05");
  });

  it("is null for an unfinished trip", () => {
    expect(formatRideTimeBetween(at("2026-08-01T10:00:00Z"), null)).toBeNull();
  });
});
