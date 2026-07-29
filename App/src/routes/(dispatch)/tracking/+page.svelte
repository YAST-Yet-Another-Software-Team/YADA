<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onDestroy, onMount } from 'svelte';
	import MapBackdrop from '$lib/components/MapBackdrop.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import StatusPill from '$lib/components/ui/StatusPill.svelte';
	import { KUMASI_CENTER, type LatLng, distanceToPolylineKm } from '$lib/geo/service-area';
	import { computeDrivingRoute, OFF_ROUTE_THRESHOLD_KM } from '$lib/maps/routing';
	import {
		joinTripRoom,
		leaveTripRoom,
		onRiderLocation,
		type RiderLocationEvent
	} from '$lib/realtime/client';
	import { LOCATION_STALE_MS } from '$lib/realtime/courier-location';

	type ActiveTrip = {
		id: string;
		status: 'requested' | 'accepted' | 'courier_arriving' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
		pickupAddress: string;
		dropoffAddress: string;
		pickupLat: number;
		pickupLng: number;
		dropoffLat: number;
		dropoffLng: number;
		estimatedDurationMinutes?: number | null;
		assignedCourierId?: string | null;
		routePath?: LatLng[];
	};

	let trip: ActiveTrip | null = null;
	let riderPoint: LatLng | null = null;
	let riderStale = false;
	let etaText = '—';
	let routePath: LatLng[] = [];
	let locationUnavailable = false;
	let unsub: (() => void) | null = null;
	let refreshTimer: ReturnType<typeof setInterval> | undefined;
	let tripStatusLabel = 'Waiting';
	const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

	function markDelivered() {
		goto('/history');
	}

	function cancel() {
		goto('/dashboard');
	}

	function goBack() {
		goto('/dashboard');
	}

	async function recomputeRoute(origin: LatLng, destination: LatLng, force = false) {
		if (!googleMapsApiKey) return;
		try {
			const route = await computeDrivingRoute(googleMapsApiKey, origin, destination, { force });
			routePath = route.path;
			etaText = route.durationText;
			if (trip) {
				trip = { ...trip, routePath: route.path, estimatedDurationMinutes: route.durationMinutes };
				sessionStorage.setItem('yada:active-trip', JSON.stringify(trip));
			}
		} catch {
			etaText = 'Unavailable';
		}
	}

	async function loadTripState(tripId: string) {
		try {
			const res = await fetch(`/api/trips?id=${encodeURIComponent(tripId)}`);
			const data = await res.json();
			if (!data.ok || !data.trip) return false;

			trip = {
				id: data.trip.id,
				status: data.trip.status,
				pickupAddress: data.trip.pickupAddress,
				dropoffAddress: data.trip.dropoffAddress,
				pickupLat: data.trip.pickupLat,
				pickupLng: data.trip.pickupLng,
				dropoffLat: data.trip.dropoffLat,
				dropoffLng: data.trip.dropoffLng,
				estimatedDurationMinutes: data.trip.estimatedDurationMinutes,
				assignedCourierId: data.trip.assignedCourierId ?? null,
				routePath: trip?.routePath
			};

			if (trip.estimatedDurationMinutes) {
				etaText = `${Math.round(trip.estimatedDurationMinutes)} min`;
			}

			routePath = trip.routePath ?? [
				{ lat: trip.pickupLat, lng: trip.pickupLng },
				{ lat: trip.dropoffLat, lng: trip.dropoffLng }
			];

			if (trip.status !== 'requested' && trip.assignedCourierId) {
				if (!unsub) {
					joinTripRoom(trip.id);
					unsub = onRiderLocation(handleRiderLocation);
				}
			}

			return true;
		} catch {
			return false;
		}
	}

	function handleRiderLocation(payload: RiderLocationEvent) {
		if (trip && payload.tripId && payload.tripId !== trip.id) return;
		riderPoint = { lat: payload.lat, lng: payload.lng };
		riderStale = Date.now() - new Date(payload.recordedAt).getTime() > LOCATION_STALE_MS;
		locationUnavailable = riderStale;

		if (trip && routePath.length > 1) {
			const drift = distanceToPolylineKm(riderPoint, routePath);
			if (drift > OFF_ROUTE_THRESHOLD_KM) {
				void recomputeRoute(riderPoint, { lat: trip.dropoffLat, lng: trip.dropoffLng }, true);
				return;
			}
		}

		if (trip) {
			void recomputeRoute(riderPoint, { lat: trip.dropoffLat, lng: trip.dropoffLng });
		}
	}

	onMount(async () => {
		const tripId = $page.url.searchParams.get('trip');
		const raw = sessionStorage.getItem('yada:active-trip');
		if (raw) {
			try {
				trip = JSON.parse(raw) as ActiveTrip;
			} catch {
				trip = null;
			}
		}

		if (tripId) {
			const loaded = await loadTripState(tripId);
			if (loaded && trip) {
				sessionStorage.setItem('yada:active-trip', JSON.stringify(trip));
			}
		}

		if (!trip) {
			goto('/request');
			return;
		}

		if (trip.estimatedDurationMinutes) {
			etaText = `${Math.round(trip.estimatedDurationMinutes)} min`;
		}
		routePath = trip.routePath ?? [
			{ lat: trip.pickupLat, lng: trip.pickupLng },
			{ lat: trip.dropoffLat, lng: trip.dropoffLng }
		];

		if (trip.status === 'requested' || !trip.assignedCourierId) {
			tripStatusLabel = 'Waiting for a rider';
		} else {
			tripStatusLabel =
				trip.status === 'accepted'
					? 'Rider accepted'
					: trip.status === 'courier_arriving'
						? 'Rider arriving'
						: trip.status === 'arrived'
							? 'Rider arrived'
							: trip.status === 'in_progress'
								? 'In progress'
								: trip.status === 'completed'
									? 'Completed'
									: 'Cancelled';
		}

		refreshTimer = setInterval(() => {
			if (tripId) void loadTripState(tripId);
		}, 4000);

		if (trip.status !== 'requested' && trip.assignedCourierId) {
			joinTripRoom(trip.id);
			unsub = onRiderLocation(handleRiderLocation);
		}
	});

	onDestroy(() => {
		unsub?.();
		if (trip) leaveTripRoom(trip.id);
		if (refreshTimer) clearInterval(refreshTimer);
	});

	$: markers = trip
		? [
				{
					id: 'pickup',
					lat: trip.pickupLat,
					lng: trip.pickupLng,
					label: 'Pickup',
					role: 'pickup' as const
				},
				{
					id: 'dropoff',
					lat: trip.dropoffLat,
					lng: trip.dropoffLng,
					label: trip.dropoffAddress,
					role: 'dropoff' as const
				},
				...(riderPoint
					? [
							{
								id: 'rider',
								lat: riderPoint.lat,
								lng: riderPoint.lng,
								label: 'Rider',
								role: 'rider' as const,
								stale: riderStale
							}
						]
					: [])
			]
		: [];
</script>

<svelte:head>
	<title>Tracking | YADA</title>
</svelte:head>

<div
	class="relative flex min-h-[calc(100svh-3.25rem)] flex-col lg:min-h-[calc(100svh-58px-3rem)] lg:flex-row lg:overflow-hidden lg:rounded-lg lg:border lg:border-border lg:bg-surface"
>
	<div class="relative min-h-[40svh] flex-1 lg:min-h-0">
		<div class="absolute left-4 top-4 z-10 lg:hidden">
			<IconButton ariaLabel="Back" on:click={goBack}>
				<svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2"
					><path d="m15 18-6-6 6-6" /></svg
				>
			</IconButton>
		</div>

		<MapBackdrop
			routeLabel
			center={riderPoint ?? (trip ? { lat: trip.dropoffLat, lng: trip.dropoffLng } : KUMASI_CENTER)}
			markers={markers}
			polylinePath={routePath}
			followId="rider"
			locationUnavailable={locationUnavailable}
		/>
	</div>

	<aside
		class="z-10 flex flex-col gap-4 rounded-t-xl border-t border-border bg-surface p-6 shadow-lg lg:w-[320px] lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none"
	>
		<StatusPill status={trip?.status === 'requested' ? 'searching' : trip?.status === 'accepted' ? 'assigned' : trip?.status === 'courier_arriving' || trip?.status === 'arrived' || trip?.status === 'in_progress' ? 'en_route' : trip?.status === 'completed' ? 'delivered' : 'cancelled'} />

		<div class="flex items-center gap-3">
			<Avatar initials="KA" status="online" size={48} />
			<div class="flex-1">
				<p class="text-sm font-semibold text-ink">Assigned rider</p>
				<p class="text-sm text-ink-secondary">{tripStatusLabel}</p>
			</div>
			<p class="font-mono-data text-[22px] font-semibold leading-none text-primary lg:hidden">
				{etaText}
			</p>
		</div>

		<p class="font-mono-data hidden text-[26px] font-bold text-primary lg:block">{etaText}</p>

		<div class="hidden border-t border-border pt-3 lg:block">
			<p class="text-sm text-ink-secondary">
				{trip?.pickupAddress ?? 'Pickup'} → {trip?.dropoffAddress ?? 'Dropoff'}
			</p>
			{#if trip?.status === 'requested' || !trip?.assignedCourierId}
				<p class="mt-2 text-sm text-ink-secondary">Waiting for a rider to accept this request.</p>
			{/if}
		</div>

		<div class="flex items-center gap-3">
			<IconButton ariaLabel="Call courier" variant="outline">
				<svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2"
					><path
						d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z"
					/></svg
				>
			</IconButton>
			<IconButton ariaLabel="Message courier" variant="outline">
				<svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2"
					><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg
				>
			</IconButton>
			<div class="flex-1"></div>
		</div>

		<div class="mt-auto flex flex-col gap-2 lg:pt-4">
			<div class="flex gap-3 lg:flex-col">
				<Button variant="ghost" size="sm" on:click={cancel}>Cancel request</Button>
				<Button variant="primary" size="sm" on:click={markDelivered}>Mark delivered</Button>
			</div>
		</div>
	</aside>
</div>
