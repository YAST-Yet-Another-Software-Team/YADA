/**
 * The proximity rules that gate the two ends of a trip.
 *
 * A phase can only be closed from the place it happens at: the business can
 * confirm a pickup once the courier is at their counter, and the courier can
 * confirm a delivery once they are at the customer's door. Both sides of the
 * app need the same numbers — the screen decides when to offer the button, the
 * API decides whether to honour it — so they live here rather than twice. A
 * client radius looser than the server's shows a button that then fails; a
 * tighter one hides a button the server would have accepted.
 */

import type { LatLng } from '$lib/utils/types';

import { haversineKm } from './service-area';

/**
 * PROVISIONAL — both radii are estimates pending field tests around KNUST.
 *
 * 150 m is roughly a building and its forecourt, and comfortably wider than a
 * phone GPS fix is inaccurate in the open. Expect to move them once someone has
 * ridden the route: pickup may want to be tighter (a shop is a doorway) and
 * delivery looser (hostel blocks are addressed by their gate). They are
 * separate constants for exactly that reason — tune one without the other.
 */
export const PICKUP_PROXIMITY_KM = 0.15;
export const DELIVERY_PROXIMITY_KM = 0.15;

/**
 * How old the courier's last stored fix may be for the server to close a phase
 * on the strength of it. Beyond this the position is evidence of where they
 * were, not where they are.
 *
 * Longer than the map's 30s staleness fade (`LOCATION_STALE_MS`): showing a dot
 * as stale is cosmetic, whereas refusing a confirmation strands a delivery that
 * has genuinely arrived but whose last upload was a minute ago in a dead spot.
 */
export const LOCATION_FRESHNESS_MS = 120_000;

/** Metres between two points, for the "you are N m away" hints. */
export function metresBetween(a: LatLng, b: LatLng) {
  return Math.round(haversineKm(a, b) * 1000);
}

/** Whether `point` is close enough to `target` to close a phase there. */
export function isWithinRange(point: LatLng, target: LatLng, radiusKm: number) {
  return haversineKm(point, target) <= radiusKm;
}
