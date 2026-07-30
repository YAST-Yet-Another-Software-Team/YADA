import { courierProfileOf, getCourierTripHistory } from '$lib/server/data/courier';

export async function load({ parent }) {
  const { user } = await parent();

  const { historyTrips, summary } = await getCourierTripHistory(user.id);

  return {
    profile: courierProfileOf(user.name),
    summary,
    historyTrips
  };
}
