import { describe, expect, it } from "vitest";

import { RING_STEPS } from "$lib/shared/dispatch";

import {
  BUSY_ENTRY_DELAY_SECONDS,
  BUSY_MATCH_RADIUS_KM,
  courierMatchScore,
  offerWindow,
  RATING_PRIOR_MEAN,
  RATING_STAGGER_SECONDS,
  smoothedRating,
} from "./matching";

/**
 * Who gets offered a job, and when.
 *
 * The constants here are provisional and expected to move against field data,
 * so these assert *properties* rather than exact numbers wherever the property
 * is the actual requirement: nearer beats further, idle beats busy, higher
 * rated beats lower rated, and nobody is ever excluded outright. Those should
 * survive tuning. The handful of exact assertions are the ones where the
 * number is the rule.
 *
 * Only the pure exports are exercised — `nearbyCouriers` is a query and belongs
 * to the journey test.
 */

const NEWCOMER = { rating: 0, ratingCount: 0 };

describe("smoothedRating", () => {
  it("starts a rider with no history at the prior, not at zero", () => {
    // Without this a rider with no ratings sorts below everyone, and a first
    // 3★ is a career sentence.
    expect(smoothedRating(0, 0)).toBe(RATING_PRIOR_MEAN);
  });

  it("moves a newcomer only partway toward their first rating", () => {
    const afterOneFiveStar = smoothedRating(5, 1);
    expect(afterOneFiveStar).toBeGreaterThan(RATING_PRIOR_MEAN);
    expect(afterOneFiveStar).toBeLessThan(5);
  });

  it("converges on the true average as ratings accumulate", () => {
    expect(smoothedRating(5, 100)).toBeCloseTo(5, 1);
    expect(smoothedRating(2, 200)).toBeCloseTo(2, 1);
  });

  it("pulls less the more history there is", () => {
    const pullAtOne = Math.abs(smoothedRating(5, 1) - 5);
    const pullAtTen = Math.abs(smoothedRating(5, 10) - 5);
    expect(pullAtTen).toBeLessThan(pullAtOne);
  });

  it("keeps a single bad rating from burying a rider", () => {
    expect(smoothedRating(1, 1)).toBeGreaterThan(2.5);
  });
});

describe("courierMatchScore", () => {
  const score = (distanceKm: number, rating = 4, ratingCount = 20) =>
    courierMatchScore({ distanceKm, rating, ratingCount });

  it("stays within [0, 1] across the whole plausible input range", () => {
    for (const distanceKm of [0, 0.4, 3, 6, 50]) {
      for (const rating of [0, 1, 3, 5]) {
        for (const ratingCount of [0, 1, 500]) {
          const value = courierMatchScore({ distanceKm, rating, ratingCount });
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("ranks a nearer rider above a further one, all else equal", () => {
    expect(score(0.2)).toBeGreaterThan(score(1.5));
    expect(score(1.5)).toBeGreaterThan(score(5));
  });

  it("ranks a better-rated rider above a worse one at the same distance", () => {
    expect(score(1, 5, 50)).toBeGreaterThan(score(1, 2, 50));
  });

  it("is monotone in distance", () => {
    let previous = Infinity;
    for (let km = 0; km <= 6; km += 0.25) {
      const value = score(km);
      expect(value).toBeLessThanOrEqual(previous);
      previous = value;
    }
  });

  it("lets proximity outweigh reputation, because cold food is cold", () => {
    // A poorly rated rider next door beats a five-star rider across the zone.
    expect(score(0.1, 1, 50)).toBeGreaterThan(score(5.5, 5, 50));
  });

  it("does not bury a newcomer beneath an established rider nearby", () => {
    const newcomerAtDoor = courierMatchScore({ distanceKm: 0.2, ...NEWCOMER });
    const veteranFurther = courierMatchScore({
      distanceKm: 2,
      rating: 5,
      ratingCount: 200,
    });
    expect(newcomerAtDoor).toBeGreaterThan(veteranFurther);
  });

  it("clamps rather than going negative beyond the match radius", () => {
    expect(score(100)).toBeGreaterThanOrEqual(0);
  });
});

describe("offerWindow", () => {
  const idle = (distanceKm: number, rating = 4, ratingCount = 20) =>
    offerWindow({ distanceKm, busy: false, rating, ratingCount });
  const busy = (distanceKm: number, rating = 4, ratingCount = 20) =>
    offerWindow({ distanceKm, busy: true, rating, ratingCount });

  it("opens the first ring's riders at dispatch, give or take the stagger", () => {
    const window = idle(0.2, 5, 200)!;
    expect(window).toBeGreaterThanOrEqual(0);
    expect(window).toBeLessThan(RATING_STAGGER_SECONDS);
  });

  it("rings a nearer rider before a further one", () => {
    expect(idle(0.2)!).toBeLessThan(idle(0.6)!);
    expect(idle(0.6)!).toBeLessThan(idle(3)!);
  });

  it("places each idle rider in the ring their distance belongs to", () => {
    for (const step of RING_STEPS) {
      const window = idle(step.radiusKm, 5, 200)!;
      expect(window).toBeGreaterThanOrEqual(step.startsAtSeconds);
      expect(window).toBeLessThan(
        step.startsAtSeconds + RATING_STAGGER_SECONDS,
      );
    }
  });

  it("never rings a rider outside the match radius", () => {
    expect(idle(6.1)).toBeNull();
    expect(idle(100)).toBeNull();
  });

  /**
   * "Nearest and idle has highest priority" — an idle rider at 300 m must not
   * lose a chaining race to a busy one finishing next door.
   */
  it("rings an idle rider before an equally placed busy one", () => {
    expect(idle(0.3, 4, 20)!).toBeLessThan(busy(0.3, 4, 20)!);
  });

  it("delays a busy rider by exactly the entry delay, stagger aside", () => {
    const topRated = busy(0.1, 5, 500)!;
    expect(topRated).toBeCloseTo(BUSY_ENTRY_DELAY_SECONDS, 1);
  });

  /**
   * A busy rider is ringed from where their current trip *ends*, and only when
   * that is inside the first ring of the new pickup — "I'll be right there when
   * I finish" is only true of right there.
   */
  it("never rings a busy rider whose trip ends outside the first ring", () => {
    expect(busy(BUSY_MATCH_RADIUS_KM + 0.01)).toBeNull();
    expect(busy(BUSY_MATCH_RADIUS_KM)).not.toBeNull();
  });

  it("rings a better-rated rider no later than a worse-rated one in the same ring", () => {
    expect(idle(0.2, 5, 200)!).toBeLessThan(idle(0.2, 2, 200)!);
  });

  it("staggers by reputation without ever excluding anyone", () => {
    // The worst-rated rider in a ring is late, never absent — a late alert,
    // not a blacklist.
    const worst = idle(0.2, 1, 500);
    expect(worst).not.toBeNull();
    expect(worst!).toBeLessThanOrEqual(RATING_STAGGER_SECONDS);
  });

  it("keeps the whole stagger inside its own ring", () => {
    // A ring's slowest rider must still be ringed before the next ring opens,
    // or the stagger would silently reorder the rings themselves.
    const [first, second] = RING_STEPS;
    const worstInFirstRing = idle(first.radiusKm, 1, 500)!;
    expect(worstInFirstRing).toBeLessThanOrEqual(second.startsAtSeconds);
  });

  it("gives a newcomer a mid-field window, neither first nor last", () => {
    const newcomer = idle(0.2, NEWCOMER.rating, NEWCOMER.ratingCount)!;
    expect(newcomer).toBeGreaterThan(idle(0.2, 5, 500)!);
    expect(newcomer).toBeLessThan(idle(0.2, 1, 500)!);
  });
});
