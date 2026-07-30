import { requireCourierTrip } from '$lib/server/courier-trip';
import { formatCourierMoney, getCourierLatestCompletedTrip } from '$lib/server/data/courier';

export async function load({ parent, url }) {
  const { user } = await parent();
  const trip = await requireCourierTrip(
    getCourierLatestCompletedTrip(user.id, url.searchParams.get('tripId'))
  );

  return {
    trip,
    earningsLabel: formatCourierMoney(trip.estimatedPayout)
  };
}
