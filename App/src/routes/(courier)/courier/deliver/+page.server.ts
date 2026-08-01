import { redirect } from '@sveltejs/kit';

import { courierScreenFor, requireCourierTrip } from '$lib/server/courier-trip';
import { getCourierTripById } from '$lib/server/data/courier';

export async function load({ parent, url }) {
  const { user } = await parent();
  const trip = await requireCourierTrip(getCourierTripById(user.id, url.searchParams.get('tripId')));

  // The delivery screen only owns a trip that has actually started: before the
  // business confirms the handover, and before "Start delivery" is pressed, the
  // parcel isn't the courier's to deliver yet.
  if (trip.status !== 'in_progress') {
    redirect(303, courierScreenFor(trip));
  }

  return { trip };
}
