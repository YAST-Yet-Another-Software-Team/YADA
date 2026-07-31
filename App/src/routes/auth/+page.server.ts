import { redirect } from '@sveltejs/kit';
import { homeFor } from '$lib/server/auth-guard';

/**
 * Bounce signed-in users straight to their workspace. Doing this on the server
 * avoids rendering the sign-in form and then replacing it once a client-side
 * session check comes back.
 */
export async function load({ locals }) {
	if (locals.user) {
		redirect(303, homeFor(locals.user.role));
	}

	return {};
}
