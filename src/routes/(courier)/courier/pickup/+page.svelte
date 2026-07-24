<script lang="ts">
	import { goto } from '$app/navigation';
	import { onDestroy, onMount } from 'svelte';
	import MapBackdrop from '$lib/components/MapBackdrop.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { KUMASI_CENTER, type LatLng, distanceToPolylineKm } from '$lib/geo/service-area';
	import { computeDrivingRoute, OFF_ROUTE_THRESHOLD_KM } from '$lib/maps/routing';
	import { startCourierLocationReporter } from '$lib/realtime/courier-location';

	type ActiveTrip = {
		id: string;
		pickupAddress: string;
		dropoffAddress: string;
		pickupLat: number;
		pickupLng: number;
		dropoffLat: number;
		dropoffLng: number;
	};

	let trip: ActiveTrip = {
		id: 'demo',
		pickupAddress: 'Ayeduase Kitchen',
		dropoffAddress: 'KNUST Commercial Area',
		pickupLat: 6.6785,
		pickupLng: -1.5645,
		dropoffLat: 6.6745,
		dropoffLng: -1.5716
	};
	let riderPoint: LatLng | null = null;
	let routePath: LatLng[] = [];
	let etaText = 'Calculating…';
	let locationUnavailable = false;
	let stopReporter: (() => void) | null = null;
	const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

	function confirmPickup() {
		goto('/courier/deliver');
	}

	async function updateRoute(from: LatLng, force = false) {
		if (!googleMapsApiKey) return;
		try {
			const route = await computeDrivingRoute(
				googleMapsApiKey,
				from,
				{ lat: trip.pickupLat, lng: trip.pickupLng },
				{ force }
			);
			routePath = route.path;
			etaText = route.durationText;
		} catch {
			etaText = 'Unavailable';
		}
	}

	onMount(() => {
		const raw = sessionStorage.getItem('yada:active-trip');
		if (raw) {
			try {
				trip = { ...trip, ...(JSON.parse(raw) as ActiveTrip) };
			} catch {
				// keep defaults
			}
		}

		sessionStorage.setItem('yada:courier-trip-id', trip.id);
		riderPoint = { lat: trip.pickupLat - 0.003, lng: trip.pickupLng + 0.002 };
		void updateRoute(riderPoint);

		stopReporter = startCourierLocationReporter({
			tripId: trip.id,
			enabled: true,
			onUpdate: (point) => {
				riderPoint = { lat: point.lat, lng: point.lng };
				locationUnavailable = point.stale;
				if (routePath.length > 1) {
					const drift = distanceToPolylineKm(riderPoint, routePath);
					if (drift > OFF_ROUTE_THRESHOLD_KM) {
						void updateRoute(riderPoint, true);
						return;
					}
				}
				void updateRoute(riderPoint);
			},
			onError: () => {
				locationUnavailable = true;
			}
		});
	});

	onDestroy(() => {
		stopReporter?.();
	});
</script>

<svelte:head>
	<title>Heading to pickup | YADA Courier</title>
</svelte:head>

<div class="relative flex h-full min-h-[inherit] flex-1 flex-col bg-bg">
	<div class="relative min-h-[45%] flex-1">
		<MapBackdrop
			routeLabel
			showZone
			center={riderPoint ?? KUMASI_CENTER}
			followId="rider"
			locationUnavailable={locationUnavailable}
			polylinePath={routePath}
			markers={[
				{
					id: 'pickup',
					lat: trip.pickupLat,
					lng: trip.pickupLng,
					label: 'Pickup',
					role: 'pickup'
				},
				{
					id: 'dropoff',
					lat: trip.dropoffLat,
					lng: trip.dropoffLng,
					label: 'Dropoff',
					role: 'dropoff'
				},
				...(riderPoint
					? [
							{
								id: 'rider',
								lat: riderPoint.lat,
								lng: riderPoint.lng,
								label: 'You',
								role: 'rider' as const,
								stale: locationUnavailable
							}
						]
					: [])
			]}
		/>
	</div>

	<div class="z-10 flex flex-col gap-4 rounded-t-xl border-t border-border bg-surface p-5 shadow-lg">
		<span
			class="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary-subtle px-3 py-1 text-sm font-semibold text-secondary-700"
		>
			→ Heading to pickup · {etaText}
		</span>

		<div>
			<p class="font-semibold text-ink">Ayeduase Kitchen</p>
			<p class="text-sm text-ink-secondary">{trip.pickupAddress}</p>
		</div>

		<div class="flex items-center gap-3">
			<Button variant="ghost" size="sm">Navigate</Button>
			<div class="flex-1"></div>
			<Button variant="primary" size="sm" on:click={confirmPickup}>Confirm pickup</Button>
		</div>
	</div>
</div>
