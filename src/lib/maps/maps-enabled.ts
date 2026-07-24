/**
 * Maps are enabled when a Maps key is present, unless explicitly disabled.
 * This keeps the app ready to use the Google Maps flow again as soon as the key is configured.
 */
export const MAPS_ENABLED = (
	import.meta.env.VITE_MAPS_ENABLED ??
	(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'true' : 'false')
).toLowerCase() === 'true';
