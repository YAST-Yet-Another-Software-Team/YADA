import { error, redirect } from '@sveltejs/kit';

import { getCourierTripById } from '$lib/server/courier-data';

export async function load({ locals, url }) {
  if (!locals.user?.id) {
    throw error(401, 'You need to be signed in.');
  }

  const tripId = url.searchParams.get('tripId');
  const trip = await getCourierTripById(locals.user.id, tripId);

  if (!trip) {
    throw redirect(303, '/courier/home');
  }

  return { trip };
}