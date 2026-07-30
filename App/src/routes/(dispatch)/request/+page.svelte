<script lang="ts">
	import { goto } from '$app/navigation';
	import { onDestroy, onMount } from 'svelte';
	import MapBackdrop from '$lib/components/MapBackdrop.svelte';
	import AddressAutocomplete from '$lib/components/ui/AddressAutocomplete.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { getCurrentDeviceLocation, startDeviceLocationWatcher } from '$lib/shared/geo/device-location';
	import { reverseGeocode } from '$lib/client/maps/geocode-client';
	import { computeDrivingRoute } from '$lib/client/maps/routing';
	import { containsPoint, KUMASI_CENTER, type LatLng } from '$lib/shared/geo/service-area';
	import { geoErrorMessage, type GeoErrorCode } from '$lib/shared/geo/errors';

	type LocationMode = 'pickup' | 'dropoff';

	let pickup = $state('');
	let dropoff = $state('');
	let pickupPlaceId = $state<string | undefined>(undefined);
	let dropoffPlaceId = $state<string | undefined>(undefined);
	let distance = $state('fastest');
	/** Which address field map clicks / focus update (no visible toggle). */
	let activeLocation = $state<LocationMode>('dropoff');
	let pickupPoint = $state<LatLng | null>(null);
	let dropoffPoint = $state<LatLng | null>(null);
	let mapCenter = $state<LatLng | null>(null);
	let mapZoom = $state<number | null>(null);
	let submitting = $state(false);
	let zoneError = $state('');
	let estimatedDistanceKm = $state<number | null>(null);
	let estimatedDurationMinutes = $state<number | null>(null);
	let stopDeviceWatcher: (() => void) | null = null;
	let pickupAutoFollow = true;

	const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

	const distanceOptions = [
		{ value: 'fastest', label: 'Fastest nearby' },
		{ value: 'nearby', label: 'Nearby' },
		{ value: 'further', label: 'Further away' },
		{ value: 'any', label: 'Any available' }
	];

	const canSubmit = $derived(
		Boolean(pickupPoint && dropoffPoint && dropoff.trim() && pickup.trim()) &&
			containsPoint(pickupPoint!) &&
			containsPoint(dropoffPoint!) &&
			!submitting
	);

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
			pickupAutoFollow = false;
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
		const location = await getCurrentDeviceLocation();
		if (!location) {
			mapCenter = KUMASI_CENTER;
			return;
		}

		mapCenter = location;
		mapZoom = 16;
		pickupPoint = location;
		const reverse = await reverseGeocode(location);
		pickup = reverse.ok ? reverse.result.address : pickup;
		pickupPlaceId = undefined;

		if (!containsPoint(location)) {
			zoneError = geoErrorMessage('out_of_zone');
			return;
		}

		zoneError = '';
	}

	function handleMapPick(point: LatLng) {
		void applyPoint(activeLocation, point);
	}

	function handlePickupSelect(
		detail: { address: string; lat: number; lng: number; placeId?: string; inZone: boolean }
	) {
		activeLocation = 'pickup';
		if (!detail.inZone) {
			zoneError = geoErrorMessage('out_of_zone');
			pickupPoint = null;
			return;
		}
		void applyPoint(
			'pickup',
			{ lat: detail.lat, lng: detail.lng },
			detail.address,
			detail.placeId
		);
	}

	function handleDropoffSelect(
		detail: { address: string; lat: number; lng: number; placeId?: string; inZone: boolean }
	) {
		activeLocation = 'dropoff';
		if (!detail.inZone) {
			zoneError = geoErrorMessage('out_of_zone');
			dropoffPoint = null;
			return;
		}
		void applyPoint(
			'dropoff',
			{ lat: detail.lat, lng: detail.lng },
			detail.address,
			detail.placeId
		);
	}

	function handleGeoError(detail: { code: GeoErrorCode; message: string }) {
		zoneError = detail.message;
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
		stopDeviceWatcher = startDeviceLocationWatcher({
			onUpdate: (location) => {
				mapCenter = location;
				if (pickupAutoFollow) {
					pickupPoint = location;
					void (async () => {
						const reverse = await reverseGeocode(location);
						pickup = reverse.ok ? reverse.result.address : pickup;
					})();
				}
			},
			onError: () => {
				if (!mapCenter) mapCenter = KUMASI_CENTER;
			}
		});
		void setPickupFromLocation();
	});

	onDestroy(() => {
		stopDeviceWatcher?.();
	});

	const mapMarkers = $derived([
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
	]);
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
				onpick={handleMapPick}
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
				<p class="rounded-md bg-danger-subtle px-3 py-2 text-xs font-medium text-danger">{zoneError}</p>
			{/if}

			<section class="space-y-2">
				<p class="text-eyebrow font-bold text-primary">Pickup</p>
				<div onfocusin={() => (activeLocation = 'pickup')}>
					<AddressAutocomplete
						placeholder="Business / pickup address"
						bind:value={pickup}
						iconColor="text-primary"
						onselect={handlePickupSelect}
						onerror={handleGeoError}
					/>
				</div>
			</section>

			<section class="space-y-2">
				<p class="text-eyebrow font-bold text-primary">Dropoff</p>
				<div onfocusin={() => (activeLocation = 'dropoff')}>
					<AddressAutocomplete
						placeholder="Customer delivery address"
						bind:value={dropoff}
						iconColor="text-secondary"
						onselect={handleDropoffSelect}
						onerror={handleGeoError}
					/>
				</div>
			</section>

			<section class="space-y-2">
				<p class="text-eyebrow font-bold text-primary">Dispatch</p>
				<Select label="Rider distance" options={distanceOptions} bind:value={distance} />
			</section>

			<div class="mt-auto pt-2">
				<Button
					variant="primary"
					size="lg"
					fullWidth
					disabled={!canSubmit}
					onclick={findRider}
				>
					{submitting ? 'Saving…' : 'Find a rider'}
				</Button>
			</div>
		</aside>
	</div>
</div>
