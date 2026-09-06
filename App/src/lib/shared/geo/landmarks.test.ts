import { describe, expect, it } from "vitest";

import { containsPoint, haversineKm } from "./service-area";

import {
  describePoint,
  KNUST_LANDMARKS,
  LANDMARK_HIT_KM,
  LANDMARK_NEAR_KM,
  landmarkAddress,
  nearestLandmark,
  searchLandmarks,
} from "./landmarks";

/**
 * The landmark table, which is what turns a dropped pin into a name somebody
 * can act on.
 *
 * Half of this file is table invariants rather than function behaviour, and
 * deliberately so: the failure mode here is data, not logic. A landmark in the
 * wrong place misnames every pin near it, and nothing else in the app would
 * notice. Two entries (`knust-commercial`, `ayeduase-new-site`) matched no OSM
 * feature and keep hand-entered coordinates, so the invariants below are the
 * cheapest thing standing between those and a silently wrong address.
 */

describe("the table itself", () => {
  it("has entries", () => {
    expect(KNUST_LANDMARKS.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = KNUST_LANDMARKS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every entry a name and an area", () => {
    for (const landmark of KNUST_LANDMARKS) {
      expect(landmark.name.trim()).not.toBe("");
      expect(landmark.area.trim()).not.toBe("");
    }
  });

  it("holds plausible Kumasi coordinates", () => {
    // Catches a transposed lat/lng or a dropped minus sign, which would put a
    // campus hall in the Gulf of Guinea.
    for (const landmark of KNUST_LANDMARKS) {
      expect(landmark.lat, landmark.id).toBeGreaterThan(6.5);
      expect(landmark.lat, landmark.id).toBeLessThan(6.8);
      expect(landmark.lng, landmark.id).toBeGreaterThan(-1.8);
      expect(landmark.lng, landmark.id).toBeLessThan(-1.4);
    }
  });

  /**
   * The service area is what the app considers its own patch. A landmark
   * outside it is either mis-keyed or shouldn't be in the table.
   */
  it("keeps every landmark inside the service area", () => {
    for (const landmark of KNUST_LANDMARKS) {
      expect(
        containsPoint({ lat: landmark.lat, lng: landmark.lng }),
        `${landmark.id} (${landmark.name}) falls outside the service-area polygon`,
      ).toBe(true);
    }
  });

  /**
   * Inside `LANDMARK_HIT_KM` two landmarks compete for the same pin and the
   * winner is whichever happens to be a few metres nearer — "Africa Hall" and
   * "Africa Hall Market" becomes a coin toss rather than a choice. The source
   * states the rule; this enforces it.
   */
  it("keeps entries far enough apart not to compete for a pin", () => {
    for (let i = 0; i < KNUST_LANDMARKS.length; i++) {
      for (let j = i + 1; j < KNUST_LANDMARKS.length; j++) {
        const a = KNUST_LANDMARKS[i];
        const b = KNUST_LANDMARKS[j];
        expect(
          haversineKm(a, b),
          `${a.id} and ${b.id} are within the hit radius of each other`,
        ).toBeGreaterThan(LANDMARK_HIT_KM);
      }
    }
  });
});

describe("nearestLandmark", () => {
  it("returns a landmark standing on one of them", () => {
    const target = KNUST_LANDMARKS[0];
    const nearest = nearestLandmark({ lat: target.lat, lng: target.lng });
    expect(nearest?.landmark.id).toBe(target.id);
    expect(nearest?.distanceKm).toBeCloseTo(0, 5);
  });

  it("still answers from far away, with an honest distance", () => {
    const nearest = nearestLandmark({ lat: 5.6, lng: -0.2 }); // Accra
    expect(nearest).not.toBeNull();
    expect(nearest!.distanceKm).toBeGreaterThan(100);
  });
});

describe("describePoint", () => {
  const first = KNUST_LANDMARKS[0];

  it("names a pin sitting on a landmark", () => {
    expect(describePoint({ lat: first.lat, lng: first.lng })).toBe(
      landmarkAddress(first),
    );
  });

  it("qualifies a pin that is merely close", () => {
    // Walk out from a landmark until the *nearest* one — which may by then be a
    // different landmark, since the table is dense around campus — sits between
    // the hit and near radii. Assuming the starting landmark stays nearest is
    // what makes this kind of test wrong.
    let probe: { lat: number; lng: number } | null = null;
    for (let metres = 10; metres <= LANDMARK_NEAR_KM * 1000; metres += 10) {
      const candidate = { lat: first.lat + metres / 111_320, lng: first.lng };
      const distance = nearestLandmark(candidate)?.distanceKm ?? 0;
      if (distance > LANDMARK_HIT_KM && distance < LANDMARK_NEAR_KM) {
        probe = candidate;
        break;
      }
    }

    expect(probe, "no point found in the near band").not.toBeNull();
    expect(describePoint(probe!)).toMatch(/^Near /);
  });

  /**
   * "Near Unity Hall" from two kilometres away is not a useful thing to tell a
   * rider — better to say nothing and let the geocoder answer.
   */
  it("says nothing rather than something useless", () => {
    expect(describePoint({ lat: 5.6, lng: -0.2 })).toBeNull();
  });
});

describe("searchLandmarks", () => {
  it("finds a landmark by a fragment of its name, case-insensitively", () => {
    const target = KNUST_LANDMARKS[0];
    const fragment = target.name.slice(0, 4).toLowerCase();
    const found = searchLandmarks(fragment);
    expect(found.map((l) => l.id)).toContain(target.id);
  });

  it("returns nothing for an empty query", () => {
    expect(searchLandmarks("")).toEqual([]);
    expect(searchLandmarks("   ")).toEqual([]);
  });

  it("respects the limit", () => {
    expect(searchLandmarks("a", 3).length).toBeLessThanOrEqual(3);
  });
});
