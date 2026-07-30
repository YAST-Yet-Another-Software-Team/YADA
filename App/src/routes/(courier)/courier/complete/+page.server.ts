import { redirect } from '@sveltejs/kit';

import { formatCourierMoney, getCourierLatestCompletedTrip } from '$lib/server/data/courier';

export async function load({ parent, url }) {
  const { user } = await parent();

  const tripId = url.searchParams.get('tripId');
  const trip = await getCourierLatestCompletedTrip(user.id, tripId);

  if (!trip) {
    redirect(303, '/courier/home');
  }

  return {
    trip,
    earningsLabel: formatCourierMoney(trip.estimatedPayout)
  };
}
