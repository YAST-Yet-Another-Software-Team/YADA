import { loadGoogleMapsRoutes } from './google-maps-loader';
import type { LatLng } from '$lib/geo/service-area';
import { GeoError, geoErrorMessage } from '$lib/geo/errors';

export type DrivingRouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  distanceText: string;
  durationText: string;
  path: LatLng[];
  distanceKm: number;
  durationMinutes: number;
};

type RouteCacheEntry = {
  key: string;
  result: DrivingRouteResult;
};

let lastRoute: RouteCacheEntry | null = null;

function routeKey(origin: LatLng, destination: LatLng) {
  const r = (n: number) => Math.round(n * 1e5) / 1e5;
  return `${r(origin.lat)},${r(origin.lng)}->${r(destination.lat)},${r(destination.lng)}`;
}

function formatDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem ? `${hours} hr ${rem} min` : `${hours} hr`;
}

function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

/**
 * Compute a driving route via the Maps JS Routes library (client)
 * or fall back to the Routes REST API when given a server key + fetch.
 */
export async function computeDrivingRoute(
  apiKey: string,
  origin: LatLng,
  destination: LatLng,
  options?: { force?: boolean }
): Promise<DrivingRouteResult> {
  const key = routeKey(origin, destination);
  if (!options?.force && lastRoute?.key === key) {
    return lastRoute.result;
  }

  try {
    const routesLibrary = await loadGoogleMapsRoutes(apiKey);
    const RouteApi = (
      routesLibrary as unknown as {
        Route?: {
          computeRoutes: (request: unknown) => Promise<{
            routes: Array<{
              legs?: Array<{
                distanceMeters?: number;
                duration?: { seconds?: string } | string;
                distance?: { text?: string; value?: number };
                durationText?: string;
              }>;
              path?: Array<google.maps.LatLng | LatLng>;
              polyline?: { encodedPolyline?: string };
            }>;
          }>;
        };
      }
    ).Route;

    if (!RouteApi?.computeRoutes) {
      return computeDrivingRouteRest(apiKey, origin, destination, key);
    }

    const response = await RouteApi.computeRoutes({
      origin,
      destination,
      travelMode: 'DRIVING',
      fields: ['legs', 'path', 'polyline']
    });

    const route = response.routes[0];
    if (!route) {
      throw new GeoError('no_results', geoErrorMessage('no_results'));
    }

    const leg = route.legs?.[0];
    let distanceMeters = leg?.distanceMeters ?? leg?.distance?.value ?? 0;
    let durationSeconds = 0;

    const rawDuration = leg?.duration;
    if (typeof rawDuration === 'string') {
      durationSeconds = Number.parseInt(rawDuration.replace('s', ''), 10) || 0;
    } else if (rawDuration && typeof rawDuration === 'object' && 'seconds' in rawDuration) {
      durationSeconds = Number(rawDuration.seconds) || 0;
    }

    let path: LatLng[] = [];
    if (route.path?.length) {
      path = route.path.map((p) =>
        typeof (p as google.maps.LatLng).lat === 'function'
          ? { lat: (p as google.maps.LatLng).lat(), lng: (p as google.maps.LatLng).lng() }
          : (p as LatLng)
      );
    } else if (route.polyline?.encodedPolyline) {
      path = decodePolyline(route.polyline.encodedPolyline);
    }

    if (!distanceMeters && path.length > 1) {
      // leave 0; UI can show —
    }

    const result: DrivingRouteResult = {
      distanceMeters,
      durationSeconds,
      distanceText: leg?.distance?.text ?? formatDistance(distanceMeters),
      durationText: formatDuration(durationSeconds || 60),
      path,
      distanceKm: Math.round((distanceMeters / 1000) * 100) / 100,
      durationMinutes: Math.max(1, Math.round((durationSeconds || 60) / 60))
    };

    lastRoute = { key, result };
    return result;
  } catch (error) {
    if (error instanceof GeoError) throw error;
    return computeDrivingRouteRest(apiKey, origin, destination, key);
  }
}

async function computeDrivingRouteRest(
  apiKey: string,
  origin: LatLng,
  destination: LatLng,
  key: string
): Promise<DrivingRouteResult> {
  const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: {
        location: { latLng: { latitude: destination.lat, longitude: destination.lng } }
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE'
    })
  });

  if (response.status === 429) {
    throw new GeoError('quota', geoErrorMessage('quota'));
  }
  if (response.status === 403) {
    throw new GeoError('denied', geoErrorMessage('denied'));
  }
  if (!response.ok) {
    throw new GeoError('unavailable', geoErrorMessage('unavailable'));
  }

  const data = (await response.json()) as {
    routes?: Array<{
      distanceMeters?: number;
      duration?: string;
      polyline?: { encodedPolyline?: string };
    }>;
  };

  const route = data.routes?.[0];
  if (!route) {
    throw new GeoError('no_results', geoErrorMessage('no_results'));
  }

  const distanceMeters = route.distanceMeters ?? 0;
  const durationSeconds = Number.parseInt((route.duration ?? '0s').replace('s', ''), 10) || 0;
  const path = route.polyline?.encodedPolyline
    ? decodePolyline(route.polyline.encodedPolyline)
    : [origin, destination];

  const result: DrivingRouteResult = {
    distanceMeters,
    durationSeconds,
    distanceText: formatDistance(distanceMeters),
    durationText: formatDuration(durationSeconds || 60),
    path,
    distanceKm: Math.round((distanceMeters / 1000) * 100) / 100,
    durationMinutes: Math.max(1, Math.round((durationSeconds || 60) / 60))
  };

  lastRoute = { key, result };
  return result;
}

export const OFF_ROUTE_THRESHOLD_KM = 0.15;
