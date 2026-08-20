import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { apiError, apiRoute, readJsonBody } from '$lib/server/api-guard';
import { setUserImage } from '$lib/server/data/account';
import { photoDataUrl } from '$lib/server/validation/photo';

type PhotoBody = {
	/** A data URL to store, or `null` to remove the photo. */
	image?: string | null;
};

/**
 * Change the signed-in account's profile photo.
 *
 * Role-agnostic on purpose: a courier's photo is how a business recognises them
 * at the counter, and a business's is how it appears on a courier's screen, so
 * both roles reach the same column through the same rules. Sign-up is the other
 * writer — see `$lib/server/validation/photo` for the shared schema.
 */
export const PUT: RequestHandler = apiRoute({}, async ({ request }, user) => {
	const body = await readJsonBody<PhotoBody>(request);
	if (!body || !('image' in body)) {
		return apiError(400, 'invalid_request', 'No photo was sent.');
	}

	// Removal is an explicit `null`, not an omitted or empty field — that way a
	// malformed body can never be read as "delete the photo".
	if (body.image === null) {
		await setUserImage(user.id, null);
		return json({ ok: true, image: null });
	}

	const parsed = photoDataUrl.safeParse(body.image);
	if (!parsed.success) {
		return apiError(400, 'invalid_photo', parsed.error.issues[0].message);
	}

	await setUserImage(user.id, parsed.data);

	return json({ ok: true, image: parsed.data });
});
