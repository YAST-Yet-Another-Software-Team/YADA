import type { DrivingRouteResult, LatLng } from '$lib/utils/types';
import { GeoError, geoErrorMessage } from '$lib/shared/geo/errors';
import type { GeoErrorCode } from '$lib/utils/types';
import { clientRouteCache, routeCacheKey } from './route-cache';

/**
 * Driving routes, from OpenRouteService by way of `/api/geo/route`.
 *
 * The provider changed; the economics did not. ORS's free tier is ~2,000
 * requests/day, so the three cache layers below and the caller-side rule that
 * only recomputes when the rider drifts off the drawn line matter as much as
 * they did against Google's billing. The normalised `DrivingRouteResult` is
 * unchanged, which is what keeps the four call sites identical.
 *
 * No API key parameter: the key is the server's, and the browser never sees it.
 */

type RouteCacheEntry = {
  key: string;
  result: DrivingRouteResult;
};

let lastRoute: RouteCacheEntry | null = null;
const inFlightRoutes = new Map<string, Promise<DrivingRouteResult>>();

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

/**
 * Compute a driving route between two points.
 *
 * Answers from the persisted cache, the last-route memo, or an in-flight
 * request before it reaches the network — in that order — unless `force` is set,
 * which the live-tracking callers use when the rider has left the drawn line.
 */
export async function computeDrivingRoute(
  origin: LatLng,
  destination: LatLng,
  options?: { force?: boolean }
): Promise<DrivingRouteResult> {
  // One key for all three cache layers — a second rounding helper here was how
  // the memo and the persisted cache could disagree about the same coordinates.
  const cacheKey = routeCacheKey(origin, destination);
  const requestKey = `${options?.force ? 'force:' : ''}${cacheKey}`;

  if (!options?.force) {
    const cached = clientRouteCache.get(cacheKey);
    if (cached) {
      lastRoute = { key: cacheKey, result: cached };
      return cached;
    }
  }

  if (!options?.force && lastRoute?.key === cacheKey) {
    return lastRoute.result;
  }

  const pending = inFlightRoutes.get(requestKey);
  if (pending) {
    return pending;
  }

  const routePromise = (async () => {
    try {
      const response = await fetch('/api/geo/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination })
      });

      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        code?: GeoErrorCode;
        distanceMeters?: number;
        durationSeconds?: number;
        path?: LatLng[];
      } | null;

      if (!response.ok || !payload?.ok) {
        const code = payload?.code ?? 'unavailable';
        throw new GeoError(code, geoErrorMessage(code));
      }

      const distanceMeters = payload.distanceMeters ?? 0;
      const durationSeconds = payload.durationSeconds ?? 0;

      // ORS returns the full geometry; a two-point fallback keeps the map able
      // to draw something rather than nothing if it ever comes back empty.
      const path = payload.path?.length ? payload.path : [origin, destination];

      const result: DrivingRouteResult = {
        distanceMeters,
        durationSeconds,
        distanceText: formatDistance(distanceMeters),
        durationText: formatDuration(durationSeconds || 60),
        path,
        distanceKm: Math.round((distanceMeters / 1000) * 100) / 100,
        durationMinutes: Math.max(1, Math.round((durationSeconds || 60) / 60))
      };

      lastRoute = { key: cacheKey, result };
      clientRouteCache.set(cacheKey, result);
      return result;
    } finally {
      inFlightRoutes.delete(requestKey);
    }
  })();

  inFlightRoutes.set(requestKey, routePromise);
  return routePromise;
}

export const OFF_ROUTE_THRESHOLD_KM = 0.15;
