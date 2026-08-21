/**
 * "Riders near you", the thing a business looks at before it books.
 *
 * The promise on screen is a *time* — riders about ten minutes away — but what
 * the server can compute for a dozen couriers on every poll is a *distance*.
 * Asking the Routes API for a real drive time per rider would be one billed
 * call each, several times a minute, to move a dot a few metres; so the radius
 * is derived from an assumed speed and the honest caveat lives in the copy
 * ("about 10 min away"), not in a number pretending to be exact.
 *
 * Shared because both ends need the same answer: the endpoint filters by it and
 * the panel describes it.
 */

/** The window the business is shown. Ten minutes is close enough to "now". */
export const NEARBY_MINUTES = 10;

/**
 * PROVISIONAL — a motorbike's average through Kumasi traffic, door to door,
 * including the junctions it actually stops at. Expect this to move once real
 * trips have been ridden; it is a single constant so that when it does, the
 * radius, the per-rider estimate and the copy all move together.
 */
export const URBAN_MOTORBIKE_KMH = 22;

/** How far a rider can plausibly be and still arrive inside the window. */
export const NEARBY_RADIUS_KM = (NEARBY_MINUTES / 60) * URBAN_MOTORBIKE_KMH;

/** Straight-line distance as minutes, for the "≈4 min away" on a marker. */
export function minutesAway(distanceKm: number) {
  return Math.max(1, Math.round((distanceKm / URBAN_MOTORBIKE_KMH) * 60));
}
