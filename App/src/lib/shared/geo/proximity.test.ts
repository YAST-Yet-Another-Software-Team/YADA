import { describe, expect, it } from "vitest";

import {
  DELIVERY_PROXIMITY_KM,
  isWithinRange,
  LOCATION_FRESHNESS_MS,
  metresBetween,
  PICKUP_PROXIMITY_KM,
} from "./proximity";

/**
 * The two gates that decide whether a delivery can be closed at all.
 *
 * These radii are provisional and expected to move against field data — both
 * sit at or below the error on a typical phone GPS fix, which is precisely the
 * risk. What must not move by accident is the relationship the whole handover
 * rests on: the client offers the button on the same rule the server honours
 * it by. A client radius looser than the server's shows a button that then
 * fails; a tighter one hides one the server would have accepted.
 */

/** Roughly a metre of latitude, for building points a known distance apart. */
const METRE_IN_DEGREES = 1 / 111_320;

const AT = { lat: 6.6745, lng: -1.5716 };
const northOf = (metres: number) => ({
  lat: AT.lat + metres * METRE_IN_DEGREES,
  lng: AT.lng,
});

describe("the pickup gate", () => {
  it("accepts a rider standing on the spot", () => {
    expect(isWithinRange(AT, AT, PICKUP_PROXIMITY_KM)).toBe(true);
  });

  it("accepts a rider just inside 15 m", () => {
    expect(isWithinRange(northOf(14), AT, PICKUP_PROXIMITY_KM)).toBe(true);
  });

  it("refuses a rider just outside it", () => {
    expect(isWithinRange(northOf(16), AT, PICKUP_PROXIMITY_KM)).toBe(false);
  });

  it("refuses a rider at the end of the street", () => {
    expect(isWithinRange(northOf(120), AT, PICKUP_PROXIMITY_KM)).toBe(false);
  });
});

describe("the delivery gate", () => {
  it("accepts a rider just inside 31 m", () => {
    expect(isWithinRange(northOf(30), AT, DELIVERY_PROXIMITY_KM)).toBe(true);
  });

  it("refuses a rider just outside it", () => {
    expect(isWithinRange(northOf(32), AT, DELIVERY_PROXIMITY_KM)).toBe(false);
  });
});

describe("the two gates together", () => {
  /**
   * A shop is a doorway; hostel blocks are addressed by their gate. Delivery is
   * deliberately the looser of the two, and they are separate constants so one
   * can be tuned without dragging the other.
   */
  it("keeps delivery looser than pickup", () => {
    expect(DELIVERY_PROXIMITY_KM).toBeGreaterThan(PICKUP_PROXIMITY_KM);
  });

  it("admits a position at the door that the counter rule would refuse", () => {
    const doorstep = northOf(25);
    expect(isWithinRange(doorstep, AT, DELIVERY_PROXIMITY_KM)).toBe(true);
    expect(isWithinRange(doorstep, AT, PICKUP_PROXIMITY_KM)).toBe(false);
  });

  it("is symmetric — which end the measurement starts from cannot matter", () => {
    const there = northOf(20);
    expect(isWithinRange(there, AT, DELIVERY_PROXIMITY_KM)).toBe(
      isWithinRange(AT, there, DELIVERY_PROXIMITY_KM),
    );
  });
});

describe("metresBetween", () => {
  it("reports whole metres for the 'you are N m away' hint", () => {
    expect(metresBetween(AT, northOf(50))).toBeGreaterThanOrEqual(49);
    expect(metresBetween(AT, northOf(50))).toBeLessThanOrEqual(51);
  });

  it("is zero for the same point", () => {
    expect(metresBetween(AT, AT)).toBe(0);
  });
});

describe("LOCATION_FRESHNESS_MS", () => {
  /**
   * Longer than the map's 30 s staleness fade on purpose: showing a dot as
   * stale is cosmetic, whereas refusing a confirmation strands a delivery that
   * has genuinely arrived but whose last upload was a minute ago in a dead spot.
   */
  it("is generous enough to survive a dead spot at the door", () => {
    expect(LOCATION_FRESHNESS_MS).toBeGreaterThanOrEqual(60_000);
  });

  it("is short enough that the fix still means 'now'", () => {
    expect(LOCATION_FRESHNESS_MS).toBeLessThanOrEqual(5 * 60_000);
  });
});
