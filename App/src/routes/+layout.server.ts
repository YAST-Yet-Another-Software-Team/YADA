import { env } from '$env/dynamic/private';

/**
 * The session is already resolved by hooks.server.ts on every request. Handing
 * `locals.user` to the client here is what lets the auth store hydrate without
 * a follow-up /api/auth/get-session round-trip.
 *
 * The Maps key rides along because the Maps JavaScript API authenticates the
 * browser itself and cannot be proxied. Reading it here rather than inlining
 * `import.meta.env` at build time means rotating the key needs a restart, not
 * a rebuild. It is withheld from signed-out visitors: every map sits behind a
 * workspace gate, so nobody anonymous needs it, and this keeps it out of the
 * public landing page's HTML.
 */
export async function load({ locals }) {
	return {
		user: locals.user,
		googleMapsApiKey: locals.user ? (env.GOOGLE_MAPS_API_KEY ?? '') : '',
		googleMapsMapId: env.GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID'
	};
}
