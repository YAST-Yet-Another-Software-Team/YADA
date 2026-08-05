import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { z } from 'zod';

import type { RequestHandler } from './$types';

/**
 * Driving routes, proxied to OpenRouteService.
 *
 * This route exists for one reason: an ORS key cannot be restricted by HTTP
 * referrer the way the Google browser key could, so a key in the browser is a
 * key anyone can lift and spend. Everything else about routing stayed on the
 * client — the caches, the drift-only recompute rule — because those are about
 * not asking, and this is only about who holds the credential.
 *
 * Signed-in callers only. Routing is a workspace feature and the quota is
 * shared, so an open proxy would be someone else's free routing API.
 */

const bodySchema = z.object({
	origin: z.object({ lat: z.number(), lng: z.number() }),
	destination: z.object({ lat: z.number(), lng: z.number() })
});

/**
 * ORS has no motorcycle profile. `driving-car` is a reasonable proxy for Kumasi
 * and can be tuned with a fixed factor if field tests disagree — riders filter
 * through traffic that a car sits in, so this errs slow rather than fast.
 */
const ORS_PROFILE = 'driving-car';

export const POST: RequestHandler = async ({ request, locals, fetch }) => {
	if (!locals.user) {
		return json({ ok: false, message: 'Sign in to plan a route.' }, { status: 401 });
	}

	const apiKey = env.ORS_API_KEY;
	if (!apiKey) {
		return json(
			{ ok: false, code: 'unavailable', message: 'Routing is not configured.' },
			{ status: 503 }
		);
	}

	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return json({ ok: false, code: 'invalid_request', message: 'Invalid route request.' }, {
			status: 400
		});
	}

	const { origin, destination } = parsed.data;

	// GeoJSON rather than the default encoded polyline: ORS returns the geometry
	// as plain [lng, lat] coordinates, so there is no polyline decoder to carry.
	const response = await fetch(
		`https://api.openrouteservice.org/v2/directions/${ORS_PROFILE}/geojson`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: apiKey
			},
			body: JSON.stringify({
				coordinates: [
					[origin.lng, origin.lat],
					[destination.lng, destination.lat]
				]
			})
		}
	);

	if (response.status === 429) {
		return json({ ok: false, code: 'quota', message: 'Routing quota exceeded.' }, { status: 429 });
	}
	if (response.status === 401 || response.status === 403) {
		return json({ ok: false, code: 'denied', message: 'Routing key rejected.' }, { status: 502 });
	}
	if (!response.ok) {
		return json(
			{ ok: false, code: 'unavailable', message: 'Routing is temporarily unavailable.' },
			{ status: 502 }
		);
	}

	const data = (await response.json().catch(() => null)) as {
		features?: Array<{
			geometry?: { coordinates?: Array<[number, number]> };
			properties?: { summary?: { distance?: number; duration?: number } };
		}>;
	} | null;

	const feature = data?.features?.[0];
	if (!feature) {
		return json({ ok: false, code: 'no_results', message: 'No route found.' }, { status: 404 });
	}

	// A summary is absent when origin and destination snap to the same point —
	// a real answer (you are already there), not a failure.
	const summary = feature.properties?.summary ?? {};

	return json({
		ok: true,
		distanceMeters: Math.round(summary.distance ?? 0),
		durationSeconds: Math.round(summary.duration ?? 0),
		path: (feature.geometry?.coordinates ?? []).map(([lng, lat]) => ({ lat, lng }))
	});
};
