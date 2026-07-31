import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';

import { apiError, requireApiUser } from '$lib/server/api-guard';
import { db } from '$lib/server/db';
import { deliveryRequests } from '$lib/server/db/schema';
import { recordStatusChange } from '$lib/server/data/trip-events';
import type { TripStatus } from '$lib/utils/types';
import { isUuid } from '$lib/shared/uuid';

/** The transitions a courier can drive from their trip screens. */
const NEXT_STATUS = {
  arrive: 'courier_arriving',
  pickup: 'in_progress',
  complete: 'completed'
} as const satisfies Record<string, TripStatus>;

type TripAction = keyof typeof NEXT_STATUS;

/** A pickup only makes sense once the courier is assigned and on the way. */
const PICKUP_FROM: readonly TripStatus[] = ['accepted', 'courier_arriving', 'arrived'];

function isTripAction(value: unknown): value is TripAction {
  return typeof value === 'string' && value in NEXT_STATUS;
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const guard = requireApiUser(locals, 'courier');
  if (guard.error) return guard.error;
  const { user } = guard;

  const body = await request.json();
  const tripId = body?.tripId;
  const action = body?.action;

  if (!isUuid(tripId) || !isTripAction(action)) {
    return apiError(400, 'invalid_request', 'Trip id and action required.');
  }

  // Scoped to the courier's own trip, so the assignment check and the lookup
  // are the same query.
  const [trip] = await db
    .select({ status: deliveryRequests.status })
    .from(deliveryRequests)
    .where(and(eq(deliveryRequests.id, tripId), eq(deliveryRequests.assignedCourierId, user.id)))
    .limit(1);

  if (!trip) {
    return apiError(404, 'no_results', 'Trip not found.');
  }

  if (action === 'pickup' && !PICKUP_FROM.includes(trip.status)) {
    return apiError(409, 'conflict', 'Trip is not ready for pickup.');
  }
  if (action === 'complete' && trip.status === 'completed') {
    return apiError(409, 'conflict', 'Trip already completed.');
  }

  const nextStatus = NEXT_STATUS[action];

  await db
    .update(deliveryRequests)
    .set(nextStatus === 'completed' ? { status: nextStatus, completedAt: new Date() } : { status: nextStatus })
    .where(eq(deliveryRequests.id, tripId));

  await recordStatusChange(tripId, user.id, { from: trip.status, to: nextStatus, action });

  return json({ ok: true, tripId, status: nextStatus });
};
