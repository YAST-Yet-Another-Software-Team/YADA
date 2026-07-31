/**
 * Offline fallback addresses for the KNUST / Ayeduase service area.
 *
 * `AddressAutocomplete` searches these when Google Places is unavailable — no
 * `VITE_GOOGLE_MAPS_API_KEY`, or maps disabled — so the request form stays
 * usable on a dev machine without credentials.
 */
export const LOCAL_SUGGESTIONS = [
	{
		id: 'ayeduase-gate',
		mainText: 'Ayeduase Gate',
		secondaryText: 'near KNUST, Kumasi',
		fullAddress: 'Ayeduase Gate, near KNUST, Kumasi',
		lat: 6.6785,
		lng: -1.5645
	},
	{
		id: 'knust-commercial',
		mainText: 'KNUST Commercial Area',
		secondaryText: 'Kumasi',
		fullAddress: 'KNUST Commercial Area, Kumasi',
		lat: 6.6745,
		lng: -1.5716
	},
	{
		id: 'unity-hall',
		mainText: 'Unity Hall',
		secondaryText: 'KNUST, Kumasi',
		fullAddress: 'Unity Hall, KNUST',
		lat: 6.6798,
		lng: -1.5732
	},
	{
		id: 'ayeduase-new-site',
		mainText: 'Ayeduase New Site',
		secondaryText: 'Kumasi',
		fullAddress: 'Ayeduase New Site, Kumasi',
		lat: 6.682,
		lng: -1.56
	}
] satisfies Array<{
	id: string;
	mainText: string;
	secondaryText: string;
	fullAddress: string;
	lat: number;
	lng: number;
}>;
