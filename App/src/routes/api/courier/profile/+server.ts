import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

import { apiError } from '$lib/server/api-guard';
import { getCourierProfile, saveCourierProfile } from '$lib/server/data/courier';
import { plateNumber } from '$lib/server/validation/plate';

/**
 * The parts of a courier's profile that live on `courier_profiles` rather than
 * the account — today, the plate.
 *
 * Name, phone and password belong to Better Auth and are changed through it;
 * this endpoint exists because the plate has nowhere else to go. The rules are
 * shared with sign-up and the finish-setup screen, which write the same column.
 */
const bodySchema = z.object({ plateNumber });

export const PUT: RequestHandler = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return apiError(401, 'denied', 'Sign in required.');
  if (user.role !== 'courier') return apiError(403, 'denied', 'Courier account required.');

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'invalid_request', parsed.error.issues[0]?.message ?? 'Check that plate.');
  }

  await saveCourierProfile(user.id, { plateNumber: parsed.data.plateNumber });

  // Read it back rather than echo the input: what the screen shows should be
  // what was stored, normalisation included.
  const profile = await getCourierProfile(user.id);

  return json({ ok: true, profile });
};
