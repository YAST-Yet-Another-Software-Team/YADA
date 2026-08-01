import { redirect } from '@sveltejs/kit';

import { courierTripHref } from '$lib/shared/trip-status';
import type { CourierTrip } from '$lib/utils/types';

/**
 * The screen that owns a trip at its current status, including the two ends
 * `courierTripHref` doesn't cover: a finished trip belongs to its receipt, and
 * a cancelled one to nothing at all.
 *
 * The pickup and deliver loaders both send a trip here when it isn't theirs,
 * which is what stops a stale link or a back button from offering an action the
 * API would refuse.
 */
export function courierScreenFor(trip: CourierTrip) {
  if (trip.status === 'completed') {
    return `/complete?tripId=${encodeURIComponent(trip.id)}`;
  }

  if (trip.status === 'cancelled') return '/home';

  return courierTripHref(trip);
}

/**
 * Unwrap a courier trip lookup for a page that can't render without one.
 *
 * The pickup, deliver and complete screens are all about a single trip, so a
 * missing or foreign id sends the courier back to their home screen instead of
 * rendering an empty page. The lookup itself is already scoped to the courier,
 * which is why "not found" and "not yours" collapse into the same redirect.
 */
export async function requireCourierTrip(lookup: Promise<CourierTrip | null>) {
  const trip = await lookup;

  if (!trip) {
    redirect(303, '/home');
  }

  return trip;
}
