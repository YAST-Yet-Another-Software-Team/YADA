import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { apiError } from '$lib/server/api-guard';
import { getBusinessAddress, saveBusinessAddress } from '$lib/server/data/business';
import { geoErrorMessage } from '$lib/shared/geo/errors';

type ProfileBody = {
	businessName?: string;
	address?: string;
	lat?: number;
	lng?: number;
};

/** The shortest thing that reads as a trading name rather than a typo. */
const MIN_BUSINESS_NAME = 2;

/**
 * Set the business's dispatch address, its trading name, or both.
 *
 * Sign-up is where the address is normally captured, so the endpoint exists for
 * the two cases sign-up can't cover: an account that predates the address being
 * part of registration, and a business that has since moved. It never sets the
 * trip's origin per-order — `POST /api/trips` still reads the stored row.
 *
 * The trading name is accepted alongside because it lives on this row and the
 * account name lives on `users` — the profile page changes both, and letting
 * them drift means a business whose maps label disagrees with its own header.
 */
export const PUT: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) return apiError(401, 'denied', 'Sign in required.');
	if (user.role !== 'business') return apiError(403, 'denied', 'Business account required.');

	const body = (await request.json().catch(() => null)) as ProfileBody | null;

	const businessName = typeof body?.businessName === 'string' ? body.businessName.trim() : undefined;
	// Presence, not validity: a caller that sent a broken address should hear
	// about it rather than have the whole field quietly ignored.
	const changingAddress =
		body?.address !== undefined || body?.lat !== undefined || body?.lng !== undefined;

	if (!changingAddress && businessName === undefined) {
		return apiError(400, 'invalid_request', geoErrorMessage('invalid_request'));
	}

	if (businessName !== undefined && businessName.length < MIN_BUSINESS_NAME) {
		return apiError(400, 'invalid_request', 'Enter your business name.');
	}

	const existing = await getBusinessAddress(user.id);

	if (!changingAddress) {
		// A name with no row to put it on: the account name is the only record of
		// it until an address exists, and the caller already updated that.
		if (!existing) return json({ ok: true, profile: null });

		await saveBusinessAddress(user.id, {
			businessName: businessName as string,
			address: existing.address,
			lat: existing.lat,
			lng: existing.lng
		});

		return json({ ok: true, profile: { ...existing, businessName } });
	}

	const address = body?.address?.trim();
	const lat = Number(body?.lat);
	const lng = Number(body?.lng);

	if (!address || !Number.isFinite(lat) || !Number.isFinite(lng)) {
		return apiError(400, 'invalid_request', geoErrorMessage('invalid_request'));
	}

	// No zone check: a business says where it is, and refusing an address for
	// being the wrong side of a polygon is the app arguing with the person who
	// knows. The zone still centres the map and biases search — it just doesn't
	// decide any more.

	// An unnamed row keeps the name it had; falling back to the account name
	// covers the profile that doesn't exist yet, which is what sign-up leaves.
	const name = businessName ?? existing?.businessName ?? user.name;

	await saveBusinessAddress(user.id, { businessName: name, address, lat, lng });

	return json({ ok: true, profile: { businessName: name, address, lat, lng } });
};
