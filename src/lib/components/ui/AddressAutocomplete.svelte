<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import Input from './Input.svelte';
	import { loadGoogleMapsGeocoding, loadGoogleMapsPlaces } from '$lib/maps/google-maps-loader';

	export let label = '';
	export let placeholder = 'Search location or address...';
	export let value = '';
	export let disabled = false;
	export let iconColor = 'text-primary';

	type Suggestion = {
		id: string;
		mainText: string;
		secondaryText: string;
		fullAddress: string;
		lat?: number;
		lng?: number;
		placeId?: string;
	};

	const dispatch = createEventDispatcher<{
		select: { address: string; lat: number; lng: number; placeId?: string };
	}>();

	let inputRef: HTMLInputElement | null = null;
	let googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
	let suggestions: Suggestion[] = [];
	let isOpen = false;
	let selectedIndex = -1;
	let loading = false;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	let googleAutocomplete: google.maps.places.Autocomplete | null = null;
	let placesService: google.maps.places.PlacesService | null = null;
	let geocoder: google.maps.Geocoder | null = null;

	// Popular local fallback locations (e.g. Accra landmark reference points)
	const localLandmarks: Suggestion[] = [
		{
			id: 'accra-mall',
			mainText: 'Accra Mall',
			secondaryText: 'Tetteh Quarshie Interchange, Spintex Rd, Accra',
			fullAddress: 'Accra Mall, Spintex Rd, Accra, Ghana',
			lat: 5.6174,
			lng: -0.174
		},
		{
			id: 'kotoka-airport',
			mainText: 'Kotoka International Airport',
			secondaryText: 'Airport Bypass Rd, Accra',
			fullAddress: 'Kotoka International Airport (ACC), Accra, Ghana',
			lat: 5.6052,
			lng: -0.1668
		},
		{
			id: 'osu-oxford-street',
			mainText: 'Osu Oxford Street',
			secondaryText: 'Cantonments Rd, Osu, Accra',
			fullAddress: 'Oxford Street, Osu, Accra, Ghana',
			lat: 5.5562,
			lng: -0.1824
		},
		{
			id: 'ug-legon',
			mainText: 'University of Ghana',
			secondaryText: 'Legon Boundary Rd, Legon, Accra',
			fullAddress: 'University of Ghana, Legon Campus, Accra, Ghana',
			lat: 5.6506,
			lng: -0.187
		},
		{
			id: 'independence-square',
			mainText: 'Black Star Square',
			secondaryText: 'Independence Ave, Accra',
			fullAddress: 'Black Star Square, Independence Ave, Accra, Ghana',
			lat: 5.5484,
			lng: -0.1928
		},
		{
			id: 'circle-interchange',
			mainText: 'Kwame Nkrumah Circle',
			secondaryText: 'Ring Road West, Accra',
			fullAddress: 'Kwame Nkrumah Interchange, Circle, Accra, Ghana',
			lat: 5.5598,
			lng: -0.2072
		},
		{
			id: 'makola-market',
			mainText: 'Makola Market',
			secondaryText: 'Kojo Thompson Rd, Accra Central',
			fullAddress: 'Makola Market, Accra Central, Ghana',
			lat: 5.5441,
			lng: -0.2052
		},
		{
			id: 'labadi-beach',
			mainText: 'Labadi Beach Hotel',
			secondaryText: 'La Rd, Labadi, Accra',
			fullAddress: 'Labadi Beach Hotel, La Rd, Accra, Ghana',
			lat: 5.555,
			lng: -0.1466
		}
	];

	onMount(async () => {
		if (!googleMapsApiKey || !inputRef) {
			return;
		}

		try {
			const placesLib = await loadGoogleMapsPlaces(googleMapsApiKey);
			const geocodingLib = await loadGoogleMapsGeocoding(googleMapsApiKey);

			if (!inputRef) return;

			geocoder = new geocodingLib.Geocoder();

			// Initialize Google Maps Places Autocomplete directly on input element
			const Autocomplete = placesLib.Autocomplete as typeof google.maps.places.Autocomplete;
			googleAutocomplete = new Autocomplete(inputRef, {
				fields: ['formatted_address', 'geometry', 'name', 'place_id'],
				types: ['geocode', 'establishment']
			});

			googleAutocomplete.addListener('place_changed', () => {
				const place = googleAutocomplete?.getPlace();
				if (!place || !place.geometry?.location) return;

				const lat = place.geometry.location.lat();
				const lng = place.geometry.location.lng();
				const address = place.formatted_address ?? place.name ?? value;

				value = address;
				isOpen = false;

				dispatch('select', {
					address,
					lat,
					lng,
					placeId: place.place_id
				});
			});
		} catch (error) {
			console.warn('Google Maps Autocomplete failed to load, falling back to local/OSM geocoding.', error);
		}
	});

	onDestroy(() => {
		googleAutocomplete?.unbindAll();
		if (debounceTimer) clearTimeout(debounceTimer);
	});

	function searchFallback(query: string) {
		const q = query.trim().toLowerCase();
		if (!q) {
			suggestions = [];
			isOpen = false;
			return;
		}

		// Filter local landmarks
		const matchedLocal = localLandmarks.filter(
			(item) =>
				item.mainText.toLowerCase().includes(q) ||
				item.secondaryText.toLowerCase().includes(q) ||
				item.fullAddress.toLowerCase().includes(q)
		);

		suggestions = matchedLocal;
		isOpen = suggestions.length > 0;
		selectedIndex = -1;

		// Fetch from OpenStreetMap Nominatim for additional real-world address coverage
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			try {
				loading = true;
				const res = await fetch(
					`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
				);
				if (!res.ok) return;

				const data = await res.json();
				if (Array.isArray(data) && data.length > 0) {
					const osmSuggestions: Suggestion[] = data.map((item: any, idx: number) => {
						const parts = item.display_name.split(',');
						const main = parts[0]?.trim() || item.display_name;
						const secondary = parts.slice(1, 4).join(',').trim();
						return {
							id: `osm-${item.place_id || idx}`,
							mainText: main,
							secondaryText: secondary,
							fullAddress: item.display_name,
							lat: parseFloat(item.lat),
							lng: parseFloat(item.lon)
						};
					});

					// Merge, avoiding duplicates
					const existingIds = new Set(suggestions.map((s) => s.id));
					const uniqueOsm = osmSuggestions.filter((s) => !existingIds.has(s.id));
					suggestions = [...suggestions, ...uniqueOsm];
					isOpen = suggestions.length > 0;
				}
			} catch (err) {
				// Silent fail on network errors for fallback
			} finally {
				loading = false;
			}
		}, 300);
	}

	function handleInput(event: Event) {
		const val = (event.target as HTMLInputElement).value;
		value = val;
		// If Google Maps Places Autocomplete is not active or hasn't taken over, use fallback suggestions
		searchFallback(val);
	}

	async function selectSuggestion(suggestion: Suggestion) {
		value = suggestion.fullAddress;
		isOpen = false;

		let lat = suggestion.lat;
		let lng = suggestion.lng;

		// If lat/lng missing, try geocoding using Google Geocoder or Nominatim
		if ((lat === undefined || lng === undefined) && geocoder) {
			try {
				const response = await geocoder.geocode({ address: suggestion.fullAddress });
				if (response.results[0]?.geometry?.location) {
					lat = response.results[0].geometry.location.lat();
					lng = response.results[0].geometry.location.lng();
				}
			} catch (e) {
				console.error('Geocode failed for suggestion', e);
			}
		}

		if (lat !== undefined && lng !== undefined) {
			dispatch('select', {
				address: suggestion.fullAddress,
				lat,
				lng,
				placeId: suggestion.placeId
			});
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (!isOpen || suggestions.length === 0) return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			selectedIndex = (selectedIndex + 1) % suggestions.length;
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
		} else if (event.key === 'Enter') {
			event.preventDefault();
			if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
				void selectSuggestion(suggestions[selectedIndex]);
			}
		} else if (event.key === 'Escape') {
			isOpen = false;
		}
	}

	function handleBlur() {
		// Delayed close to allow click on suggestion item
		setTimeout(() => {
			isOpen = false;
		}, 200);
	}
</script>

<div class="relative w-full">
	<Input
		{label}
		{placeholder}
		{disabled}
		bind:value
		bind:inputRef
		autocomplete="off"
		on:input={handleInput}
		on:keydown={handleKeyDown}
		on:blur={handleBlur}
		on:focus={() => {
			if (value.trim()) searchFallback(value);
		}}
	>
		<svelte:fragment slot="icon">
			<slot name="icon">
				<svg
					viewBox="0 0 24 24"
					class="h-4 w-4 {iconColor}"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" />
					<circle cx="12" cy="10" r="2.5" />
				</svg>
			</slot>
		</svelte:fragment>
	</Input>

	{#if isOpen && suggestions.length > 0}
		<ul
			class="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg"
		>
			{#each suggestions as suggestion, index (suggestion.id)}
				<li>
					<button
						type="button"
						class="flex w-full items-start gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-primary-subtle {index ===
						selectedIndex
							? 'bg-primary-subtle'
							: ''}"
						on:mousedown|preventDefault={() => selectSuggestion(suggestion)}
					>
						<svg
							viewBox="0 0 24 24"
							class="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-tertiary"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" />
							<circle cx="12" cy="10" r="2" />
						</svg>
						<div class="flex-1 overflow-hidden">
							<p class="truncate font-semibold text-ink">{suggestion.mainText}</p>
							<p class="truncate text-[11px] text-ink-secondary">{suggestion.secondaryText}</p>
						</div>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
