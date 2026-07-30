import { requireWorkspace } from '$lib/server/auth-guard';

/** Gate for the whole business workspace — dashboard, request, matching, tracking, map, history. */
export async function load({ locals }) {
	const user = requireWorkspace(locals.user, 'business');

	return { user };
}
