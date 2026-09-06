import { describe, expect, it } from "vitest";

import {
  containsPoint,
  getZoneBounds,
  getZonePolygonPath,
  haversineKm,
  KUMASI_CENTER,
} from "./service-area";

/**
 * Distance and the service-area polygon.
 *
 * `haversineKm` sits under every proximity decision in the app — both handover
 * gates, the dispatch rings, the nearby-rider filter — so it is worth pinning
 * against known distances rather than trusting it by inspection.
 */

describe("haversineKm", () => {
  it("is zero for the same point", () => {
    expect(haversineKm(KUMASI_CENTER, KUMASI_CENTER)).toBe(0);
  });

  it("matches a known long-haul distance", () => {
    // Kumasi to Accra is ~200 km great-circle.
    const accra = { lat: 5.6037, lng: -0.187 };
    expect(haversineKm(KUMASI_CENTER, accra)).toBeGreaterThan(180);
    expect(haversineKm(KUMASI_CENTER, accra)).toBeLessThan(220);
  });

  it("measures a degree of latitude at about 111 km", () => {
    const north = { lat: KUMASI_CENTER.lat + 1, lng: KUMASI_CENTER.lng };
    expect(haversineKm(KUMASI_CENTER, north)).toBeCloseTo(111.19, 0);
  });

  it("resolves the metre scale the handover gates depend on", () => {
    // 100 m north. If this drifted, both proximity gates would drift with it.
    const near = {
      lat: KUMASI_CENTER.lat + 100 / 111_320,
      lng: KUMASI_CENTER.lng,
    };
    expect(haversineKm(KUMASI_CENTER, near) * 1000).toBeGreaterThan(95);
    expect(haversineKm(KUMASI_CENTER, near) * 1000).toBeLessThan(105);
  });

  it("is symmetric", () => {
    const a = { lat: 6.67, lng: -1.57 };
    const b = { lat: 6.69, lng: -1.55 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });

  it("crosses the equator and the meridian without sign errors", () => {
    expect(
      haversineKm({ lat: -1, lng: -1 }, { lat: 1, lng: 1 }),
    ).toBeGreaterThan(0);
  });
});

describe("the service-area polygon", () => {
  it("contains its own centre", () => {
    expect(containsPoint(KUMASI_CENTER)).toBe(true);
  });

  it("excludes somewhere plainly outside", () => {
    expect(containsPoint({ lat: 5.6037, lng: -0.187 })).toBe(false); // Accra
    expect(containsPoint({ lat: 0, lng: 0 })).toBe(false);
  });

  it("is a closed ring", () => {
    const path = getZonePolygonPath();
    expect(path.length).toBeGreaterThan(3);
    expect(path[0]).toEqual(path[path.length - 1]);
  });

  it("bounds the polygon it came from", () => {
    const bounds = getZoneBounds();
    expect(bounds.south).toBeLessThan(bounds.north);
    expect(bounds.west).toBeLessThan(bounds.east);

    for (const point of getZonePolygonPath()) {
      expect(point.lat).toBeGreaterThanOrEqual(bounds.south);
      expect(point.lat).toBeLessThanOrEqual(bounds.north);
      expect(point.lng).toBeGreaterThanOrEqual(bounds.west);
      expect(point.lng).toBeLessThanOrEqual(bounds.east);
    }
  });

  it("puts the centre inside its own bounds", () => {
    const bounds = getZoneBounds();
    expect(KUMASI_CENTER.lat).toBeGreaterThan(bounds.south);
    expect(KUMASI_CENTER.lat).toBeLessThan(bounds.north);
    expect(KUMASI_CENTER.lng).toBeGreaterThan(bounds.west);
    expect(KUMASI_CENTER.lng).toBeLessThan(bounds.east);
  });
});
