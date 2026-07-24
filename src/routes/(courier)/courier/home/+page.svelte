<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import Button from '$lib/components/ui/Button.svelte';
	import MapBackdrop from '$lib/components/MapBackdrop.svelte';
	import { courierOnline } from '$lib/stores/courier-online';
	import { KUMASI_CENTER } from '$lib/geo/service-area';

	export let data: {
		profile: { name: string; initials: string };
		activeTrip: {
			id: string;
			status: 'assigned' | 'en_route' | 'arrived' | 'delivered' | 'cancelled' | 'searching';
			businessName: string;
			pickupAddress: string;
			dropoffAddress: string;
			pickupLat: number | null;
			pickupLng: number | null;
			dropoffLat: number | null;
			dropoffLng: number | null;
			notes: string | null;
			estimatedPayout: number;
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
			walletBalance: number;
			completedTrips: number;
			tripsToday: number;
			totalDistanceKm: number;
			activeTrips: number;
		};
	};

	let acceptingId: string | null = null;
	let decliningId: string | null = null;
	let refreshTimer: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		courierOnline.hydrate();
		refreshTimer = setInterval(() => {
			void invalidateAll();
		}, 5000);
	});

	onDestroy(() => {
		if (refreshTimer) clearInterval(refreshTimer);
	});

	$: currentRequest = data.pendingRequests[0] ?? null;
	$: heroTrip = data.activeTrip ?? currentRequest;
	$: pickupPoint =
		heroTrip?.pickupLat != null && heroTrip?.pickupLng != null
			? { lat: heroTrip.pickupLat, lng: heroTrip.pickupLng }
			: KUMASI_CENTER;
	$: dropoffPoint =
		heroTrip?.dropoffLat != null && heroTrip?.dropoffLng != null
			? { lat: heroTrip.dropoffLat, lng: heroTrip.dropoffLng }
			: null;
	$: routePath = pickupPoint && dropoffPoint ? [pickupPoint, dropoffPoint] : [];
	$: statusLabel = !$courierOnline
		? 'Offline'
		: data.activeTrip
			? data.activeTrip.status === 'en_route'
				? 'On the way'
				: data.activeTrip.status === 'arrived'
					? 'Arrived'
					: 'Active trip'
			: 'Online';

	async function acceptRequest(requestId: string) {
		if (acceptingId || !$courierOnline) return;

		acceptingId = requestId;
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
				goto(`/courier/pickup?tripId=${encodeURIComponent(payload.tripId)}`);
			}
		} finally {
			acceptingId = null;
		}
	}

	async function declineRequest(requestId: string) {
		if (decliningId || !$courierOnline) return;

		decliningId = requestId;
		try {
			const response = await fetch('/api/courier/decline-trip', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tripId: requestId })
			});

			if (!response.ok) {
				throw new Error('Unable to decline request');
			}

			goto('/courier/home');
		} finally {
			decliningId = null;
		}
	}

	function openActiveTrip() {
		if (!data.activeTrip) return;
		const route = data.activeTrip.status === 'en_route' ? '/courier/deliver' : '/courier/pickup';
		goto(`${route}?tripId=${encodeURIComponent(data.activeTrip.id)}`);
	}

	function goOnline() {
		courierOnline.goOnline();
	}

	function goOffline() {
		courierOnline.goOffline();
	}
</script>

<svelte:head>
	<title>Home | YADA Courier</title>
</svelte:head>

<div class="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-bg">
	<div class="absolute inset-0">
		<MapBackdrop
			routeLabel={!!$courierOnline && !!heroTrip}
			center={$courierOnline ? pickupPoint : KUMASI_CENTER}
			markers={$courierOnline && heroTrip
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
			polylinePath={$courierOnline ? routePath : []}
		/>

		<div class="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-4">
			<div
				class="pointer-events-auto max-w-sm rounded-xl border border-border bg-surface/95 px-4 py-3 text-center shadow-md backdrop-blur-sm"
				in:fade={{ duration: 160 }}
			>
				{#if $courierOnline}
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
					{:else if currentRequest}
						<p class="mt-2 text-sm font-semibold text-ink">{currentRequest.businessName}</p>
						<p class="mt-0.5 text-xs text-ink-secondary">
							{currentRequest.pickupAddress} → {currentRequest.dropoffAddress}
						</p>
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
		{#if $courierOnline && data.activeTrip}
			<div class="rounded-2xl border border-border bg-surface/95 p-3 shadow-sm backdrop-blur-sm">
				<div class="flex items-center justify-between gap-3">
					<div>
						<p class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
							Active trip
						</p>
						<p class="font-mono-data text-sm font-bold text-primary">
							${data.activeTrip.estimatedPayout.toFixed(2)}
						</p>
					</div>
					<Button variant="primary" size="sm" on:click={openActiveTrip}>Continue trip</Button>
				</div>
			</div>
		{:else if $courierOnline && currentRequest}
			<div class="rounded-2xl border border-border bg-surface/95 p-3 shadow-sm backdrop-blur-sm">
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
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
							on:click={() => declineRequest(currentRequest.id)}
						>
							{decliningId === currentRequest.id ? 'Declining…' : 'Decline'}
						</Button>
						<Button
							variant="primary"
							size="sm"
							disabled={acceptingId === currentRequest.id}
							on:click={() => acceptRequest(currentRequest.id)}
						>
							{acceptingId === currentRequest.id ? 'Accepting…' : 'Accept'}
						</Button>
					</div>
				</div>
			</div>
		{:else if $courierOnline}
			<p class="text-center text-sm text-ink-secondary">Today: {data.summary.tripsToday} deliveries</p>
		{/if}

		{#if $courierOnline}
			<Button variant="ghost" size="lg" fullWidth on:click={goOffline}>Go offline</Button>
		{:else}
			<Button variant="primary" size="lg" fullWidth on:click={goOnline}>Go online</Button>
		{/if}
	</div>
</div>
