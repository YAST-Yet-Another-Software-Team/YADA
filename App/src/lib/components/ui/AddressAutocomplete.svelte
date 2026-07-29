<script lang="ts">
	import { createEventDispatcher, onDestroy } from 'svelte';
	import Input from './Input.svelte';
	import { loadGoogleMapsPlaces } from '$lib/maps/google-maps-loader';
	import { MAPS_ENABLED } from '$lib/maps/maps-enabled';
	import { containsPoint, getZoneBounds, KUMASI_CENTER } from '$lib/geo/service-area';
	import { geoErrorMessage, type GeoErrorCode } from '$lib/geo/errors';
	import { createClientGeocodeCache, placeCacheKey } from '$lib/geo/geocode-cache';

	export let label = '';
	export let placeholder = 'Search KNUST / Ayeduase address...';
	export let value = '';
	export let disabled = false;
	export let iconColor = 'text-primary';
	/** When true, reject selections outside the Kumasi KNUST zone. */
	export let enforceZone = true;

	type LocalSuggestion = {
		id: string;
		mainText: string;
		secondaryText: string;
		fullAddress: string;
		lat: number;
		lng: number;
		placeId?: string;
		source: 'local';
	};

	type GoogleSuggestion = {
		id: string;
		mainText: string;
		secondaryText: string;
		fullAddress: string;
		lat: number;
		lng: number;
		placeId?: string;
		source: 'google';
		prediction: {
			toPlace: () => Promise<PlaceLike> | PlaceLike;
		};
	};

	type Suggestion = LocalSuggestion | GoogleSuggestion;

	type PlaceLike = {
		fetchFields?: (opts: { fields: string[] }) => Promise<void>;
		formattedAddress?: string;
		displayName?: string | { text?: string };
		id?: string;
		location?: { lat: () => number; lng: () => number } | { lat: number; lng: number };
	};

	const dispatch = createEventDispatcher<{
		select: {
			address: string;
			lat: number;
			lng: number;
			placeId?: string;
			inZone: boolean;
		};
		error: { code: GeoErrorCode; message: string };
	}>();

	let inputRef: HTMLInputElement | null = null;
	let googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
	let suggestions: Suggestion[] = [];
	let isOpen = false;
	let selectedIndex = -1;
	let loading = false;
	let resolving = false;
	let errorMessage = '';
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let sessionToken: unknown = null;
	let placesReady = false;
	const cache = createClientGeocodeCache();
	const LOCAL_SUGGESTIONS = [
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

	async function ensurePlaces() {
		if (placesReady || !googleMapsApiKey) return placesReady;
		await loadGoogleMapsPlaces(googleMapsApiKey);
		const Places = google.maps.places as unknown as {
			AutocompleteSessionToken?: new () => unknown;
		};
		if (Places.AutocompleteSessionToken) {
			sessionToken = new Places.AutocompleteSessionToken();
		}
		placesReady = true;
		return true;
	}

	async function fetchSuggestions(query: string) {
		const q = query.trim();
		if (!q) {
			suggestions = [];
			isOpen = false;
			return;
		}

		if (!MAPS_ENABLED || !googleMapsApiKey) {
			const normalized = q.toLowerCase();
			suggestions = LOCAL_SUGGESTIONS.filter(
				(item) =>
					item.mainText.toLowerCase().includes(normalized) ||
					item.secondaryText.toLowerCase().includes(normalized) ||
					item.fullAddress.toLowerCase().includes(normalized)
			)
				.slice(0, 5)
				.map((item) => ({
					...item,
					placeId: `local-${item.id}`,
					source: 'local' as const
				}));
			isOpen = suggestions.length > 0;
			selectedIndex = suggestions.length > 0 ? 0 : -1;
			return;
		}

		loading = true;
		errorMessage = '';

		try {
			await ensurePlaces();

			const Places = google.maps.places as unknown as {
				AutocompleteSuggestion?: {
					fetchAutocompleteSuggestions: (request: Record<string, unknown>) => Promise<{
						suggestions: Array<{
							placePrediction?: {
								placeId?: string;
								text?: { text?: string } | string;
								mainText?: { text?: string } | string;
								secondaryText?: { text?: string } | string;
								toPlace: () => Promise<PlaceLike> | PlaceLike;
							};
						}>;
					}>;
				};
			};

			if (!Places.AutocompleteSuggestion?.fetchAutocompleteSuggestions) {
				errorMessage = 'Places autocomplete is unavailable in this browser build.';
				dispatch('error', { code: 'unavailable', message: errorMessage });
				return;
			}

			const bounds = getZoneBounds();
			const { suggestions: results } =
				await Places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
					input: q,
					includedRegionCodes: ['gh'],
					language: 'en',
					sessionToken: sessionToken ?? undefined,
					locationBias: {
						west: bounds.west,
						south: bounds.south,
						east: bounds.east,
						north: bounds.north
					}
				});

			suggestions = (results ?? [])
				.map((item, index) => {
					const prediction = item.placePrediction;
					if (!prediction) return null;

					const textOf = (value: { text?: string } | string | undefined) =>
						typeof value === 'string' ? value : value?.text ?? '';

					const main = textOf(prediction.mainText) || textOf(prediction.text) || q;
					const secondary = textOf(prediction.secondaryText);
					const full = textOf(prediction.text) || [main, secondary].filter(Boolean).join(', ');

					return {
						id: prediction.placeId ?? `suggestion-${index}`,
						mainText: main,
						secondaryText: secondary,
						fullAddress: full,
							lat: KUMASI_CENTER.lat,
							lng: KUMASI_CENTER.lng,
							source: 'google' as const,
						prediction
						} satisfies GoogleSuggestion;
				})
					.filter((item): item is GoogleSuggestion => item != null);

			isOpen = suggestions.length > 0;
			selectedIndex = -1;

			if (suggestions.length === 0) {
				errorMessage = '';
			}
		} catch (error) {
			console.error('Autocomplete suggestions failed', error);
			errorMessage = geoErrorMessage('unavailable');
			dispatch('error', { code: 'unavailable', message: errorMessage });
			suggestions = [];
			isOpen = false;
		} finally {
			loading = false;
		}
	}

	function handleInput(event: Event) {
		const next = (event.target as HTMLInputElement).value;
		value = next;
		errorMessage = '';

		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			void fetchSuggestions(next);
		}, 220);
	}

	async function selectSuggestion(suggestion: Suggestion) {
		resolving = true;
		errorMessage = '';
		isOpen = false;
		value = suggestion.fullAddress;
		selectedIndex = -1;

		if (suggestion.source === 'local') {
			const inZone = containsPoint({ lat: suggestion.lat, lng: suggestion.lng });
			if (enforceZone && !inZone) {
				errorMessage = geoErrorMessage('out_of_zone');
				dispatch('error', { code: 'out_of_zone', message: errorMessage });
				return;
			}

			dispatch('select', {
				address: suggestion.fullAddress,
				lat: suggestion.lat,
				lng: suggestion.lng,
				placeId: suggestion.placeId,
				inZone
			});
			resolving = false;
			return;
		}

		try {
			let place = await Promise.resolve(suggestion.prediction.toPlace());
			if (typeof place.fetchFields === 'function') {
				await place.fetchFields({
					fields: ['formattedAddress', 'location', 'displayName', 'id']
				});
			}

			const location = place.location;
			if (!location) {
				errorMessage = geoErrorMessage('no_results');
				dispatch('error', { code: 'no_results', message: errorMessage });
				return;
			}

			const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
			const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
			const displayName =
				typeof place.displayName === 'string'
					? place.displayName
					: place.displayName?.text;
			const address = place.formattedAddress ?? displayName ?? suggestion.fullAddress;
			const placeId = place.id ?? suggestion.id;

			value = address;

			if (placeId) {
				cache.set(placeCacheKey(placeId), { address, lat, lng, placeId });
			}

			// Refresh session token after a successful selection (Places billing session)
			const Places = google.maps.places as unknown as {
				AutocompleteSessionToken?: new () => unknown;
			};
			if (Places.AutocompleteSessionToken) {
				sessionToken = new Places.AutocompleteSessionToken();
			}

			const inZone = containsPoint({ lat, lng });
			if (enforceZone && !inZone) {
				errorMessage = geoErrorMessage('out_of_zone');
				dispatch('error', { code: 'out_of_zone', message: errorMessage });
				dispatch('select', { address, lat, lng, placeId, inZone: false });
				return;
			}

			dispatch('select', { address, lat, lng, placeId, inZone: true });
		} catch (error) {
			console.error('Failed to resolve place', error);
			errorMessage = geoErrorMessage('unavailable');
			dispatch('error', { code: 'unavailable', message: errorMessage });
		} finally {
			resolving = false;
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
		setTimeout(() => {
			isOpen = false;
		}, 180);
	}

	onDestroy(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
	});
</script>

<div class="relative z-40 w-full">
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
			if (value.trim()) void fetchSuggestions(value);
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

	{#if loading || resolving}
		<p class="mt-1 text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
			{resolving ? 'Resolving location…' : 'Searching…'}
		</p>
	{/if}

	{#if isOpen && suggestions.length > 0}
		<ul
			class="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg"
			role="listbox"
		>
			{#each suggestions as suggestion, index (suggestion.id)}
				<li role="option" aria-selected={index === selectedIndex}>
					<button
						type="button"
						class="flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-xs transition-colors hover:bg-primary-subtle {index ===
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
						<div class="min-w-0 flex-1">
							<p class="truncate font-semibold text-ink">{suggestion.mainText}</p>
							{#if suggestion.secondaryText}
								<p class="truncate text-[11px] text-ink-secondary">{suggestion.secondaryText}</p>
							{/if}
						</div>
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	{#if errorMessage}
		<p class="mt-1.5 text-xs font-medium text-red-600">{errorMessage}</p>
	{/if}

	{#if MAPS_ENABLED && !googleMapsApiKey}
		<p class="mt-1.5 text-xs text-ink-tertiary">
			Set VITE_GOOGLE_MAPS_API_KEY to enable address search near KNUST / Ayeduase
			({KUMASI_CENTER.lat.toFixed(2)}, {KUMASI_CENTER.lng.toFixed(2)}).
		</p>
	{/if}
</div>
