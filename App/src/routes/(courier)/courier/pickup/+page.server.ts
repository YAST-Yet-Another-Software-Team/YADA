import { requireCourierTrip } from '$lib/server/courier-trip';
import { getCourierTripById } from '$lib/server/data/courier';

export async function load({ parent, url }) {
  const { user } = await parent();
  const trip = await requireCourierTrip(getCourierTripById(user.id, url.searchParams.get('tripId')));

  return { trip };
}
