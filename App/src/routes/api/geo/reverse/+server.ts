import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { apiError } from '$lib/server/api-guard';
import { geocodeReverse, geocodeFailureResponse } from '$lib/server/geocode';
import { geoErrorMessage } from '$lib/shared/geo/errors';
import { containsPoint } from '$lib/shared/geo/service-area';

type ReverseBody = {
	lat?: number;
	lng?: number;
};

export const POST: RequestHandler = async ({ request, locals }) => {
	// This proxies Google Geocoding on the server key — an open endpoint is
	// someone else's free geocoding at your billing account's expense.
	if (!locals.user) return apiError(401, 'denied', 'Sign in required.');

	try {
		const body = (await request.json()) as ReverseBody;
		const lat = Number(body.lat);
		const lng = Number(body.lng);

		if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
			return apiError(400, 'invalid_request', geoErrorMessage('invalid_request'));
		}

		const result = await geocodeReverse(lat, lng);

		return json({
			ok: true,
			result: { ...result, inZone: containsPoint({ lat, lng }) }
		});
	} catch (error) {
		return geocodeFailureResponse(error, 'reverse geocode');
	}
};
