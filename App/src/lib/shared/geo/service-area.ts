import type { LatLng } from "$lib/utils/types";

import zone from "./kumasi-knust-zone.json";

export const KUMASI_CENTER: LatLng = {
  lat: zone.properties.center.lat,
  lng: zone.properties.center.lng,
};

export const KUMASI_DEFAULT_ZOOM = zone.properties.defaultZoom;

/** Polygon ring as [lng, lat][] from GeoJSON. */
const ZONE_RING: Array<[number, number]> = zone.geometry
  .coordinates[0] as Array<[number, number]>;

export function getZonePolygonPath(): LatLng[] {
  return ZONE_RING.map(([lng, lat]) => ({ lat, lng }));
}

/** The zone's bounding box, used to bias address searches towards Kumasi. */
export function getZoneBounds(): {
  south: number;
  west: number;
  north: number;
  east: number;
} {
  let south = Infinity;
  let north = -Infinity;
  let west = Infinity;
  let east = -Infinity;

  for (const [lng, lat] of ZONE_RING) {
    south = Math.min(south, lat);
    north = Math.max(north, lat);
    west = Math.min(west, lng);
    east = Math.max(east, lng);
  }

  return { south, west, north, east };
}

/** Ray-casting point-in-polygon (GeoJSON [lng, lat] ring). */
export function containsPoint(point: LatLng): boolean {
  const x = point.lng;
  const y = point.lat;
  let inside = false;

  for (let i = 0, j = ZONE_RING.length - 1; i < ZONE_RING.length; j = i++) {
    const [xi, yi] = ZONE_RING[i];
    const [xj, yj] = ZONE_RING[j];
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

// `assertInZone` used to live here, and refusing an address outside the polygon
// was the app arguing with the person who knows where their shop is. The zone
// is now what it is good for — centring the map, biasing address search, and
// reporting whether a point is in the core area — and never a gate.

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/*
 * `distanceToPolylineKm` and its `pointToSegmentKm` helper used to live here.
 * They measured how far a rider had strayed from the line already drawn and
 * threw away the rest of what that measurement knew — where along the line they
 * were. Both now sit in `./path-progress` as `projectOntoPath`, which answers
 * the drift question and the "how much of this route is behind them" question
 * from one pass, because they are the same question.
 */
