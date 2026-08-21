import { redirect } from "@sveltejs/kit";

import { courierScreenFor, requireCourierTrip } from "$lib/server/courier-trip";
import { getCourierTripById } from "$lib/server/data/courier-trips";
import { isPickupPhase } from "$lib/shared/trip-status";

export async function load({ parent, url }) {
  const { user } = await parent();
  const trip = await requireCourierTrip(
    getCourierTripById(user.id, url.searchParams.get("tripId")),
  );

  // This screen owns the pickup phase and the moment just after it, where the
  // courier still has to press "Start delivery". Anything further along —
  // reached by a stale link or the back button — belongs elsewhere.
  if (!isPickupPhase(trip.status) && trip.status !== "picked_up") {
    redirect(303, courierScreenFor(trip));
  }

  return { trip };
}
