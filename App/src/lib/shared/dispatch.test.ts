import { describe, expect, it } from "vitest";

import {
  DISPATCH_TIMEOUT_SECONDS,
  dispatchRemaining,
  isDispatchExpired,
  isMatchingNow,
  MAX_MATCH_RADIUS_KM,
  RING_STEPS,
  ringForElapsed,
  ringReach,
} from "./dispatch";

/**
 * The dispatch clock. Everything here is a pure function of elapsed seconds,
 * which is the whole point of the design — so the boundaries are the test.
 *
 * These numbers are the product: 400 m for 15 seconds, 800 m until 35, the
 * whole zone until 60. If a change here is deliberate the assertions move with
 * it; what must never happen silently is a ring opening a second early or a
 * timed-out request still looking live.
 */

describe("ringForElapsed", () => {
  it("opens on the first ring at dispatch", () => {
    expect(ringForElapsed(0)).toEqual({ index: 0, radiusKm: 0.4 });
  });

  it("holds the first ring right up to the second's start", () => {
    expect(ringForElapsed(14.9)).toEqual({ index: 0, radiusKm: 0.4 });
  });

  it("widens exactly at 15 seconds, not after", () => {
    expect(ringForElapsed(15)).toEqual({ index: 1, radiusKm: 0.8 });
  });

  it("holds the second ring up to the third's start", () => {
    expect(ringForElapsed(34.9)).toEqual({ index: 1, radiusKm: 0.8 });
  });

  it("reaches the whole match radius at 35 seconds", () => {
    expect(ringForElapsed(35)).toEqual({
      index: 2,
      radiusKm: MAX_MATCH_RADIUS_KM,
    });
  });

  it("is still ringing at the timeout itself", () => {
    expect(ringForElapsed(DISPATCH_TIMEOUT_SECONDS)).toEqual({
      index: 2,
      radiusKm: MAX_MATCH_RADIUS_KM,
    });
  });

  it("rings nobody once the window has closed", () => {
    expect(ringForElapsed(DISPATCH_TIMEOUT_SECONDS + 0.1)).toBeNull();
    expect(ringForElapsed(120)).toBeNull();
  });

  it("treats a negative elapsed as the opening ring", () => {
    // Clock skew between the browser and the server can produce this; a
    // request must never read as ringing nobody because of it.
    expect(ringForElapsed(-1)).toEqual({ index: 0, radiusKm: 0.4 });
  });

  it("never widens backwards", () => {
    let previous = 0;
    for (let t = 0; t <= DISPATCH_TIMEOUT_SECONDS; t += 0.5) {
      const ring = ringForElapsed(t);
      expect(ring).not.toBeNull();
      expect(ring!.radiusKm).toBeGreaterThanOrEqual(previous);
      previous = ring!.radiusKm;
    }
  });

  it("agrees with RING_STEPS rather than hard-coded numbers", () => {
    for (const [index, step] of RING_STEPS.entries()) {
      expect(ringForElapsed(step.startsAtSeconds)).toEqual({
        index,
        radiusKm: step.radiusKm,
      });
    }
  });
});

describe("isDispatchExpired", () => {
  it("is not expired at the timeout boundary", () => {
    expect(isDispatchExpired(DISPATCH_TIMEOUT_SECONDS)).toBe(false);
  });

  it("is expired just past it", () => {
    expect(isDispatchExpired(DISPATCH_TIMEOUT_SECONDS + 0.001)).toBe(true);
  });
});

describe("isMatchingNow", () => {
  const secondsAgo = (n: number) =>
    new Date(Date.now() - n * 1000).toISOString();

  it("is matching inside the window", () => {
    expect(isMatchingNow("searching", secondsAgo(10))).toBe(true);
  });

  /**
   * The regression this function exists to prevent: a request stays
   * `searching` after its window closes because it is still unassigned, so
   * anything keyed on the stage alone keeps pulsing over a search that has
   * already failed — and a live-looking screen is what stops someone pressing
   * "Ring riders again".
   */
  it("stops matching once the window closes, though the stage is unchanged", () => {
    expect(
      isMatchingNow("searching", secondsAgo(DISPATCH_TIMEOUT_SECONDS + 5)),
    ).toBe(false);
  });

  it("counts a request with no dispatch clock as matching", () => {
    // Rows predating the clock, and the gap between a request being written
    // and its first round starting.
    expect(isMatchingNow("searching", null)).toBe(true);
  });

  it("is never matching outside the searching stage", () => {
    for (const stage of [
      "assigned",
      "arrived",
      "en_route",
      "delivered",
      "cancelled",
    ] as const) {
      expect(isMatchingNow(stage, secondsAgo(1))).toBe(false);
      expect(isMatchingNow(stage, null)).toBe(false);
    }
  });
});

describe("dispatchRemaining", () => {
  it("is full at dispatch and empty at the timeout", () => {
    expect(dispatchRemaining(0)).toBe(1);
    expect(dispatchRemaining(DISPATCH_TIMEOUT_SECONDS)).toBe(0);
  });

  it("is half-drained halfway through", () => {
    expect(dispatchRemaining(DISPATCH_TIMEOUT_SECONDS / 2)).toBeCloseTo(0.5, 6);
  });

  it("clamps rather than going negative", () => {
    // The tracking screen ticks locally between polls and would otherwise draw
    // the bar past empty.
    expect(dispatchRemaining(DISPATCH_TIMEOUT_SECONDS * 3)).toBe(0);
    expect(dispatchRemaining(-10)).toBe(1);
  });

  it("only ever drains", () => {
    let previous = 1;
    for (let t = 0; t <= DISPATCH_TIMEOUT_SECONDS; t += 1) {
      const left = dispatchRemaining(t);
      expect(left).toBeLessThanOrEqual(previous);
      previous = left;
    }
  });
});

describe("ringReach", () => {
  it("spans 0 to 1 across the rings", () => {
    expect(ringReach(0)).toBe(0);
    expect(ringReach(RING_STEPS.length - 1)).toBe(1);
  });

  it("clamps an index outside the ring list", () => {
    expect(ringReach(-5)).toBe(0);
    expect(ringReach(99)).toBe(1);
  });
});
