<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { loadGoogleMapsPlaces } from '$lib/maps/google-maps-loader';
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

	let hostEl: HTMLDivElement | null = null;
	let googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
	let loading = false;
	let resolving = false;
	let errorMessage = '';
	let placeElement: HTMLElement | null = null;
	const cache = createClientGeocodeCache();

	onMount(async () => {
		if (!googleMapsApiKey || !hostEl) {
			errorMessage = 'Maps key missing — address search unavailable.';
			return;
		}

		loading = true;
		try {
			await loadGoogleMapsPlaces(googleMapsApiKey);

			const PlaceAutocompleteElement = (
				google.maps.places as unknown as {
					PlaceAutocompleteElement?: new (options?: Record<string, unknown>) => HTMLElement;
				}
			).PlaceAutocompleteElement;

			if (!PlaceAutocompleteElement) {
				errorMessage = 'Places API (New) is unavailable in this browser build.';
				dispatch('error', { code: 'unavailable', message: errorMessage });
				return;
			}

			const bounds = getZoneBounds();
			const el = new PlaceAutocompleteElement({
				requestedLanguage: 'en',
				requestedRegion: 'gh',
				locationBias: {
					west: bounds.west,
					south: bounds.south,
					east: bounds.east,
					north: bounds.north
				},
				// Soft bias toward Kumasi; hard zone check still applies on select
				locationRestriction: undefined
			}) as HTMLElement & {
				value?: string;
				addEventListener: (type: string, listener: (event: Event) => void) => void;
			};

			el.classList.add('yada-place-autocomplete');
			el.style.width = '100%';
			if (placeholder) {
				el.setAttribute('placeholder', placeholder);
			}

			el.addEventListener('gmp-select', ((event: Event) => {
				void handlePlaceSelect(event);
			}) as EventListener);

			// Legacy event name in some weekly builds
			el.addEventListener('gmp-placeselect', ((event: Event) => {
				void handlePlaceSelect(event);
			}) as EventListener);

			hostEl.appendChild(el);
			placeElement = el;

			if (value) {
				try {
					(el as { value?: string }).value = value;
				} catch {
					// read-only in some builds
				}
			}
		} catch (error) {
			console.error('PlaceAutocompleteElement failed to load', error);
			errorMessage = geoErrorMessage('unavailable');
			dispatch('error', { code: 'unavailable', message: errorMessage });
		} finally {
			loading = false;
		}
	});

	async function handlePlaceSelect(event: Event) {
		resolving = true;
		errorMessage = '';

		try {
			const detail = (event as CustomEvent).detail as {
				placePrediction?: {
					toPlace?: () => {
						fetchFields: (opts: { fields: string[] }) => Promise<void>;
						formattedAddress?: string;
						displayName?: string;
						id?: string;
						location?: { lat: () => number; lng: () => number } | LatLngLike;
					};
				};
				place?: {
					fetchFields?: (opts: { fields: string[] }) => Promise<void>;
					formattedAddress?: string;
					displayName?: string;
					id?: string;
					location?: { lat: () => number; lng: () => number } | LatLngLike;
				};
			};

			type LatLngLike = { lat: number; lng: number };

			let place =
				detail?.placePrediction?.toPlace?.() ??
				detail?.place ??
				null;

			if (!place) {
				errorMessage = geoErrorMessage('no_results');
				dispatch('error', { code: 'no_results', message: errorMessage });
				return;
			}

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
			const address =
				place.formattedAddress ?? place.displayName ?? value ?? 'Selected place';
			const placeId = place.id;

			value = address;

			if (placeId) {
				cache.set(placeCacheKey(placeId), { address, lat, lng, placeId });
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

	$: if (placeElement && value) {
		try {
			(placeElement as { value?: string }).value = value;
		} catch {
			// ignore
		}
	}

	onDestroy(() => {
		placeElement?.remove();
		placeElement = null;
	});
</script>

<div class="relative w-full">
	{#if label}
		<p class="mb-1.5 text-xs font-semibold text-ink-secondary">{label}</p>
	{/if}

	<div class="relative">
		<div
			class="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 {iconColor}"
		>
			<slot name="icon">
				<svg
					viewBox="0 0 24 24"
					class="h-4 w-4"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" />
					<circle cx="12" cy="10" r="2.5" />
				</svg>
			</slot>
		</div>

		<div
			bind:this={hostEl}
			class="yada-pac-host w-full overflow-hidden rounded-md border border-border bg-surface pl-9 {!googleMapsApiKey
				? 'opacity-60'
				: ''}"
			class:pointer-events-none={disabled || loading}
			aria-busy={loading || resolving}
		></div>

		{#if loading || resolving}
			<div
				class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary"
			>
				{resolving ? 'Resolving…' : 'Loading…'}
			</div>
		{/if}
	</div>

	{#if errorMessage}
		<p class="mt-1.5 text-xs font-medium text-red-600">{errorMessage}</p>
	{/if}

	{#if !googleMapsApiKey}
		<p class="mt-1.5 text-xs text-ink-tertiary">
			Set VITE_GOOGLE_MAPS_API_KEY to enable Places autocomplete (biased to KNUST/Ayeduase
			{KUMASI_CENTER.lat.toFixed(2)}, {KUMASI_CENTER.lng.toFixed(2)}).
		</p>
	{/if}
</div>

<style>
	:global(.yada-pac-host gmp-place-autocomplete),
	:global(.yada-pac-host .yada-place-autocomplete) {
		width: 100%;
		display: block;
	}

	:global(.yada-pac-host input),
	:global(.yada-pac-host .input),
	:global(.yada-place-autocomplete) {
		width: 100%;
		min-height: 2.5rem;
		border: none;
		background: transparent;
		padding: 0.5rem 0.75rem 0.5rem 0;
		font-size: 0.875rem;
		color: inherit;
		outline: none;
	}
</style>
