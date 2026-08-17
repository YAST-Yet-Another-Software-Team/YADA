import { redirect } from '@sveltejs/kit';

import { accountCompletion } from '$lib/server/data/account';

/**
 * Gate for the whole courier workspace. Child loaders read the user via
 * `parent()`. Signed-out visitors go to the sign-in page; signed-in business
 * accounts are sent to their own home rather than shown an error.
 */
export async function load({ locals }) {
	const user = locals.user;

	if (!user) {
		redirect(303, '/auth');
	}

	if (user.role !== 'courier') {
		redirect(303, '/dashboard');
	}

	// The strict half of the check, and the one that matters: without a
	// `courier_profiles` row the availability toggle and every location fix
	// update zero rows while still answering `ok`, so the rider is told they are
	// online and dispatch cannot see them. /welcome is where that row is made.
	const { complete } = await accountCompletion(user);
	if (!complete) {
		redirect(303, '/welcome');
	}

	return { user };
}
