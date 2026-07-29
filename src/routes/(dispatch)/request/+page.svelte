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

	let pickup = '';
	let dropoff = '';
	let pickupPlaceId: string | undefined;
	let dropoffPlaceId: string | undefined;
	let distance = 'fastest';
	/** Which address field map clicks / focus update (no visible toggle). */
	let activeLocation: LocationMode = 'dropoff';
	let pickupPoint: LatLng | null = null;
	let dropoffPoint: LatLng | null = null;
	let mapCenter: LatLng | null = KUMASI_CENTER;
	let mapZoom: number | null = null;
	let submitting = false;
	let zoneError = '';
	let estimatedDistanceKm: number | null = null;
	let estimatedDurationMinutes: number | null = null;

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
		!submitting;

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

	async function refreshEstimatesQuietly() {
		if (!pickupPoint || !dropoffPoint || !googleMapsApiKey) {
			estimatedDistanceKm = null;
			estimatedDurationMinutes = null;
			return;
		}
		try {
			const route = await computeDrivingRoute(googleMapsApiKey, pickupPoint, dropoffPoint);
			estimatedDistanceKm = route.distanceKm;
			estimatedDurationMinutes = route.durationMinutes;
		} catch {
			estimatedDistanceKm = null;
			estimatedDurationMinutes = null;
		}
	}

	async function applyPoint(mode: LocationMode, point: LatLng, address?: string, placeId?: string) {
		if (!containsPoint(point)) {
			zoneError = geoErrorMessage('out_of_zone');
			return;
		}
		zoneError = '';
		mapCenter = point;
		mapZoom = 16;

		if (mode === 'pickup') {
			pickupPoint = point;
			pickupPlaceId = placeId;
			if (address) pickup = address;
			else {
				const reverse = await reverseGeocode(point);
				pickup = reverse.ok ? reverse.result.address : pickup;
			}
		} else {
			dropoffPoint = point;
			dropoffPlaceId = placeId;
			if (address) dropoff = address;
			else {
				const reverse = await reverseGeocode(point);
				dropoff = reverse.ok ? reverse.result.address : dropoff;
			}
		}

		void refreshEstimatesQuietly();
	}

	async function setPickupFromLocation() {
		const location = await getUserLocation();
		const point = location && containsPoint(location) ? location : { ...KUMASI_CENTER };
		await applyPoint(
			'pickup',
			point,
			location && containsPoint(location) ? undefined : 'Ayeduase Gate, near KNUST, Kumasi'
		);
		if (location && !containsPoint(location)) {
			zoneError = '';
		}
	}

	function handleMapPick(event: CustomEvent<LatLng>) {
		void applyPoint(activeLocation, event.detail);
	}

	function handlePickupSelect(
		event: CustomEvent<{ address: string; lat: number; lng: number; placeId?: string; inZone: boolean }>
	) {
		activeLocation = 'pickup';
		if (!event.detail.inZone) {
			zoneError = geoErrorMessage('out_of_zone');
			pickupPoint = null;
			return;
		}
		void applyPoint(
			'pickup',
			{ lat: event.detail.lat, lng: event.detail.lng },
			event.detail.address,
			event.detail.placeId
		);
	}

	function handleDropoffSelect(
		event: CustomEvent<{ address: string; lat: number; lng: number; placeId?: string; inZone: boolean }>
	) {
		activeLocation = 'dropoff';
		if (!event.detail.inZone) {
			zoneError = geoErrorMessage('out_of_zone');
			dropoffPoint = null;
			return;
		}
		void applyPoint(
			'dropoff',
			{ lat: event.detail.lat, lng: event.detail.lng },
			event.detail.address,
			event.detail.placeId
		);
	}

	function handleGeoError(event: CustomEvent<{ code: GeoErrorCode; message: string }>) {
		zoneError = event.detail.message;
	}

	async function findRider() {
		if (!canSubmit || !pickupPoint || !dropoffPoint) return;
		submitting = true;

		try {
			await refreshEstimatesQuietly();

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
					estimatedDistanceKm,
					estimatedDurationMinutes
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
				estimatedDistanceKm,
				estimatedDurationMinutes
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

<div
	class="flex h-full min-h-[calc(100svh-3.25rem)] flex-col lg:min-h-[calc(100svh-58px-3rem)] lg:overflow-hidden lg:rounded-lg lg:border lg:border-border lg:bg-surface"
>
	<div class="flex items-center gap-3 border-b border-border px-4 py-3 lg:hidden">
		<a href="/dashboard" class="text-ink" aria-label="Back">
			<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2"
				><path d="m15 18-6-6 6-6" /></svg
			>
		</a>
		<h1 class="text-lg font-semibold text-ink">New request</h1>
	</div>

	<div class="flex min-h-0 flex-1 flex-col lg:flex-row">
		<!-- Map on top in portrait; right pane in landscape -->
		<div class="relative order-1 min-h-[52svh] flex-1 lg:order-2 lg:min-h-0">
			<MapBackdrop
				interactive
				center={mapCenter}
				zoom={mapZoom}
				markers={mapMarkers}
				on:pick={handleMapPick}
			/>
		</div>

		<!-- Request controls below in portrait; left pane in landscape -->
		<aside
			class="relative z-20 order-2 flex w-full shrink-0 flex-col gap-5 overflow-visible border-t border-border bg-surface p-4 lg:order-1 lg:w-[320px] lg:overflow-y-auto lg:border-r lg:border-t-0 lg:p-6"
		>
			<div class="hidden lg:block">
				<h1 class="text-xl font-semibold text-ink">New delivery request</h1>
				<p class="mt-1 text-sm text-ink-secondary">
					Search addresses or tap the map to place pins.
				</p>
			</div>

			{#if zoneError}
				<p class="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{zoneError}</p>
			{/if}

			<section class="space-y-2">
				<p class="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">Pickup</p>
				<div on:focusin={() => (activeLocation = 'pickup')}>
					<AddressAutocomplete
						placeholder="Business / pickup address"
						bind:value={pickup}
						iconColor="text-primary"
						on:select={handlePickupSelect}
						on:error={handleGeoError}
					/>
				</div>
			</section>

			<section class="space-y-2">
				<p class="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">Dropoff</p>
				<div on:focusin={() => (activeLocation = 'dropoff')}>
					<AddressAutocomplete
						placeholder="Customer delivery address"
						bind:value={dropoff}
						iconColor="text-secondary"
						on:select={handleDropoffSelect}
						on:error={handleGeoError}
					/>
				</div>
			</section>

			<section class="space-y-2">
				<p class="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">Dispatch</p>
				<Select label="Rider distance" options={distanceOptions} bind:value={distance} />
			</section>

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
		</aside>
	</div>
</div>
