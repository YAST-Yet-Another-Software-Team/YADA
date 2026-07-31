import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { apiError } from '$lib/server/api-guard';
import { geocodeForward, geocodeFailureResponse } from '$lib/server/geocode';
import { geoErrorMessage } from '$lib/shared/geo/errors';
import { containsPoint } from '$lib/shared/geo/service-area';

type ForwardBody = {
	address?: string;
	enforceZone?: boolean;
};

export const POST: RequestHandler = async ({ request, locals }) => {
	// This proxies Google Geocoding on the server key — an open endpoint is
	// someone else's free geocoding at your billing account's expense.
	if (!locals.user) return apiError(401, 'denied', 'Sign in required.');

	try {
		const body = (await request.json()) as ForwardBody;
		const address = body.address?.trim();
		if (!address) {
			return apiError(400, 'invalid_request', geoErrorMessage('invalid_request'));
		}

		const result = await geocodeForward(address);
		const inZone = containsPoint({ lat: result.lat, lng: result.lng });

		// A caller can opt out of the zone check to resolve an address it only
		// wants to display; the default is to refuse anything undeliverable. The
		// result still comes back, so the UI can show what it matched.
		if (!inZone && body.enforceZone !== false) {
			return json(
				{
					ok: false,
					code: 'out_of_zone',
					message: geoErrorMessage('out_of_zone'),
					result: { ...result, inZone: false }
				},
				{ status: 422 }
			);
		}

		return json({ ok: true, result: { ...result, inZone } });
	} catch (error) {
		return geocodeFailureResponse(error, 'forward geocode');
	}
};
