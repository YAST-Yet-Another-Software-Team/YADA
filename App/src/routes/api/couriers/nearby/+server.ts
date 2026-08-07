import { json } from '@sveltejs/kit';
import { createHash } from 'node:crypto';
import type { RequestHandler } from './$types';

import { env } from '$env/dynamic/private';
import { apiError } from '$lib/server/api-guard';
import { getBusinessAddress } from '$lib/server/data/business';
import { nearbyCouriers } from '$lib/server/data/matching';
import { NEARBY_MINUTES, NEARBY_RADIUS_KM } from '$lib/shared/geo/nearby';

/**
 * Turn a courier id into something a business can key a marker on and nothing
 * else.
 *
 * Salted with the server secret, so the value is stable while the process lives
 * — a marker keeps its identity across polls and the map can move it rather
 * than blink it — but says nothing about the account and cannot be lined up
 * against a courier id seen anywhere else in the API.
 */
const REF_SALT = env.BETTER_AUTH_SECRET ?? 'yada-nearby';

function refFor(courierId: string) {
	return createHash('sha256').update(`${REF_SALT}:${courierId}`).digest('hex').slice(0, 12);
}

/**
 * The online riders around a business, for its own map.
 *
 * This is the "cars on the map" every ride-hailing app opens with, and it is
 * doing the same job: before you ask for a rider, you can see whether there are
 * any. It is supply, not surveillance — no names, no ratings, no way to follow
 * one particular person, and positions rounded to about eleven metres.
 *
 * The centre is the business's stored dispatch address, read here rather than
 * accepted from the query string: a business asking where riders are is asking
 * about *its own* shop, and taking a point off the wire would turn this into a
 * "who is near this arbitrary spot" endpoint for anyone with an account.
 */
export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user) return apiError(401, 'denied', 'Sign in required.');
	if (user.role !== 'business') return apiError(403, 'denied', 'Business account required.');

	const business = await getBusinessAddress(user.id);
	if (!business) {
		// Not an error: a business that hasn't set its address yet simply has no
		// centre to look around, and the map is asking, not the person.
		return json({ ok: true, couriers: [], minutes: NEARBY_MINUTES, radiusKm: NEARBY_RADIUS_KM });
	}

	const couriers = await nearbyCouriers(
		{ lat: business.lat, lng: business.lng },
		{ radiusKm: NEARBY_RADIUS_KM, ref: refFor }
	);

	return json({
		ok: true,
		couriers,
		minutes: NEARBY_MINUTES,
		radiusKm: NEARBY_RADIUS_KM
	});
};
