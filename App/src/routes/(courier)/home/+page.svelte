<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import MapBackdrop from '$lib/components/MapBackdrop.svelte';
	import { startDeviceLocationWatcher } from '$lib/shared/geo/device-location';
	import { startCourierLocationReporter } from '../location-reporter';
	import { getCourierOnline } from '../courier-online.svelte';
	import { KUMASI_CENTER } from '$lib/shared/geo/service-area';
	import { courierTripHref } from '$lib/shared/trip-status';
	import type { TripStatus } from '$lib/utils/types';

	let {
		data
	}: {
		data: {
			profile: { name: string; initials: string };
			activeTrip: {
				id: string;
				status: TripStatus;
				businessName: string;
				pickupAddress: string;
				dropoffAddress: string;
				pickupLat: number | null;
				pickupLng: number | null;
				dropoffLat: number | null;
				dropoffLng: number | null;
				notes: string | null;
				estimatedDistanceKm: number | null;
			} | null;
			pendingRequests: Array<{
				id: string;
				businessName: string;
				pickupAddress: string;
				dropoffAddress: string;
				pickupLat: number | null;
				pickupLng: number | null;
				dropoffLat: number | null;
				dropoffLng: number | null;
				notes: string | null;
			}>;
			summary: {
				completedTrips: number;
				tripsToday: number;
				totalDistanceKm: number;
				activeTrips: number;
			};
		};
	} = $props();

	const online = getCourierOnline();

	let acceptingId = $state<string | null>(null);
	let decliningId = $state<string | null>(null);
	let actionError = $state('');
	let refreshTimer: ReturnType<typeof setInterval> | undefined;
	let deviceCenter = $state<{ lat: number; lng: number } | null>(null);
	let stopDeviceWatcher: (() => void) | null = null;

	onMount(() => {
		stopDeviceWatcher = startDeviceLocationWatcher({
			onUpdate: (location) => {
				deviceCenter = location;
			},
			onError: () => {
				deviceCenter = deviceCenter ?? KUMASI_CENTER;
			}
		});
		refreshTimer = setInterval(() => {
			// Nothing can arrive on an offline courier's board — dispatch skips
			// them — so the poll is pure cost until they clock on. Kept at 5 s for
			// everyone else: rings are 15 s wide, and a slower board would spend
			// most of a courier's exclusive window not showing them the offer.
			if (!online.online && !data.activeTrip) return;
			void invalidateAll();
		}, 5000);
	});

	// Derived rather than read inside the effect below: `data` is replaced
	// wholesale by every board refresh, so reading it there would tear down and
	// restart the GPS watch on each poll. The id itself rarely changes.
	const activeTripId = $derived(data.activeTrip?.id ?? null);

	// While online, publish position to the server even with no trip on the
	// hook. Dispatch rings by distance, and an idle courier who never reports
	// where they are is unlocatable — before this, only the pickup and deliver
	// screens fed the server, so *idle* riders could never be ringed at all.
	//
	// The trip id is passed when there is one, even though this screen isn't the
	// one driving the delivery: it is what puts the reporter on its fast cadence,
	// so a courier who backs out to the board mid-trip doesn't go quiet on the
	// business watching them.
	$effect(() => {
		if (!online.online) return;

		const stopReporter = startCourierLocationReporter({
			tripId: activeTripId,
			enabled: true,
			onUpdate: (point) => {
				deviceCenter = { lat: point.lat, lng: point.lng };
			},
			onError: () => {}
		});

		return () => stopReporter();
	});

	onDestroy(() => {
		if (refreshTimer) clearInterval(refreshTimer);
		stopDeviceWatcher?.();
	});

	const currentRequest = $derived(data.pendingRequests[0] ?? null);
	const heroTrip = $derived(data.activeTrip ?? currentRequest);
	const pickupPoint = $derived(
		heroTrip?.pickupLat != null && heroTrip?.pickupLng != null
			? { lat: heroTrip.pickupLat, lng: heroTrip.pickupLng }
			: KUMASI_CENTER
	);
	const dropoffPoint = $derived(
		heroTrip?.dropoffLat != null && heroTrip?.dropoffLng != null
			? { lat: heroTrip.dropoffLat, lng: heroTrip.dropoffLng }
			: null
	);
	// No line here. What used to be drawn was a straight segment from pickup to
	// dropoff — not a route, and not a road: it crossed whatever lay between the
	// two pins. The real navigation lives on the pickup and deliver screens, so
	// this map shows where the job is with markers and leaves it at that.
	/** The trip's own words for where it is, spoken from the courier's side. */
	const ACTIVE_TRIP_LABELS: Partial<Record<TripStatus, string>> = {
		accepted: 'Heading to pickup',
		courier_arriving: 'At pickup',
		arrived: 'At pickup',
		picked_up: 'Ready to deliver',
		in_progress: 'On the way'
	};

	const statusLabel = $derived(
		!online.online
			? 'Offline'
			: data.activeTrip
				? (ACTIVE_TRIP_LABELS[data.activeTrip.status] ?? 'Active trip')
				: 'Online'
	);

	async function acceptRequest(requestId: string) {
		if (acceptingId || !online.online) return;

		acceptingId = requestId;
		actionError = '';
		try {
			const response = await fetch('/api/courier/accept-trip', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tripId: requestId })
			});

			if (!response.ok) {
				throw new Error('Unable to accept request');
			}

			const payload = await response.json();
			if (payload.ok) {
				goto(`/pickup?tripId=${encodeURIComponent(payload.tripId)}`);
			}
		} catch (error) {
			actionError = error instanceof Error ? error.message : 'Unable to accept request';
		} finally {
			acceptingId = null;
		}
	}

	async function declineRequest(requestId: string) {
		if (decliningId || !online.online) return;

		decliningId = requestId;
		actionError = '';
		try {
			const response = await fetch('/api/courier/decline-trip', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tripId: requestId })
			});

			if (!response.ok) {
				throw new Error('Unable to decline request');
			}

			goto('/home');
		} catch (error) {
			actionError = error instanceof Error ? error.message : 'Unable to decline request';
		} finally {
			decliningId = null;
		}
	}

	function openActiveTrip() {
		if (!data.activeTrip) return;
		goto(courierTripHref(data.activeTrip));
	}

	function goOnline() {
		online.goOnline();
	}

	function goOffline() {
		online.goOffline();
	}
</script>

<svelte:head>
	<title>Home | YADA Courier</title>
</svelte:head>

<div class="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-bg">
	<div class="absolute inset-0">
		<!-- `routeLabel` is gone with the line: it drew a dashed segment across the
		     placeholder map, which implied a route this screen never had. -->
		<MapBackdrop
			center={online.online ? pickupPoint : deviceCenter ?? KUMASI_CENTER}
			markers={online.online && heroTrip
				? [
						{
							id: 'pickup',
							lat: pickupPoint.lat,
							lng: pickupPoint.lng,
							label: 'Pickup',
							role: 'pickup'
						},
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
					]
				: []}
		/>

		<div class="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-4">
			<div
				class="pointer-events-auto max-w-sm rounded-xl border border-border bg-surface/95 px-4 py-3 text-center shadow-md backdrop-blur-sm"
				in:fade={{ duration: 160 }}
			>
				{#if online.online}
					<span
						class="inline-flex items-center gap-1.5 rounded-full bg-primary-subtle px-3 py-1 text-xs font-semibold text-primary"
					>
						<span class="h-2 w-2 rounded-full bg-primary animate-yada-pulse"></span>
						{statusLabel}
					</span>
					{#if data.activeTrip}
						<p class="mt-2 text-sm font-semibold text-ink">{data.activeTrip.businessName}</p>
						<p class="mt-0.5 text-xs text-ink-secondary">
							{data.activeTrip.pickupAddress} → {data.activeTrip.dropoffAddress}
						</p>
					{:else if data.pendingRequests.length > 0}
						<p class="mt-2 text-sm font-semibold text-ink">
							{data.pendingRequests.length} delivery request{data.pendingRequests.length === 1
								? ''
								: 's'}
						</p>
						<p class="mt-0.5 text-xs text-ink-secondary">Review offers below to accept a trip</p>
					{:else}
						<p class="mt-2 text-sm font-semibold text-ink">Waiting for a delivery request…</p>
						<p class="mt-0.5 text-xs text-ink-secondary">
							Stay nearby — businesses call riders based on distance
						</p>
					{/if}
				{:else}
					<span
						class="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-ink-tertiary"
					>
						<span class="h-2 w-2 rounded-full bg-neutral-400"></span>
						Offline
					</span>
					<p class="mt-2 text-sm font-semibold text-ink">You're offline</p>
					<p class="mt-0.5 text-xs text-ink-secondary">
						Go online when you're ready to receive delivery requests
					</p>
				{/if}
			</div>
		</div>
	</div>

	<div
		class="relative z-10 mt-auto space-y-3 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pb-3 pt-10"
	>
		{#if online.online && data.activeTrip}
			<div class="rounded-lg border border-border bg-surface/95 p-3 shadow-sm backdrop-blur-sm">
				<div class="flex items-center justify-between gap-3">
					<div>
						<p class="text-eyebrow text-ink-tertiary">
							Active trip
						</p>
						<p class="text-sm font-semibold text-ink">
							{data.activeTrip.businessName}
						</p>
					</div>
					<Button variant="primary" size="sm" onclick={openActiveTrip}>Continue trip</Button>
				</div>
			</div>
		{:else if online.online && currentRequest}
			<div class="space-y-3 rounded-lg border border-border bg-surface/95 p-3 shadow-sm backdrop-blur-sm">
				{#if actionError}
					<Alert>{actionError}</Alert>
				{/if}
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-eyebrow text-ink-tertiary">
							New request
						</p>
						<p class="text-sm font-semibold text-ink">{currentRequest.businessName}</p>
						<p class="mt-0.5 text-xs text-ink-secondary">
							{currentRequest.pickupAddress} → {currentRequest.dropoffAddress}
						</p>
						{#if currentRequest.notes}
							<p class="mt-1 text-xs text-ink-tertiary">{currentRequest.notes}</p>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<Button
							variant="ghost"
							size="sm"
							disabled={decliningId === currentRequest.id}
							onclick={() => declineRequest(currentRequest.id)}
						>
							{decliningId === currentRequest.id ? 'Declining…' : 'Decline'}
						</Button>
						<Button
							variant="primary"
							size="sm"
							disabled={acceptingId === currentRequest.id}
							onclick={() => acceptRequest(currentRequest.id)}
						>
							{acceptingId === currentRequest.id ? 'Accepting…' : 'Accept'}
						</Button>
					</div>
				</div>
			</div>
		{:else if online.online}
			<div class="space-y-2 rounded-lg border border-border bg-surface/95 p-3 text-center text-sm text-ink-secondary shadow-sm backdrop-blur-sm">
				{#if actionError}
					<Alert>{actionError}</Alert>
				{/if}
				<p>Today: {data.summary.tripsToday} deliveries</p>
			</div>
		{/if}

		{#if online.online}
			{#if data.pendingRequests.length === 0 || data.activeTrip}
				<Button variant="ghost" size="lg" fullWidth onclick={goOffline}>Go offline</Button>
			{:else}
				<Button variant="ghost" size="sm" fullWidth onclick={goOffline}>Go offline</Button>
			{/if}
		{:else}
			<Button variant="primary" size="lg" fullWidth onclick={goOnline}>Go online</Button>
		{/if}
	</div>
</div>
