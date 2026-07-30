/**
 * The session is already resolved by hooks.server.ts on every request. Handing
 * `locals.user` to the client here is what lets the auth store hydrate without
 * a follow-up /api/auth/get-session round-trip.
 */
export async function load({ locals }) {
	return {
		user: locals.user
	};
}
