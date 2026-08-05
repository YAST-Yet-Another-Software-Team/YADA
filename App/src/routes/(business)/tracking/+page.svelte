<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onDestroy, onMount, untrack } from 'svelte';
	import MapBackdrop from '$lib/components/MapBackdrop.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Button from '$lib/components/Button.svelte';
	import IconButton from '$lib/components/IconButton.svelte';
	import RatingStars from '$lib/components/RatingStars.svelte';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import { KUMASI_CENTER, distanceToPolylineKm } from '$lib/shared/geo/service-area';
	import { isWithinRange, metresBetween, PICKUP_PROXIMITY_KM } from '$lib/shared/geo/proximity';
	import type { LatLng } from '$lib/utils/types';
	import { computeDrivingRoute, OFF_ROUTE_THRESHOLD_KM } from '$lib/client/maps/routing';
	import { getMapsConfig } from '$lib/client/maps/maps-config.svelte';
	import {
		isRealtimeEnabled,
		joinTripRoom,
		leaveTripRoom,
		LOCATION_STALE_MS,
		onRiderLocation,
		setRealtimeEnabled
	} from '../realtime';
	import { DISPATCH_TIMEOUT_SECONDS, ringForElapsed, ringLabel } from '$lib/shared/dispatch';
	import { isPickupPhase, toDispatchStage } from '$lib/shared/trip-status';
	import type { CourierSummary, RiderLocationEvent, TripStatus } from '$lib/utils/types';

	type ActiveTrip = {
		id: string;
		status: TripStatus;
		pickupAddress: string;
		dropoffAddress: string;
		pickupLat: number;
		pickupLng: number;
		dropoffLat: number;
		dropoffLng: number;
		estimatedDurationMinutes?: number | null;
		assignedCourierId?: string | null;
		courier?: CourierSummary | null;
	};

	const POLL_MS = 4000;

	// Deployments without a Socket.IO server (Cloudflare Workers) say so through
	// the root layout; without this the client would retry a connection forever.
	// This page is the only consumer of the socket layer, so it is the only place
	// that has to tell it. See DEPLOYMENT.md §5.
	setRealtimeEnabled(page.data.realtimeEnabled !== false);

	const STATUS_LABELS: Record<TripStatus, string> = {
		requested: 'Waiting for a rider',
		accepted: 'Rider on the way to you',
		courier_arriving: 'Rider at your counter',
		arrived: 'Rider at your counter',
		picked_up: 'Collected — waiting for the rider to set off',
		in_progress: 'On the way to the customer',
		completed: 'Delivered',
		cancelled: 'Cancelled'
	};

	let trip = $state<ActiveTrip | null>(null);
	let loadError = $state('');
	let actionError = $state('');
	let riderPoint = $state<LatLng | null>(null);
	let riderStale = $state(false);
	let etaText = $state('—');
	let routePath = $state<LatLng[]>([]);
	let cancelling = $state(false);
	let confirming = $state(false);

	/**
	 * The rating exchange (SRS 2.2.1.5). `myRating` is what the server says this
	 * business already gave — null until they rate, whole stars after — and the
	 * rest is the form being filled in. What's submitted feeds the courier's
	 * rolling average, which the matching rubric ranks by.
	 */
	let myRating = $state<number | null>(null);
	let ratingValue = $state(0);
	let ratingComment = $state('');
	let ratingBusy = $state(false);
	let ratingError = $state('');

	/**
	 * The dispatch clock, as the business watches it. The server sends elapsed
	 * seconds (not a timestamp, so clock skew doesn't lie); a one-second local
	 * ticker carries it between polls so the ring copy moves smoothly.
	 */
	let dispatchElapsedBase = $state<number | null>(null);
	let dispatchFetchedAt = 0;
	let nowTick = $state(Date.now());
	let retrying = $state(false);

	const dispatchElapsed = $derived(
		dispatchElapsedBase == null
			? null
			: dispatchElapsedBase + (nowTick - dispatchFetchedAt) / 1000
	);
	const dispatchRing = $derived(dispatchElapsed != null ? ringForElapsed(dispatchElapsed) : null);
	let unsub: (() => void) | null = null;
	let refreshTimer: ReturnType<typeof setInterval> | undefined;
	let tickTimer: ReturnType<typeof setInterval> | undefined;
	let joinedTripId: string | null = null;
	const maps = getMapsConfig();

	/**
	 * Nobody has taken the job yet. This is the one state a request can be
	 * cancelled from, and — because there is no rider and so no journey — the one
	 * state that draws no route: a line to the destination here would be a
	 * promise about a trip that hasn't started.
	 */
	const searching = $derived(!trip || trip.status === 'requested' || !trip.assignedCourierId);
	const closed = $derived(trip?.status === 'completed' || trip?.status === 'cancelled');
	/** Mirrors the rule `POST /api/trips/cancel` enforces. */
	const canCancel = $derived(trip?.status === 'requested');

	/** The 60-second search ran out with nobody accepting; only a re-ring restarts it. */
	const dispatchExpired = $derived(
		searching && !closed && dispatchElapsed != null && dispatchElapsed > DISPATCH_TIMEOUT_SECONDS
	);

	/**
	 * The pickup phase is still open: a rider is assigned and the parcel hasn't
	 * been handed over. This is the window in which the confirm button exists.
	 */
	const awaitingPickup = $derived(Boolean(trip && !searching && isPickupPhase(trip.status)));

	/**
	 * How far the rider is from the counter, from the position this page is
	 * already receiving. The server re-checks against its own stored fix before
	 * accepting the confirmation, so this only decides what to offer.
	 */
	const riderMetresAway = $derived(
		riderPoint && trip ? metresBetween(riderPoint, { lat: trip.pickupLat, lng: trip.pickupLng }) : null
	);

	const riderAtCounter = $derived(
		Boolean(
			riderPoint &&
				trip &&
				!riderStale &&
				isWithinRange(riderPoint, { lat: trip.pickupLat, lng: trip.pickupLng }, PICKUP_PROXIMITY_KM)
		)
	);

	/**
	 * The one leg this screen draws: the rider's run to the shop, from wherever
	 * they were when they took the job.
	 *
	 * Nothing is drawn after the parcel is collected. Watching a line crawl to
	 * the customer tells the sender nothing they can act on — the delivery is out
	 * of their hands by then — whereas the approach to their own counter is the
	 * thing they're waiting on and have to confirm. Markers carry the rest.
	 *
	 * A key rather than a point, because polling replaces `trip` every few
	 * seconds and a derived coordinate object would look new each time.
	 */
	const legKey = $derived(awaitingPickup ? 'pickup' : '');

	function legTarget(): LatLng | null {
		if (!trip || !legKey) return null;

		return { lat: trip.pickupLat, lng: trip.pickupLng };
	}

	async function drawRoute(origin: LatLng, destination: LatLng) {
		if (!maps.enabled) return;

		try {
			const route = await computeDrivingRoute(maps.apiKey, origin, destination, { force: true });
			routePath = route.path;
			etaText = route.durationText;
		} catch {
			etaText = 'Unavailable';
		}
	}

	async function loadTrip(tripId: string) {
		try {
			const response = await fetch(`/api/trips?id=${encodeURIComponent(tripId)}`);
			const payload = await response.json().catch(() => null);

			if (!response.ok || !payload?.trip) {
				loadError = payload?.message ?? 'We could not find that request.';
				return false;
			}

			trip = {
				id: payload.trip.id,
				status: payload.trip.status,
				pickupAddress: payload.trip.pickupAddress,
				dropoffAddress: payload.trip.dropoffAddress,
				pickupLat: payload.trip.pickupLat,
				pickupLng: payload.trip.pickupLng,
				dropoffLat: payload.trip.dropoffLat,
				dropoffLng: payload.trip.dropoffLng,
				estimatedDurationMinutes: payload.trip.estimatedDurationMinutes,
				assignedCourierId: payload.trip.assignedCourierId ?? null,
				courier: payload.trip.courier ?? null
			};
			myRating = payload.trip.myRating ?? null;
			dispatchElapsedBase = payload.trip.dispatchElapsedSeconds ?? null;
			dispatchFetchedAt = Date.now();
			loadError = '';

			// The stored fix is the rider's last known position — exactly what the map
			// needs at the moment of a match. With a socket listening it is only a
			// seed, since a live fix arrives sooner and should win. Without one it is
			// the only source there is, so it has to be taken on every poll, and
			// through the same handler a live fix takes: the dot moves, and the line
			// is redrawn if the rider has left it.
			const fix = payload.trip.courierLocation;
			if (fix) {
				if (!isRealtimeEnabled()) {
					handleRiderLocation({
						tripId: trip.id,
						lat: fix.lat,
						lng: fix.lng,
						recordedAt: fix.recordedAt
					});
				} else if (!riderPoint) {
					riderPoint = { lat: fix.lat, lng: fix.lng };
					riderStale = Date.now() - new Date(fix.recordedAt).getTime() > LOCATION_STALE_MS;
				}
			}

			if (etaText === '—' && trip.estimatedDurationMinutes) {
				etaText = `${Math.round(trip.estimatedDurationMinutes)} min`;
			}

			return true;
		} catch {
			loadError = 'We lost contact with the server. Retrying…';
			return false;
		}
	}

	function handleRiderLocation(payload: RiderLocationEvent) {
		if (trip && payload.tripId && payload.tripId !== trip.id) return;

		riderPoint = { lat: payload.lat, lng: payload.lng };
		riderStale = Date.now() - new Date(payload.recordedAt).getTime() > LOCATION_STALE_MS;

		const target = legTarget();
		if (!target) return;

		// A fix that lands on the line we already drew changes nothing about the
		// route — only the dot moves. Recomputing on every fix would bill a Routes
		// call every couple of seconds to redraw the same path.
		if (routePath.length > 1 && distanceToPolylineKm(riderPoint, routePath) <= OFF_ROUTE_THRESHOLD_KM) {
			return;
		}

		void drawRoute(riderPoint, target);
	}

	/** Subscribe once a courier is on the trip; there is nothing to listen to before. */
	$effect(() => {
		if (!trip || searching || joinedTripId === trip.id) return;

		joinedTripId = trip.id;
		joinTripRoom(trip.id);
		unsub = onRiderLocation(handleRiderLocation);
	});

	/** No leg being drawn — searching, collected, or over — means no line. */
	$effect(() => {
		if (!legKey) {
			routePath = [];
		}
	});

	// Draw when the leg starts, and stop claiming a live ETA when it ends. Keyed
	// on the leg rather than the position, so an ordinary fix along the same leg
	// doesn't trigger a fresh Routes call.
	$effect(() => {
		legKey;

		untrack(() => {
			if (!legKey) {
				// Nothing is being routed any more, so the last number computed for the
				// run to the shop must not sit there looking like a time to the
				// customer. What's left is the estimate made when the trip was booked.
				etaText = trip?.estimatedDurationMinutes
					? `${Math.round(trip.estimatedDurationMinutes)} min`
					: '—';
				return;
			}

			const target = legTarget();
			if (target && riderPoint) void drawRoute(riderPoint, target);
		});
	});

	/** Whether `etaText` is being recomputed from the rider's position right now. */
	const etaIsLive = $derived(Boolean(legKey));

	async function confirmPickup() {
		if (!trip || confirming) return;

		confirming = true;
		actionError = '';

		try {
			const response = await fetch('/api/trips/confirm-pickup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tripId: trip.id })
			});

			const payload = await response.json().catch(() => null);
			if (!response.ok) {
				actionError = payload?.message ?? 'Could not confirm the pickup.';
			}

			// Either way the trip has moved on or the reason is worth seeing, and
			// both are in the row.
			await loadTrip(trip.id);
		} catch {
			actionError = 'Could not confirm the pickup. Check your connection.';
		} finally {
			confirming = false;
		}
	}

	async function submitRating() {
		if (!trip || ratingValue === 0 || ratingBusy) return;

		ratingBusy = true;
		ratingError = '';

		try {
			const response = await fetch('/api/trips/rate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					tripId: trip.id,
					stars: ratingValue,
					comment: ratingComment.trim() || undefined
				})
			});

			const payload = await response.json().catch(() => null);

			if (!response.ok) {
				// A conflict means another tab beat this one to it — re-read rather
				// than argue, and the stars show up read-only.
				ratingError = payload?.message ?? 'Could not save your rating.';
				if (response.status === 409) await loadTrip(trip.id);
				return;
			}

			myRating = ratingValue;
		} catch {
			ratingError = 'Could not save your rating. Check your connection.';
		} finally {
			ratingBusy = false;
		}
	}

	/** Restart the 60-second search. Declines persist server-side. */
	async function retryDispatch() {
		if (!trip || retrying) return;

		retrying = true;
		actionError = '';

		try {
			const response = await fetch('/api/trips/retry', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tripId: trip.id })
			});

			const payload = await response.json().catch(() => null);
			if (!response.ok) {
				actionError = payload?.message ?? 'Could not restart the search.';
			}

			await loadTrip(trip.id);
		} catch {
			actionError = 'Could not restart the search. Check your connection.';
		} finally {
			retrying = false;
		}
	}

	async function cancelRequest() {
		if (!trip || cancelling) return;

		cancelling = true;
		actionError = '';

		try {
			const response = await fetch('/api/trips/cancel', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tripId: trip.id })
			});

			const payload = await response.json().catch(() => null);
			if (!response.ok) {
				// Most likely a rider accepted between the render and the click, so
				// re-read the trip: the button should disappear rather than lie.
				actionError = payload?.message ?? 'Could not cancel this request.';
				await loadTrip(trip.id);
				return;
			}

			goto('/dashboard');
		} catch {
			actionError = 'Could not cancel this request. Check your connection.';
		} finally {
			cancelling = false;
		}
	}

	onMount(async () => {
		const tripId = page.url.searchParams.get('trip');

		if (!tripId) {
			goto('/request');
			return;
		}

		await loadTrip(tripId);

		refreshTimer = setInterval(() => {
			if (!closed) void loadTrip(tripId);
		}, POLL_MS);

		// One-second heartbeat for the dispatch copy, so the ring narration moves
		// between the 4-second polls instead of jumping with them.
		tickTimer = setInterval(() => {
			nowTick = Date.now();
		}, 1000);
	});

	onDestroy(() => {
		unsub?.();
		if (joinedTripId) leaveTripRoom(joinedTripId);
		if (refreshTimer) clearInterval(refreshTimer);
		if (tickTimer) clearInterval(tickTimer);
	});

	const markers = $derived(
		trip
			? [
					{
						// The pickup *is* the business, and this is the slot a custom
						// business marker drops into when there is one.
						id: 'pickup',
						lat: trip.pickupLat,
						lng: trip.pickupLng,
						label: trip.pickupAddress,
						role: 'business' as const
					},
					{
						id: 'dropoff',
						lat: trip.dropoffLat,
						lng: trip.dropoffLng,
						label: trip.dropoffAddress,
						role: 'dropoff' as const
					},
					...(riderPoint && !searching
						? [
								{
									id: 'rider',
									lat: riderPoint.lat,
									lng: riderPoint.lng,
									label: trip.courier?.name ?? 'Rider',
									role: 'rider' as const,
									stale: riderStale
								}
							]
						: [])
				]
			: []
	);

	const statusLabel = $derived(trip ? STATUS_LABELS[trip.status] : 'Loading…');
</script>

<svelte:head>
	<title>Tracking | YADA</title>
</svelte:head>

<!-- Full-bleed, like `/request`: the layout hands this page the height left under
     the header, so there is no card frame to draw and no viewport arithmetic to
     do here — `flex-1` takes what's left and `min-h-0` lets the map shrink into
     it instead of overflowing. -->
<div class="relative flex min-h-0 flex-1 flex-col bg-surface lg:flex-row lg:overflow-hidden">
	<div class="relative min-h-[40svh] flex-1 lg:min-h-0">
		<div class="absolute left-4 top-4 z-10 lg:hidden">
			<IconButton ariaLabel="Back" onclick={() => goto('/dashboard')}>
				<svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2"
					><path d="m15 18-6-6 6-6" /></svg
				>
			</IconButton>
		</div>

		<!-- Focus follows the job. While the request is open the destination is the
		     only thing to look at; the moment a rider takes it the map centres on
		     them — `followId` pans and closes in on each new fix — because from
		     then until the handover, where that rider is *is* the status. The line
		     under them is their run to the counter, and stops when they get there. -->
		<MapBackdrop
			center={riderPoint ?? (trip ? { lat: trip.dropoffLat, lng: trip.dropoffLng } : KUMASI_CENTER)}
			{markers}
			polylinePath={routePath}
			followId={searching ? null : 'rider'}
			locationUnavailable={!searching && riderStale}
		>
			{#if searching && !closed}
				<div
					class="absolute left-1/2 top-4 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-surface/95 px-3 py-2 text-sm text-ink-secondary shadow-sm"
				>
					{#if dispatchExpired}
						No rider accepted — ring again from the panel.
					{:else if dispatchRing}
						Ringing riders {ringLabel(dispatchRing.radiusKm)}…
					{:else}
						Looking for a rider near {trip?.pickupAddress ?? 'you'}…
					{/if}
				</div>
			{/if}
		</MapBackdrop>
	</div>

	<!-- Mobile keeps the sheet look, because there the panel sits *over* the map
	     and needs an edge to read as lifted off it. On desktop it's a column
	     beside the map, so it scrolls itself rather than growing the page. -->
	<aside
		class="z-10 flex flex-col gap-4 rounded-t-xl border-t border-border bg-surface p-6 shadow-lg lg:w-[320px] lg:shrink-0 lg:overflow-y-auto lg:rounded-none lg:border-t-0 lg:shadow-none"
	>
		<StatusPill status={toDispatchStage(trip?.status ?? 'requested')} />

		{#if loadError}
			<Alert>{loadError}</Alert>
		{/if}
		{#if actionError}
			<Alert>{actionError}</Alert>
		{/if}

		<div class="flex items-center gap-3">
			<!-- SRS 3.3: on acceptance the business sees the courier's name, photo and
			     rating. The photo is whatever they registered with. -->
			<Avatar
				initials={trip?.courier?.initials ?? '··'}
				src={trip?.courier?.image ?? null}
				alt={trip?.courier ? `${trip.courier.name}, your rider` : ''}
				status={searching ? 'offline' : 'online'}
				size={48}
			/>
			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-semibold text-ink">
					{trip?.courier?.name ?? 'No rider yet'}
				</p>
				<p class="text-sm text-ink-secondary">{statusLabel}</p>
				{#if trip?.courier}
					<p class="text-xs text-ink-tertiary">
						{trip.courier.vehicleType ?? 'Rider'}{trip.courier.rating
							? ` · ${trip.courier.rating.toFixed(1)}★ (${trip.courier.ratingCount})`
							: ' · not yet rated'}
					</p>
				{/if}
			</div>
			{#if !searching}
				<p class="font-mono-data text-xl font-semibold leading-tight text-primary lg:hidden">
					{etaText}
				</p>
			{/if}
		</div>

		{#if !searching && !closed}
			<div class="hidden lg:block">
				<p class="font-mono-data text-2xl font-bold text-primary">{etaText}</p>
				<p class="text-xs text-ink-tertiary">
					{etaIsLive ? 'live — rider to your counter' : 'estimated when you booked'}
				</p>
			</div>
		{/if}

		<div class="hidden border-t border-border pt-3 lg:block">
			<p class="text-sm text-ink-secondary">
				{trip?.pickupAddress ?? 'Pickup'} → {trip?.dropoffAddress ?? 'Dropoff'}
			</p>
			{#if searching && !closed}
				<p class="mt-2 text-sm text-ink-secondary">
					We'll draw the route as soon as a rider takes this request.
				</p>
			{/if}
		</div>

		{#if !searching && !closed && trip?.courier?.phone}
			<!-- Real links, not decoration: the number belongs to the rider actually
			     carrying this parcel. -->
			<div class="flex items-center gap-3">
				<a
					href="tel:{trip.courier.phone}"
					class="inline-flex h-10 w-10 items-center justify-center rounded-full border-md border-primary text-primary transition-colors hover:bg-primary-subtle"
					aria-label="Call {trip.courier.name}"
				>
					<svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2"
						><path
							d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z"
						/></svg
					>
				</a>
				<a
					href="sms:{trip.courier.phone}"
					class="inline-flex h-10 w-10 items-center justify-center rounded-full border-md border-primary text-primary transition-colors hover:bg-primary-subtle"
					aria-label="Message {trip.courier.name}"
				>
					<svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2"
						><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg
					>
				</a>
				<p class="font-mono-data text-sm text-ink-secondary">{trip.courier.phone}</p>
			</div>
		{/if}

		<div class="mt-auto flex flex-col gap-2 lg:pt-4">
			{#if awaitingPickup}
				<!-- The pickup phase ends here, on the counter it happens at. -->
				{#if riderAtCounter}
					<Button variant="primary" size="sm" disabled={confirming} onclick={confirmPickup}>
						{confirming ? 'Confirming…' : 'Confirm pickup'}
					</Button>
					<p class="text-xs text-ink-tertiary">
						Hand the parcel over, then confirm. The rider can start the delivery once you do.
					</p>
				{:else}
					<p class="text-sm text-ink-secondary">
						{#if riderMetresAway == null}
							Waiting for the rider's location…
						{:else if riderStale}
							The rider's location is out of date — waiting for a fresh one.
						{:else}
							Rider is {riderMetresAway} m away. You can confirm the pickup once they're here.
						{/if}
					</p>
				{/if}
			{:else if canCancel}
				{#if dispatchExpired}
					<!-- The 60-second search failed; per the spec the request is remade
					     manually. Declines persist — riders who said no stay unrung. -->
					<p class="text-sm text-ink-secondary">
						No rider accepted in time. Ring again, or cancel the request.
					</p>
					<Button variant="primary" size="sm" disabled={retrying} onclick={retryDispatch}>
						{retrying ? 'Ringing…' : 'Ring riders again'}
					</Button>
				{:else if dispatchRing}
					<p class="text-sm text-ink-secondary">
						Ringing riders {ringLabel(dispatchRing.radiusKm)} of your pickup
						<span class="font-mono-data">
							· {Math.max(0, Math.ceil(DISPATCH_TIMEOUT_SECONDS - (dispatchElapsed ?? 0)))}s
						</span>
					</p>
				{/if}
				<Button variant="outline" size="sm" disabled={cancelling} onclick={cancelRequest}>
					{cancelling ? 'Cancelling…' : 'Cancel request'}
				</Button>
			{:else if closed}
				{#if trip?.status === 'completed'}
					<!-- The prompt lands at the moment of delivery (SRS 2.2.1.5), while
					     the trip is still on screen and the rider still has a face. -->
					<div class="flex flex-col gap-3 border-t border-border pt-4">
						{#if myRating != null}
							<div class="flex items-center justify-between gap-3">
								<p class="text-sm font-semibold text-ink">Your rating</p>
								<RatingStars value={myRating} readonly size={20} />
							</div>
						{:else}
							<p class="text-sm font-semibold text-ink">
								How was {trip.courier?.name ?? 'your rider'}?
							</p>
							<RatingStars bind:value={ratingValue} />
							<textarea
								bind:value={ratingComment}
								rows={2}
								maxlength={500}
								placeholder="Anything worth noting? (optional)"
								class="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-disabled focus:border-primary"
							></textarea>
							{#if ratingError}
								<Alert>{ratingError}</Alert>
							{/if}
							<Button
								variant="primary"
								size="sm"
								disabled={ratingValue === 0 || ratingBusy}
								onclick={submitRating}
							>
								{ratingBusy ? 'Saving…' : 'Rate rider'}
							</Button>
						{/if}
					</div>
				{/if}
				<Button variant="neutral" size="sm" onclick={() => goto('/history')}>View in history</Button>
			{/if}
		</div>
	</aside>
</div>
