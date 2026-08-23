import { env } from '$env/dynamic/private';

/**
 * The session is already resolved by hooks.server.ts on every request. Handing
 * `locals.user` to the client here is what lets the auth store hydrate without
 * a follow-up /api/auth/get-session round-trip.
 *
 * The map config rides along. On the OSM stack there is no browser credential to
 * pass — tiles and geocoding are keyless — so this is a style URL and one
 * boolean. The ORS key stays server-side and is never in this payload; the
 * client only learns whether `/api/geo/route` has one, which is why the flag is
 * `Boolean(...)` rather than the value.
 *
 * `realtimeEnabled` rides along for the same reason: whether a Socket.IO server
 * exists is a property of where the app is deployed, not of the build. It is
 * off only when explicitly set to `false`, so local dev needs no configuration.
 */

/**
 * OpenFreeMap serves OSM tiles with no key, no quota and no attribution beyond
 * OSM's own. Override to swap in Protomaps or a self-hosted style.
 */
const DEFAULT_TILE_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export async function load({ locals }) {
	return {
		user: locals.user,
		mapStyleUrl: env.MAP_STYLE_URL || DEFAULT_TILE_STYLE,
		routingEnabled: Boolean(env.ORS_API_KEY),
		realtimeEnabled: env.REALTIME_ENABLED !== 'false'
	};
}
