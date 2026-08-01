import { redirect } from '@sveltejs/kit';

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

	return { user };
}
