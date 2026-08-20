import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { apiError, apiRoute, readJsonBody } from '$lib/server/api-guard';
import { deleteOwnAccount, openTripCount } from '$lib/server/data/account';

type DeleteBody = {
	/** The account's own email, typed back. See `CONFIRM_FALLBACK`. */
	confirm?: string;
};

/**
 * What a person types to prove they mean it when there is no email on the
 * account to ask for. Only reachable in practice by a row whose address was
 * never captured; the confirmation still has to be deliberate.
 */
const CONFIRM_FALLBACK = 'DELETE';

/**
 * Close the signed-in account (soft delete — see `deleteOwnAccount`).
 *
 * Self-service only, and that is the whole security model: there is no id in
 * the request, so the only account this can ever reach is the caller's own.
 * Adding a parameter here would turn it into an administrative endpoint, which
 * YADA has no concept of and no role to guard with.
 *
 * Role-agnostic, because closing an account is not a workspace action — both a
 * business and a courier reach it from their own settings screen through the
 * same shared card.
 *
 * The email is typed back rather than a password re-entered: Google accounts
 * have no password, and a gate that only works for half the users is a gate
 * that has to be worked around. Typing the address proves the person knows
 * *which* account they are closing, which is the mistake actually worth
 * catching — a shared phone with the wrong session open.
 */
export const DELETE: RequestHandler = apiRoute({}, async ({ request }, user) => {
	const body = await readJsonBody<DeleteBody>(request);
	const confirm = typeof body?.confirm === 'string' ? body.confirm.trim() : '';
	const expected = user.email ?? CONFIRM_FALLBACK;

	if (confirm.toLowerCase() !== expected.toLowerCase()) {
		return apiError(
			400,
			'confirm_mismatch',
			user.email
				? 'Type your email address exactly to confirm.'
				: `Type ${CONFIRM_FALLBACK} to confirm.`
		);
	}

	// A delivery with one of its two parties missing is worse than an account
	// that outlives the person's patience by ten minutes. Checked server-side
	// because the screen offering the button may be minutes stale.
	const openTrips = await openTripCount(user.id);
	if (openTrips > 0) {
		return apiError(
			409,
			'open_trips',
			openTrips === 1
				? 'You have a delivery still in progress. Finish or cancel it first.'
				: `You have ${openTrips} deliveries still in progress. Finish or cancel them first.`
		);
	}

	await deleteOwnAccount(user.id);

	// The session rows are gone, so the cookie the browser still holds now
	// resolves to nobody. The client sends the person to /auth rather than this
	// answering with a redirect: it is a fetch, and a redirect would be followed
	// by the fetch rather than the page.
	return json({ ok: true });
});
