import { redirect } from '@sveltejs/kit';

import type { CourierTrip } from '$lib/utils/types';

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
    redirect(303, '/courier/home');
  }

  return trip;
}
