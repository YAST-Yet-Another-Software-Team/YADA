<script lang="ts">
	import { goto } from '$app/navigation';
	import { onDestroy, onMount } from 'svelte';
	import MapBackdrop from '$lib/components/MapBackdrop.svelte';
	import AddressAutocomplete from '$lib/components/ui/AddressAutocomplete.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import {
		loadGoogleMapsGeocoding,
		loadGoogleMapsRoutes
	} from '$lib/maps/google-maps-loader';

	type LocationPoint = {
		lat: number;
		lng: number;
	};

	type LocationMode = 'pickup' | 'dropoff';

	type RouteSummary = {
		distanceText: string;
		durationText: string;
		status: 'idle' | 'loading' | 'ready' | 'error';
	};

	let pickup = 'Current location';
	let dropoff = '';
	let distance = 'fastest';
	let activeLocation: LocationMode = 'dropoff';
	let pickupPoint: LocationPoint | null = null;
	let dropoffPoint: LocationPoint | null = null;
	let mapCenter: LocationPoint | null = null;
	let pickupLoading = true;
	let routeSummary: RouteSummary = {
		distanceText: '—',
		durationText: '—',
		status: 'idle'
	};
	let routePolyline: google.maps.Polyline | null = null;
	let routeMarkers: google.maps.Marker[] = [];

	const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

	const distanceOptions = [
		{ value: 'fastest', label: 'Fastest nearby' },
		{ value: 'nearby', label: 'Nearby' },
		{ value: 'further', label: 'Further away' },
		{ value: 'any', label: 'Any available' }
	];

	function getUserLocation(): Promise<LocationPoint | null> {
		if (!navigator.geolocation) {
			return Promise.resolve(null);
		}

		return new Promise((resolve) => {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					resolve({
						lat: position.coords.latitude,
						lng: position.coords.longitude
					});
				},
				() => resolve(null),
				{
					enableHighAccuracy: true,
					timeout: 6000,
					maximumAge: 60_000
				}
			);
		});
	}

	function normalizeLocation(place: google.maps.places.PlaceResult | null): LocationPoint | null {
		if (!place?.geometry?.location) {
			return null;
		}

		return {
			lat: place.geometry.location.lat(),
			lng: place.geometry.location.lng()
		};
	}

	async function reverseGeocode(point: LocationPoint): Promise<string | null> {
		if (!googleMapsApiKey) {
			return null;
		}

		const geocodingLibrary = await loadGoogleMapsGeocoding(googleMapsApiKey);
		const geocoder = new geocodingLibrary.Geocoder();
		const response = await geocoder.geocode({ location: point });

		return response.results[0]?.formatted_address ?? null;
	}

	async function syncRoutePreview() {
		if (!pickupPoint || !dropoffPoint || !googleMapsApiKey) {
			routeSummary = {
				distanceText: '—',
				durationText: '—',
				status: 'idle'
			};
			return;
		}

		routeSummary = { ...routeSummary, status: 'loading' };

		try {
			const routesLibrary = await loadGoogleMapsRoutes(googleMapsApiKey);
			const routeApi = (routesLibrary as unknown as { Route?: { computeRoutes: (request: unknown) => Promise<{ routes: Array<unknown> }> } }).Route;

			if (!routeApi) {
				throw new Error('Routes API is unavailable');
			}

			const response = await routeApi.computeRoutes({
				origin: pickupPoint,
				destination: dropoffPoint,
				travelMode: 'DRIVING',
				fields: ['legs', 'path']
			});

			const route = response.routes[0] as {
				legs?: Array<{ distance?: { text?: string }; duration?: { text?: string } }>;
				path?: google.maps.LatLngLiteral[];
				createPolylines?: () => google.maps.Polyline[];
			} | undefined;

			if (!route?.legs?.length) {
				throw new Error('No route returned');
			}

			routeSummary = {
				distanceText: route.legs?.[0]?.distance?.text ?? '—',
				durationText: route.legs?.[0]?.duration?.text ?? '—',
				status: 'ready'
			};

			if (routePolyline) {
				routePolyline.setMap(null);
			}
			routeMarkers.forEach((marker) => marker.setMap(null));
			routeMarkers = [];

			routePolyline = new google.maps.Polyline({
				path: route.path ?? [],
				strokeColor: '#ef4444',
				strokeOpacity: 0.9,
				strokeWeight: 4
			});
		} catch (error) {
			console.error('Unable to compute route.', error);
			routeSummary = {
				distanceText: 'Unavailable',
				durationText: 'Unavailable',
				status: 'error'
			};
		}
	}

	async function setPickupFromLocation() {
		pickupLoading = true;
		const location = await getUserLocation();

		if (!location) {
			pickupLoading = false;
			return;
		}

		pickupPoint = location;
		pickup = (await reverseGeocode(location)) ?? 'Current location';
		pickupLoading = false;
		void syncRoutePreview();
	}

	function handleMapPick(event: CustomEvent<LocationPoint>) {
		if (activeLocation === 'pickup') {
			pickupPoint = event.detail;
			mapCenter = pickupPoint;
			void (async () => {
				pickup = (await reverseGeocode(event.detail)) ?? pickup;
				void syncRoutePreview();
			})();
			return;
		}

		dropoffPoint = event.detail;
		mapCenter = dropoffPoint;
		void (async () => {
			dropoff = (await reverseGeocode(event.detail)) ?? dropoff;
			void syncRoutePreview();
		})();
	}

	function handlePickupSelect(event: CustomEvent<{ address: string; lat: number; lng: number }>) {
		pickupPoint = { lat: event.detail.lat, lng: event.detail.lng };
		pickup = event.detail.address;
		mapCenter = pickupPoint;
		void syncRoutePreview();
	}

	function handleDropoffSelect(event: CustomEvent<{ address: string; lat: number; lng: number }>) {
		dropoffPoint = { lat: event.detail.lat, lng: event.detail.lng };
		dropoff = event.detail.address;
		mapCenter = dropoffPoint;
		void syncRoutePreview();
	}

	onMount(() => {
		void setPickupFromLocation();
	});

	onDestroy(() => {
		routePolyline?.setMap(null);
		routeMarkers.forEach((marker) => marker.setMap(null));
	});

	function findRider() {
		if (!dropoff.trim()) return;
		goto('/matching');
	}
</script>

<svelte:head>
	<title>New request | YADA</title>
</svelte:head>

<div class="flex h-full min-h-[calc(100svh-3.25rem)] flex-col lg:min-h-[calc(100svh-58px-3rem)]">
	<div class="flex items-center gap-3 border-b border-border px-4 py-3 lg:hidden">
		<a href="/dashboard" class="text-ink" aria-label="Back">
			<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2"
				><path d="m15 18-6-6 6-6" /></svg
			>
		</a>
		<h1 class="text-lg font-semibold text-ink">New request</h1>
	</div>

	<div
		class="flex flex-1 flex-col lg:min-h-[calc(100svh-58px-3rem)] lg:flex-row lg:overflow-hidden lg:rounded-lg lg:border lg:border-border lg:bg-surface"
	>
		<div class="flex w-full flex-col gap-4 p-4 lg:w-[380px] lg:shrink-0 lg:gap-5 lg:p-8">
			<h1 class="hidden text-xl font-semibold text-ink lg:block">New delivery request</h1>

			<div class="flex gap-2 rounded-lg border border-border bg-surface p-1 text-sm">
				<button
					type="button"
					class="flex-1 rounded-md px-3 py-2 font-semibold transition-colors {activeLocation === 'pickup'
						? 'bg-primary text-primary-on'
						: 'text-ink-secondary hover:bg-primary-subtle'}"
					on:click={() => (activeLocation = 'pickup')}
				>
					Set pickup on map
				</button>
				<button
					type="button"
					class="flex-1 rounded-md px-3 py-2 font-semibold transition-colors {activeLocation === 'dropoff'
						? 'bg-primary text-primary-on'
						: 'text-ink-secondary hover:bg-primary-subtle'}"
					on:click={() => (activeLocation = 'dropoff')}
				>
					Set dropoff on map
				</button>
			</div>

			<p class="text-xs text-ink-tertiary">
				{#if pickupLoading}
					Using your browser location for pickup…
				{:else}
					Click the map to place pickup or dropoff, then switch between the two targets as needed.
				{/if}
			</p>

			<AddressAutocomplete
				label="Pickup (defaults to your location)"
				bind:value={pickup}
				iconColor="text-primary"
				on:select={handlePickupSelect}
			/>

			<AddressAutocomplete
				label="Dropoff"
				placeholder="Customer address"
				bind:value={dropoff}
				iconColor="text-secondary"
				on:select={handleDropoffSelect}
			/>

			<div class="grid gap-2 rounded-lg border border-border bg-bg px-4 py-3 text-sm text-ink-secondary">
				<p>
					<span class="font-semibold text-ink">Route:</span>
					{routeSummary.distanceText} · {routeSummary.durationText}
				</p>
				<p>
					Type an address and pick a result from autocomplete, or keep using the map to place the pins.
				</p>
			</div>

			<Select label="Rider distance" options={distanceOptions} bind:value={distance} />

			<div class="relative h-[160px] overflow-hidden rounded-lg border border-border lg:hidden">
				<MapBackdrop
					routeLabel
					interactive
					center={mapCenter}
					markers={[
						...(pickupPoint
							? [
								{
									id: 'pickup',
									lat: pickupPoint.lat,
									lng: pickupPoint.lng,
									label: 'Pickup',
									accent: false
								}
							]
							: []),
						...(dropoffPoint
							? [
								{
									id: 'dropoff',
									lat: dropoffPoint.lat,
									lng: dropoffPoint.lng,
									label: 'Dropoff',
									accent: true
								}
							]
							: [])
					]}
					on:pick={handleMapPick}
				/>
			</div>

			<div class="mt-auto pt-2">
				<Button
					variant="primary"
					size="lg"
					fullWidth
					disabled={!dropoff.trim()}
					on:click={findRider}
				>
					Find a rider
				</Button>
			</div>
		</div>

		<!-- Desktop: route preview fills remaining space (wireframe-style) -->
		<aside
			class="relative hidden min-h-[320px] flex-1 flex-col border-l border-border bg-surface lg:flex"
		>
			<div class="border-b border-border px-5 py-4">
				<h2 class="font-semibold text-ink">Route preview</h2>
				<p class="mt-1 text-sm text-ink-secondary">
					{#if routeSummary.status === 'ready'}
						Est. distance {routeSummary.distanceText} · Est. time {routeSummary.durationText}
					{:else}
						Select pickup & dropoff to preview route
					{/if}
				</p>
			</div>
			<div class="relative min-h-0 flex-1">
				<MapBackdrop
					routeLabel
					interactive
					center={mapCenter}
					markers={[
						...(pickupPoint
							? [
								{
									id: 'pickup',
									lat: pickupPoint.lat,
									lng: pickupPoint.lng,
									label: 'Pickup',
									accent: false
								}
							]
							: []),
						...(dropoffPoint
							? [
								{
									id: 'dropoff',
									lat: dropoffPoint.lat,
									lng: dropoffPoint.lng,
									label: 'Dropoff',
									accent: true
								}
							]
							: [])
					]}
					on:pick={handleMapPick}
				/>
			</div>
		</aside>
	</div>
</div>
