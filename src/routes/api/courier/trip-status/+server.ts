import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { deliveryRequests, tripEvents } from '$lib/server/schema';

const NEXT_STATUS: Record<string, 'courier_arriving' | 'in_progress' | 'completed'> = {
  arrive: 'courier_arriving',
  pickup: 'in_progress',
  complete: 'completed'
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ ok: false, message: 'Sign in required.' }, { status: 401 });
  }
  if (locals.user.role !== 'courier' && locals.user.role !== 'admin') {
    return json({ ok: false, message: 'Courier account required.' }, { status: 403 });
  }
  if (!db) {
    return json({ ok: false, message: 'Database unavailable.' }, { status: 503 });
  }

  const body = await request.json();
  const tripId = typeof body?.tripId === 'string' ? body.tripId : null;
  const action = typeof body?.action === 'string' ? body.action : null;

  if (!tripId || !action || !NEXT_STATUS[action]) {
    return json({ ok: false, message: 'Trip id and action required.' }, { status: 400 });
  }

  const [trip] = await db
    .select({ id: deliveryRequests.id, status: deliveryRequests.status, assignedCourierId: deliveryRequests.assignedCourierId })
    .from(deliveryRequests)
    .where(and(eq(deliveryRequests.id, tripId), eq(deliveryRequests.assignedCourierId, locals.user.id)))
    .limit(1);

  if (!trip) {
    return json({ ok: false, message: 'Trip not found.' }, { status: 404 });
  }

  const nextStatus = NEXT_STATUS[action];

  if (action === 'pickup' && !['accepted', 'courier_arriving', 'arrived'].includes(trip.status)) {
    return json({ ok: false, message: 'Trip is not ready for pickup.' }, { status: 409 });
  }
  if (action === 'complete' && trip.status === 'completed') {
    return json({ ok: false, message: 'Trip already completed.' }, { status: 409 });
  }

  await db
    .update(deliveryRequests)
    .set(nextStatus === 'completed' ? { status: nextStatus, completedAt: new Date() } : { status: nextStatus })
    .where(eq(deliveryRequests.id, tripId));

  await db.insert(tripEvents).values({
    tripId,
    actorId: locals.user.id,
    eventType: 'status_change',
    payload: JSON.stringify({ from: trip.status, to: nextStatus, action })
  });

  return json({ ok: true, tripId, status: nextStatus });
};