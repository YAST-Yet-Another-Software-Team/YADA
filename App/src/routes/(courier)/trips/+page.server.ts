import {
  courierProfileOf,
  getCourierRating,
  getCourierTripHistory
} from '$lib/server/data/courier';

export async function load({ parent }) {
  const { user } = await parent();

  const [{ historyTrips, summary }, rating] = await Promise.all([
    getCourierTripHistory(user.id),
    getCourierRating(user.id)
  ]);

  return {
    profile: courierProfileOf(user.name),
    summary,
    rating,
    historyTrips
  };
}
