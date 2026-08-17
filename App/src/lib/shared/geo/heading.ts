/**
 * Which way a rider is pointing.
 *
 * Two sources, in order of trust. A phone in a rider's pocket reports
 * `coords.heading` from its own sensors while it is moving, and that is the
 * real answer. Everything else — a desktop watching a trip, a fix relayed over
 * the socket, a device that reports `null` because it is standing still — has
 * only the trail of positions to go on, so the bearing is worked out from the
 * last two of them.
 *
 * Shared because both ends need the same rule: the courier's own screens read
 * it off the device, and the business's tracking map derives it from the fixes
 * arriving over the socket.
 */

import type { LatLng } from '$lib/utils/types';

import { haversineKm } from './service-area';

/**
 * How far a rider must move before a new bearing is believed.
 *
 * A stationary GPS fix wanders by a few metres on its own, and a bearing taken
 * across that wander is noise — pointing the marker at it would spin it on the
 * spot while a rider waits at a junction. Eight metres is comfortably past the
 * jitter and well inside a single second of riding.
 */
export const HEADING_MIN_MOVE_KM = 0.008;

const DEGREES = 180 / Math.PI;
const RADIANS = Math.PI / 180;

/** Compass bearing from one point to the next, 0–360° clockwise from north. */
export function bearingBetween(from: LatLng, to: LatLng) {
  const fromLat = from.lat * RADIANS;
  const toLat = to.lat * RADIANS;
  const deltaLng = (to.lng - from.lng) * RADIANS;

  const y = Math.sin(deltaLng) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);

  return (Math.atan2(y, x) * DEGREES + 360) % 360;
}

/**
 * Follow a rider's heading across a run of fixes.
 *
 * Stateful because the answer depends on where they were, and because the last
 * known heading is the right thing to keep showing when the next fix says
 * nothing new — a rider stopped at a light is still facing the way they were
 * riding, and blanking the marker would read as the signal being lost.
 *
 * Returns `null` only until the first heading is known: an unrotated marker is
 * honest about not knowing yet, which is not the same as pointing north.
 */
export function createHeadingTracker() {
  /** The fix the current bearing was measured *from*. */
  let anchor: LatLng | null = null;
  let heading: number | null = null;

  return {
    get current() {
      return heading;
    },

    /**
     * Feed the next fix, with the device's own heading when it offered one.
     * Returns the heading to draw.
     */
    next(point: LatLng, deviceHeading?: number | null) {
      if (deviceHeading != null && Number.isFinite(deviceHeading)) {
        heading = ((deviceHeading % 360) + 360) % 360;
        anchor = point;
        return heading;
      }

      if (anchor && haversineKm(anchor, point) >= HEADING_MIN_MOVE_KM) {
        heading = bearingBetween(anchor, point);
        anchor = point;
        return heading;
      }

      // Deliberately not moved on a small step: the anchor has to stay put for
      // a slow rider's metres to add up to a distance worth taking a bearing
      // across. Advancing it here would mean never clearing the threshold.
      anchor ??= point;

      return heading;
    },

    reset() {
      anchor = null;
      heading = null;
    }
  };
}
