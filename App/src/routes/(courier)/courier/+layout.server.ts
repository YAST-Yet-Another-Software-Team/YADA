import { requireWorkspace } from '$lib/server/auth-guard';

/** Gate for the whole courier workspace. Child loaders read the user via `parent()`. */
export async function load({ locals }) {
	const user = requireWorkspace(locals.user, 'courier');

	return { user };
}
