<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import MapBackdrop from '$lib/components/MapBackdrop.svelte';
	import AddressAutocomplete from '$lib/components/ui/AddressAutocomplete.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { reverseGeocode } from '$lib/maps/geocode-client';
	import { computeDrivingRoute } from '$lib/maps/routing';
	import { containsPoint, KUMASI_CENTER, type LatLng } from '$lib/geo/service-area';
	import { geoErrorMessage, type GeoErrorCode } from '$lib/geo/errors';

	type LocationMode = 'pickup' | 'dropoff';

	type RouteSummary = {
		distanceText: string;
		durationText: string;
		distanceKm: number | null;
		durationMinutes: number | null;
		path: LatLng[];
		status: 'idle' | 'loading' | 'ready' | 'error';
		error?: string;
	};

	let pickup = '';
	let dropoff = '';
	let pickupPlaceId: string | undefined;
	let dropoffPlaceId: string | undefined;
	let distance = 'fastest';
	let activeLocation: LocationMode = 'dropoff';
	let pickupPoint: LatLng | null = null;
	let dropoffPoint: LatLng | null = null;
	let mapCenter: LatLng | null = KUMASI_CENTER;
	let mapZoom: number | null = null;
	let pickupLoading = true;
	let submitting = false;
	let zoneError = '';
	let routeSummary: RouteSummary = {
		distanceText: '—',
		durationText: '—',
		distanceKm: null,
		durationMinutes: null,
		path: [],
		status: 'idle'
	};

	const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

	const distanceOptions = [
		{ value: 'fastest', label: 'Fastest nearby' },
		{ value: 'nearby', label: 'Nearby' },
		{ value: 'further', label: 'Further away' },
		{ value: 'any', label: 'Any available' }
	];

	$: canSubmit =
		Boolean(pickupPoint && dropoffPoint && dropoff.trim() && pickup.trim()) &&
		containsPoint(pickupPoint!) &&
		containsPoint(dropoffPoint!) &&
		!submitting &&
		routeSummary.status !== 'loading';

	function getUserLocation(): Promise<LatLng | null> {
		if (!navigator.geolocation) return Promise.resolve(null);
		return new Promise((resolve) => {
			navigator.geolocation.getCurrentPosition(
				(position) =>
					resolve({
						lat: position.coords.latitude,
						lng: position.coords.longitude
					}),
				() => resolve(null),
				{ enableHighAccuracy: true, timeout: 6000, maximumAge: 60_000 }
			);
		});
	}

	async function syncRoutePreview() {
		if (!pickupPoint || !dropoffPoint || !googleMapsApiKey) {
			routeSummary = {
				distanceText: '—',
				durationText: '—',
				distanceKm: null,
				durationMinutes: null,
				path: [],
				status: 'idle'
			};
			return;
		}

		routeSummary = { ...routeSummary, status: 'loading', error: undefined };

		try {
			const route = await computeDrivingRoute(googleMapsApiKey, pickupPoint, dropoffPoint);
			routeSummary = {
				distanceText: route.distanceText,
				durationText: route.durationText,
				distanceKm: route.distanceKm,
				durationMinutes: route.durationMinutes,
				path: route.path,
				status: 'ready'
			};
		} catch (error) {
			const code = (error as { code?: GeoErrorCode }).code ?? 'unavailable';
			routeSummary = {
				distanceText: 'Unavailable',
				durationText: 'Unavailable',
				distanceKm: null,
				durationMinutes: null,
				path: [],
				status: 'error',
				error: geoErrorMessage(code)
			};
		}
	}

	async function setPickupFromLocation() {
		pickupLoading = true;
		const location = await getUserLocation();

		if (!location) {
			pickupPoint = { ...KUMASI_CENTER };
			pickup = 'Ayeduase / KNUST (default)';
			mapCenter = pickupPoint;
			pickupLoading = false;
			return;
		}

		if (!containsPoint(location)) {
			zoneError = geoErrorMessage('out_of_zone');
			pickupPoint = { ...KUMASI_CENTER };
			pickup = 'Ayeduase Gate, near KNUST, Kumasi';
			mapCenter = pickupPoint;
			pickupLoading = false;
			return;
		}

		pickupPoint = location;
		mapCenter = location;
		const reverse = await reverseGeocode(location);
		pickup = reverse.ok ? reverse.result.address : 'Current location';
		pickupLoading = false;
		void syncRoutePreview();
	}

	function handleMapPick(event: CustomEvent<LatLng>) {
		const point = event.detail;
		const inZone = containsPoint(point);
		if (!inZone) {
			zoneError = geoErrorMessage('out_of_zone');
			return;
		}
		zoneError = '';

		if (activeLocation === 'pickup') {
			pickupPoint = point;
			mapCenter = point;
			mapZoom = 16;
			void (async () => {
				const reverse = await reverseGeocode(point);
				pickup = reverse.ok ? reverse.result.address : pickup;
				void syncRoutePreview();
			})();
			return;
		}

		dropoffPoint = point;
		mapCenter = point;
		mapZoom = 16;
		void (async () => {
			const reverse = await reverseGeocode(point);
			dropoff = reverse.ok ? reverse.result.address : dropoff;
			void syncRoutePreview();
		})();
	}

	function handlePickupSelect(
		event: CustomEvent<{ address: string; lat: number; lng: number; placeId?: string; inZone: boolean }>
	) {
		if (!event.detail.inZone) {
			zoneError = geoErrorMessage('out_of_zone');
			pickupPoint = null;
			return;
		}
		zoneError = '';
		pickupPoint = { lat: event.detail.lat, lng: event.detail.lng };
		pickup = event.detail.address;
		pickupPlaceId = event.detail.placeId;
		mapCenter = pickupPoint;
		mapZoom = 16;
		void syncRoutePreview();
	}

	function handleDropoffSelect(
		event: CustomEvent<{ address: string; lat: number; lng: number; placeId?: string; inZone: boolean }>
	) {
		if (!event.detail.inZone) {
			zoneError = geoErrorMessage('out_of_zone');
			dropoffPoint = null;
			return;
		}
		zoneError = '';
		dropoffPoint = { lat: event.detail.lat, lng: event.detail.lng };
		dropoff = event.detail.address;
		dropoffPlaceId = event.detail.placeId;
		mapCenter = dropoffPoint;
		mapZoom = 16;
		void syncRoutePreview();
	}

	function handleGeoError(event: CustomEvent<{ code: GeoErrorCode; message: string }>) {
		zoneError = event.detail.message;
	}

	async function findRider() {
		if (!canSubmit || !pickupPoint || !dropoffPoint) return;
		submitting = true;

		try {
			const response = await fetch('/api/trips', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					pickupAddress: pickup,
					dropoffAddress: dropoff,
					pickupLat: pickupPoint.lat,
					pickupLng: pickupPoint.lng,
					dropoffLat: dropoffPoint.lat,
					dropoffLng: dropoffPoint.lng,
					pickupPlaceId,
					dropoffPlaceId,
					estimatedDistanceKm: routeSummary.distanceKm,
					estimatedDurationMinutes: routeSummary.durationMinutes
				})
			});

			const data = await response.json();
			const tripPayload = {
				id: data.trip?.id ?? `local-${Date.now()}`,
				pickupAddress: pickup,
				dropoffAddress: dropoff,
				pickupLat: pickupPoint.lat,
				pickupLng: pickupPoint.lng,
				dropoffLat: dropoffPoint.lat,
				dropoffLng: dropoffPoint.lng,
				estimatedDistanceKm: routeSummary.distanceKm,
				estimatedDurationMinutes: routeSummary.durationMinutes,
				routePath: routeSummary.path
			};
			sessionStorage.setItem('yada:active-trip', JSON.stringify(tripPayload));

			if (!response.ok && response.status !== 401) {
				zoneError = data.message ?? 'Could not save trip — continuing with local preview.';
			}

			goto(`/matching?trip=${encodeURIComponent(tripPayload.id)}`);
		} finally {
			submitting = false;
		}
	}

	onMount(() => {
		void setPickupFromLocation();
	});

	$: mapMarkers = [
		...(pickupPoint
			? [{ id: 'pickup', lat: pickupPoint.lat, lng: pickupPoint.lng, label: 'Pickup', role: 'pickup' as const }]
			: []),
		...(dropoffPoint
			? [
					{
						id: 'dropoff',
						lat: dropoffPoint.lat,
						lng: dropoffPoint.lng,
						label: 'Dropoff',
						role: 'dropoff' as const
					}
				]
			: [])
	];
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
		class="flex flex-1 flex-col overflow-visible lg:min-h-[calc(100svh-58px-3rem)] lg:flex-row lg:overflow-visible lg:rounded-lg lg:border lg:border-border lg:bg-surface"
	>
		<div class="relative z-20 flex w-full flex-col gap-4 overflow-visible p-4 lg:w-[380px] lg:shrink-0 lg:gap-5 lg:p-8">
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
					Resolving pickup in Kumasi (KNUST/Ayeduase)…
				{:else}
					Addresses must be inside the KNUST / Ayeduase delivery zone.
				{/if}
			</p>

			{#if zoneError}
				<p class="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{zoneError}</p>
			{/if}

			<AddressAutocomplete
				label="Pickup (defaults to your location)"
				bind:value={pickup}
				iconColor="text-primary"
				on:select={handlePickupSelect}
				on:error={handleGeoError}
			/>

			<AddressAutocomplete
				label="Dropoff"
				placeholder="Customer address in KNUST / Ayeduase"
				bind:value={dropoff}
				iconColor="text-secondary"
				on:select={handleDropoffSelect}
				on:error={handleGeoError}
			/>

			<div class="grid gap-2 rounded-lg border border-border bg-bg px-4 py-3 text-sm text-ink-secondary">
				<p>
					<span class="font-semibold text-ink">Route:</span>
					{#if routeSummary.status === 'loading'}
						Calculating…
					{:else}
						{routeSummary.distanceText} · {routeSummary.durationText}
					{/if}
				</p>
				{#if routeSummary.error}
					<p class="text-red-600">{routeSummary.error}</p>
				{/if}
			</div>

			<Select label="Rider distance" options={distanceOptions} bind:value={distance} />

			<div class="relative h-[160px] overflow-hidden rounded-lg border border-border lg:hidden">
				<MapBackdrop
					routeLabel
					interactive
					center={mapCenter}
					zoom={mapZoom}
					markers={mapMarkers}
					polylinePath={routeSummary.path}
					on:pick={handleMapPick}
				/>
			</div>

			<div class="mt-auto pt-2">
				<Button
					variant="primary"
					size="lg"
					fullWidth
					disabled={!canSubmit}
					on:click={findRider}
				>
					{submitting ? 'Saving…' : 'Find a rider'}
				</Button>
			</div>
		</div>

		<aside
			class="relative hidden min-h-[320px] flex-1 flex-col border-l border-border bg-surface lg:flex"
		>
			<div class="border-b border-border px-5 py-4">
				<h2 class="font-semibold text-ink">Route preview</h2>
				<p class="mt-1 text-sm text-ink-secondary">
					{#if routeSummary.status === 'ready'}
						Est. distance {routeSummary.distanceText} · Est. time {routeSummary.durationText}
					{:else if routeSummary.status === 'loading'}
						Calculating driving route…
					{:else}
						Select pickup & dropoff inside KNUST / Ayeduase
					{/if}
				</p>
			</div>
			<div class="relative min-h-0 flex-1">
				<MapBackdrop
					routeLabel
					interactive
					center={mapCenter}
					zoom={mapZoom}
					markers={mapMarkers}
					polylinePath={routeSummary.path}
					on:pick={handleMapPick}
				/>
			</div>
		</aside>
	</div>
</div>
