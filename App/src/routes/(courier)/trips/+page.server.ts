import {
  courierProfileOf,
  getCourierRating,
} from "$lib/server/data/courier-profile";
import { getCourierTripHistory } from "$lib/server/data/courier-trips";

export async function load({ parent }) {
  const { user } = await parent();

  const [{ historyTrips, summary }, rating] = await Promise.all([
    getCourierTripHistory(user.id),
    getCourierRating(user.id),
  ]);

  return {
    profile: courierProfileOf(user.name),
    summary,
    rating,
    historyTrips,
  };
}
