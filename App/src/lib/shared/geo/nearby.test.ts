import { describe, expect, it } from "vitest";

import { MAX_MATCH_RADIUS_KM } from "../dispatch";

import {
  minutesAway,
  NEARBY_MINUTES,
  NEARBY_RADIUS_KM,
  URBAN_MOTORBIKE_KMH,
} from "./nearby";

/**
 * "Riders near you" — the reassurance a business sees before it books.
 *
 * The promise on screen is a time; what the server computes is a distance. The
 * two are tied together by one assumed speed, and the point of keeping it as a
 * single constant is that the radius, the per-rider estimate and the copy all
 * move together when it is tuned. These assert that they still do.
 */

describe("the radius is derived, not hard-coded", () => {
  it("follows from the window and the assumed speed", () => {
    expect(NEARBY_RADIUS_KM).toBeCloseTo(
      (NEARBY_MINUTES / 60) * URBAN_MOTORBIKE_KMH,
      10,
    );
  });

  it("stays inside the dispatcher's own match radius", () => {
    // Showing riders the dispatcher would never ring would be a promise the
    // system cannot keep.
    expect(NEARBY_RADIUS_KM).toBeLessThanOrEqual(MAX_MATCH_RADIUS_KM);
  });
});

describe("minutesAway", () => {
  it("agrees with the radius at its own edge", () => {
    expect(minutesAway(NEARBY_RADIUS_KM)).toBe(NEARBY_MINUTES);
  });

  it("never says zero minutes", () => {
    // "0 min away" reads as "already here", which no rider is.
    expect(minutesAway(0)).toBe(1);
    expect(minutesAway(0.01)).toBe(1);
  });

  it("grows with distance", () => {
    expect(minutesAway(1)).toBeLessThanOrEqual(minutesAway(3));
    expect(minutesAway(3)).toBeLessThan(minutesAway(6));
  });

  it("returns whole minutes", () => {
    for (const km of [0.3, 1.7, 2.2, 5.9]) {
      expect(Number.isInteger(minutesAway(km))).toBe(true);
    }
  });
});
