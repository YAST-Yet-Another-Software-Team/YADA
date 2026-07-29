import zone from './kumasi-knust-zone.json';
import { GeoError, geoErrorMessage } from './errors';

export type LatLng = { lat: number; lng: number };

export const KUMASI_CENTER: LatLng = {
  lat: zone.properties.center.lat,
  lng: zone.properties.center.lng
};

export const KUMASI_DEFAULT_ZOOM = zone.properties.defaultZoom;

/** Polygon ring as [lng, lat][] from GeoJSON. */
const ZONE_RING: Array<[number, number]> = zone.geometry.coordinates[0] as Array<[number, number]>;

export function getZonePolygonPath(): LatLng[] {
  return ZONE_RING.map(([lng, lat]) => ({ lat, lng }));
}

export function getZoneBounds(): { south: number; west: number; north: number; east: number } {
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
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

export function assertInZone(point: LatLng): void {
  if (!containsPoint(point)) {
    throw new GeoError('out_of_zone', geoErrorMessage('out_of_zone'));
  }
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Approximate distance from a point to the nearest polyline vertex/segment (km). */
export function distanceToPolylineKm(point: LatLng, path: LatLng[]): number {
  if (path.length === 0) return Infinity;
  let min = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    min = Math.min(min, pointToSegmentKm(point, path[i], path[i + 1]));
  }
  return min;
}

function pointToSegmentKm(p: LatLng, a: LatLng, b: LatLng): number {
  // Local equirectangular projection for short segments
  const x = p.lng;
  const y = p.lat;
  const x1 = a.lng;
  const y1 = a.lat;
  const x2 = b.lng;
  const y2 = b.lat;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return haversineKm(p, a);
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return haversineKm(p, { lat: y1 + t * dy, lng: x1 + t * dx });
}
