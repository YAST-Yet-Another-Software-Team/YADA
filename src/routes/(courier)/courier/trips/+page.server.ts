import { error } from '@sveltejs/kit';

import { getCourierTripHistory } from '$lib/server/courier-data';

export async function load({ locals }) {
  if (!locals.user?.id) {
    throw error(401, 'You need to be signed in.');
  }

  const data = await getCourierTripHistory(locals.user.id);
  const courierName = locals.user.name ?? 'Courier';

  const initials =
    courierName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? '')
      .join('')
      .toUpperCase() || 'C';

  return {
    profile: {
      name: courierName,
      initials
    },
    summary: {
      completedTrips: data.summary.completedTrips,
      tripsToday: data.summary.tripsToday,
      totalDistanceKm: data.summary.totalDistanceKm,
      activeTrips: data.summary.activeTrips
    },
    historyTrips: data.historyTrips
  };
}
