import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { apiError } from '$lib/server/api-guard';
import { getBusinessAddress, saveBusinessAddress } from '$lib/server/data/business';
import { containsPoint } from '$lib/shared/geo/service-area';
import { geoErrorMessage } from '$lib/shared/geo/errors';

type AddressBody = {
	address?: string;
	lat?: number;
	lng?: number;
};

/**
 * Set the business's dispatch address.
 *
 * Sign-up is where this is normally captured, so the endpoint exists for the two
 * cases sign-up can't cover: an account that predates the address being part of
 * registration, and a business that has since moved. It never creates the trip's
 * origin per-order — `POST /api/trips` still reads the stored row.
 */
export const PUT: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) return apiError(401, 'denied', 'Sign in required.');
	if (user.role !== 'business') return apiError(403, 'denied', 'Business account required.');

	const body = (await request.json().catch(() => null)) as AddressBody | null;
	const address = body?.address?.trim();
	const lat = Number(body?.lat);
	const lng = Number(body?.lng);

	if (!address || !Number.isFinite(lat) || !Number.isFinite(lng)) {
		return apiError(400, 'invalid_request', geoErrorMessage('invalid_request'));
	}

	if (!containsPoint({ lat, lng })) {
		return apiError(422, 'out_of_zone', geoErrorMessage('out_of_zone'));
	}

	// The existing row keeps its trading name; only sign-up, which asked for one,
	// gets to set it. Falling back to the account name covers the profile that
	// doesn't exist yet.
	const existing = await getBusinessAddress(user.id);

	await saveBusinessAddress(user.id, {
		businessName: existing?.businessName ?? user.name,
		address,
		lat,
		lng
	});

	return json({ ok: true, profile: { address, lat, lng } });
};
