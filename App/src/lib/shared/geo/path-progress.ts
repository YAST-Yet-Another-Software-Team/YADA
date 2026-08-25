/**
 * Where a rider is on a route they were given, and what is left of it.
 *
 * A Routes call is billed per request, so a path this app has already paid for
 * has to stay usable for as long as the rider is still on it. The only thing
 * that may buy a new one is leaving it; everything else — how much of it is
 * behind them, how much is ahead, how long the rest should take — is geometry,
 * and geometry is free.
 *
 * Deliberately free of the Maps SDK and of Svelte: the whole file is functions
 * over plain coordinates, so it can be exercised from a console against a
 * hand-built path without a map on screen.
 */

import type { LatLng } from "$lib/utils/types";

import { haversineKm } from "./service-area";

export type PathProjection = {
  /** The segment the point fell on: `path[index]` → `path[index + 1]`. */
  index: number;
  /** How far along that segment the foot of the perpendicular sits, 0–1. */
  t: number;
  /** The foot itself — the point *on the road* closest to the one given. */
  point: LatLng;
  /** Perpendicular distance from the given point to `point`, in km. */
  offsetKm: number;
};

/**
 * A point `t` of the way from `a` to `b`.
 *
 * Linear in lat/lng. Over a city that is indistinguishable from the great
 * circle, and the two callers — a route vertex and a marker sliding between two
 * fixes — are both working at street scale.
 */
export function interpolate(a: LatLng, b: LatLng, t: number): LatLng {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
}

/**
 * The nearest point on a polyline, and where along it that is.
 *
 * This is the maths that used to be `pointToSegmentKm` in `service-area`, which
 * computed exactly this and then threw away everything but the distance. A
 * local equirectangular projection is used to find the foot of the
 * perpendicular — fine over a segment a few hundred metres long — and the
 * distance to it is measured properly with `haversineKm`.
 *
 * `null` for a path too short to have a segment: a single point is a place, not
 * a route, and there is nothing to be along.
 */
export function projectOntoPath(
  point: LatLng,
  path: LatLng[],
): PathProjection | null {
  if (path.length < 2) return null;

  let best: PathProjection | null = null;

  for (let index = 0; index < path.length - 1; index++) {
    const a = path[index];
    const b = path[index + 1];

    const dx = b.lng - a.lng;
    const dy = b.lat - a.lat;

    // A zero-length segment — duplicate vertices do turn up in encoded
    // polylines — has no direction to project onto, so its start is the answer.
    const t =
      dx === 0 && dy === 0
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              ((point.lng - a.lng) * dx + (point.lat - a.lat) * dy) /
                (dx * dx + dy * dy),
            ),
          );

    const foot = interpolate(a, b, t);
    const offsetKm = haversineKm(point, foot);

    if (!best || offsetKm < best.offsetKm) {
      best = { index, t, point: foot, offsetKm };
    }
  }

  return best;
}

/** How long a path is, in km, following it vertex to vertex. */
export function pathLengthKm(path: LatLng[]): number {
  let total = 0;

  for (let index = 0; index < path.length - 1; index++) {
    total += haversineKm(path[index], path[index + 1]);
  }

  return total;
}

/**
 * The route ahead of a rider, with the road behind them removed.
 *
 * Returns the same path re-headed at the rider's projected position and shorn
 * of the vertices they have passed — so the line visibly shortens as they ride
 * and no Routes call is made — or `null` when this path no longer describes
 * where they are, which is the caller's cue to buy a new one.
 *
 * The head is the *projected* point, never the raw fix. A stationary fix
 * wanders ten metres on its own, and drawing the line from it would swing a
 * little spur off the carriageway on every update, which reads as the route
 * leaving the road. The projection only ever slides along it.
 *
 * `null` and "trimmed" are deliberately the same decision. The off-route guard
 * used to be a separate `distanceToPolylineKm` call at each of the three call
 * sites, which left room for a fix to be judged on-route by one measurement and
 * trimmed by another; one projection now answers both questions, so trimming
 * cannot run on a fix that is about to be recomputed.
 *
 * The result is a ratchet. Because the consumed vertices are gone from the array
 * the caller holds, the next call searches a shorter path and progress is
 * monotonic without this module remembering anything. That is why it returns a
 * path rather than an index: on a route that doubles back near its own start, a
 * rider projecting onto the far end would otherwise lose the journey between.
 */
export function advanceAlongPath(
  path: LatLng[],
  point: LatLng,
  maxOffsetKm: number,
): LatLng[] | null {
  const projection = projectOntoPath(point, path);

  // Too short to be a route, or the rider is no longer on this one. Both are
  // the caller's cue to compute a fresh leg from where they actually are.
  if (!projection || projection.offsetKm > maxOffsetKm) return null;

  // A rider sitting exactly on a vertex projects onto the *end* of the segment
  // before it — ties go to the earlier segment — so the vertex ahead is the one
  // they are already standing on, and keeping it would leave a duplicated point
  // at the head of the line. Drop it.
  const consumed = projection.index + (projection.t >= 1 ? 2 : 1);
  const ahead = path.slice(consumed);

  // A rider who has not set off yet projects onto the very start, and the whole
  // path is still ahead of them. Past the end there is no road left to draw, and
  // what is returned is a zero-length line at the destination rather than a lone
  // point: a one-point path is not a route, and handing one back would read as
  // "off this route" on the next fix and buy a fresh one to stand still on. The
  // proximity rules in `./proximity` own that moment, not the polyline.
  return ahead.length > 0
    ? [projection.point, ...ahead]
    : [projection.point, path[path.length - 1]];
}
