import { redirect } from '@sveltejs/kit';

import { getCourierTripById } from '$lib/server/data/courier';

export async function load({ parent, url }) {
  const { user } = await parent();

  const tripId = url.searchParams.get('tripId');
  const trip = await getCourierTripById(user.id, tripId);

  if (!trip) {
    redirect(303, '/courier/home');
  }

  return { trip };
}
