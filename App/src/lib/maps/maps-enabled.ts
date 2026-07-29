/**
 * Flip to `true` when Google Maps key + HTTP referrers are ready again.
 * When false, MapBackdrop and Places autocomplete stay on placeholders.
 */
export const MAPS_ENABLED =
	(import.meta.env.VITE_MAPS_ENABLED ?? 'false').toLowerCase() === 'true';
