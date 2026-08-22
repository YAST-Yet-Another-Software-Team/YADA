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
	import ClosedAccountTag from '$lib/components/ClosedAccountTag.svelte';
	import { KUMASI_CENTER, distanceToPolylineKm } from '$lib/shared/geo/service-area';
	import { isWithinRange, metresBetween, PICKUP_PROXIMITY_KM } from '$lib/shared/geo/proximity';
	import { createHeadingTracker } from '$lib/shared/geo/heading';
	import type { LatLng } from '$lib/utils/types';
	import { computeDrivingRoute, OFF_ROUTE_THRESHOLD_KM } from '$lib/client/maps/routing';
	import { getMapsConfig } from '$lib/client/maps/maps-config.svelte';
	import { getSoundAlerts } from '$lib/client/sound-alerts.svelte';
	import {
		isRealtimeEnabled,
		joinTripRoom,
		leaveTripRoom,
		LOCATION_STALE_MS,
		onRiderLocation,
		setRealtimeEnabled
	} from '../realtime';
	import IconChevronLeft from '~icons/mdi/chevron-left';
	import IconBell from '~icons/mdi/bell-outline';
	import IconBellOff from '~icons/mdi/bell-off-outline';
	import IconPhone from '~icons/mdi/phone';
	import IconMessage from '~icons/mdi/message-text-outline';
	import IconArrowRight from '~icons/mdi/arrow-right';
	import IconStar from '~icons/mdi/star';
	import IconCheck from '~icons/mdi/check';
	import {
		DISPATCH_TIMEOUT_SECONDS,
		dispatchRemaining,
		ringForElapsed,
		ringReach
	} from '$lib/shared/dispatch';
	import { isCancellableByBusiness, isPickupPhase, toDispatchStage } from '$lib/shared/trip-status';
	import { formatCedis } from '$lib/shared/text';
	import { formatPhone } from '$lib/shared/phone';
	import { formatPlate } from '$lib/shared/plate';
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
		completedAt?: string | null;
		assignedCourierId?: string | null;
		courier?: CourierSummary | null;
		orderName?: string | null;
		orderPrice?: number | null;
		/** A rider took this and let it go again before reaching the counter. */
		releasedByCourier?: boolean;
	};

	const alerts = getSoundAlerts();

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
	let riderHeading = $state<number | null>(null);

	/**
	 * Which way the rider is pointing.
	 *
	 * The fix carries the courier's own heading when their phone had one, and the
	 * tracker falls back to the bearing between the last two fixes when it did
	 * not — which is every fix from a rider whose device reports no heading, and
	 * every fix on the polled path, where only a position is stored.
	 */
	const heading = createHeadingTracker();
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
	/** Mirrors the rule `POST /api/trips/cancel` enforces: until the rider arrives. */
	const canCancel = $derived(trip != null && isCancellableByBusiness(trip.status));

	/** The 60-second search ran out with nobody accepting; only a re-ring restarts it. */
	const dispatchExpired = $derived(
		searching && !closed && dispatchElapsed != null && dispatchElapsed > DISPATCH_TIMEOUT_SECONDS
	);

	/**
	 * Riders are being ringed *right now* — the only state anything on this screen
	 * is allowed to animate in.
	 *
	 * Distinct from `searching`, which stays true after the dispatch window closes
	 * because the trip is still unassigned. Animating on `searching` alone kept the
	 * pulse running under "No rider accepted in time", which reads as a search
	 * still in progress and makes the re-ring button look redundant. Anything that
	 * moves belongs to this flag, not to `searching`.
	 */
	const matching = $derived(searching && !closed && !dispatchExpired);

	/**
	 * The search, abstracted to the two things a business can act on: it is still
	 * running, and it is reaching further than it was.
	 *
	 * What used to sit here was the radius in metres and a seconds countdown.
	 * Both were accurate and neither was theirs to act on — together they
	 * published the dispatcher's rings and its timeout to anyone watching the
	 * screen, which is a specification of how long to stall and how far to stand
	 * back to stay unrung. `reach` drives the pulse and the zoom, `remaining`
	 * drives the bar, and neither carries a number to the page.
	 */
	const searchRemaining = $derived(
		// Full, not empty, before the first poll answers: `dispatchElapsed` is null
		// for the moment between the page mounting and the server saying how long
		// this request has been running, and a bar that starts at zero and jumps
		// back to full is a worse lie than one that starts full.
		dispatchElapsed == null ? 1 : dispatchRemaining(dispatchElapsed)
	);
	const searchReach = $derived(dispatchRing ? ringReach(dispatchRing.index) : 0);

	/**
	 * How far the pickup marker's rings throw, and how far back the camera sits,
	 * as the search widens. Both interpolate off the same 0–1 `searchReach`, so
	 * the map opening out and the pulse reaching further are one gesture.
	 *
	 * The rings throw 5.1→9.9 while the camera runs 17.5→15 — a two-and-a-half
	 * level pull-back, held over the counter the whole way (see `mapCentre`).
	 * Most of the widening is the pulse; the frame easing back under it is only
	 * the view making room, which is the division of labour these two have been
	 * converging on across every retune.
	 *
	 * Both are straight lines in `searchReach`, so the middle ring lands exactly
	 * halfway: 16.25 on the camera, 7.5 on the rings. `searchReach` is itself an
	 * even 0 / 0.5 / 1 across the three ring steps, so "linear in reach" and
	 * "even per ring" are the same statement here.
	 *
	 * Nothing on screen states a distance at any point in that span. The rings
	 * are screen-space, a fixed multiple of the marker, so they measure no
	 * ground at any zoom — which is what lets the camera move freely without the
	 * match radius ever becoming legible.
	 */
	const searchPulseScale = $derived(5.1 + searchReach * 4.8);
	const searchZoom = $derived(matching ? 17.5 - searchReach * 2.5 : null);


	/**
	 * Where the camera sits.
	 *
	 * While the request is unassigned that is the pickup, dead centre: the pulse
	 * radiates from that marker and the search is *about* that address, so
	 * framing anywhere else leaves the one thing happening off to one side. This
	 * used to centre on the dropoff throughout, which put the counter and its
	 * rings near the edge for the whole search.
	 *
	 * Once a rider is assigned the old behaviour takes back over, and `fitIds`
	 * takes the camera off this entirely — from then on what is being watched is
	 * the gap between rider and counter closing, which is a frame, not a point.
	 */
	const mapCentre = $derived(
		searching && trip
			? { lat: trip.pickupLat, lng: trip.pickupLng }
			: (riderPoint ?? (trip ? { lat: trip.dropoffLat, lng: trip.dropoffLng } : KUMASI_CENTER))
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
		if (!maps.routingEnabled) return;

		try {
			const route = await computeDrivingRoute(origin, destination, { force: true });
			routePath = route.path;
			etaText = route.durationText;
		} catch {
			etaText = 'Unavailable';
		}
	}

	/**
	 * The three moments in a delivery worth interrupting someone for: a rider took
	 * it, a rider is at the counter, and the parcel has landed. Everything else on
	 * this screen is a detail of a journey already under way.
	 *
	 * `previous` is null on the very first read, which is what keeps merely opening
	 * the screen on a trip already in progress silent — a bell on every page load
	 * teaches people to ignore the bell.
	 *
	 * `arrived` rides along with `courier_arriving`: nothing writes it any more,
	 * but rows from before the pickup phase was split still carry it.
	 */
	const ANNOUNCED_STATUSES = new Set<TripStatus>([
		'accepted',
		'courier_arriving',
		'arrived',
		'completed'
	]);

	function announceStatusChange(previous: TripStatus | null, next: TripStatus) {
		if (!previous || previous === next) return;
		if (ANNOUNCED_STATUSES.has(next)) alerts.notify();
	}

	async function loadTrip(tripId: string) {
		try {
			const response = await fetch(`/api/trips?id=${encodeURIComponent(tripId)}`);
			const payload = await response.json().catch(() => null);

			if (!response.ok || !payload?.trip) {
				loadError = payload?.message ?? 'We could not find that request.';
				return false;
			}

			// Read before the assignment below overwrites it. Svelte re-renders from
			// whatever the current status is; nothing anywhere else notices the
			// moment it *changed*, which is the only thing worth a sound.
			const previousStatus = trip?.status ?? null;

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
				completedAt: payload.trip.completedAt ?? null,
				assignedCourierId: payload.trip.assignedCourierId ?? null,
				courier: payload.trip.courier ?? null,
				orderName: payload.trip.orderName ?? null,
				orderPrice: payload.trip.orderPrice ?? null,
				releasedByCourier: payload.trip.releasedByCourier === true
			};
			myRating = payload.trip.myRating ?? null;
			dispatchElapsedBase = payload.trip.dispatchElapsedSeconds ?? null;
			dispatchFetchedAt = Date.now();
			loadError = '';

			announceStatusChange(previousStatus, trip.status);

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
					// Through the tracker, so the first live fix has something to take
					// a bearing from rather than starting a step behind.
					riderHeading = heading.next(riderPoint);
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
		riderHeading = heading.next(riderPoint, payload.heading);
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

	/* --------------------------------------------------- riders nearby */

	/**
	 * The other online riders, drawn while the request is still unassigned.
	 *
	 * The same "cars on the map" the /request screen opens with, carried through
	 * to the wait — a business watching a search wants to know there is supply
	 * behind it, and an empty map during a search says the opposite of what the
	 * pulse is saying. They vanish the moment someone accepts: from then on the
	 * only rider that matters is the one coming, and leaving the rest on screen
	 * would make it a guess which dot to watch.
	 *
	 * Anonymous by construction. `GET /api/couriers/nearby` returns an opaque
	 * per-process ref and a position rounded to about eleven metres — never a
	 * name, a rating, or an id that lines up with anything else in the API — so
	 * this shows supply without showing people. It also centres on the
	 * business's *stored* address rather than anything sent from here, which for
	 * an ordinary request is the pickup being searched around.
	 */
	type NearbyCourier = { ref: string; lat: number; lng: number; minutesAway: number };

	let nearby = $state<NearbyCourier[]>([]);
	let nearbyTimer: ReturnType<typeof setInterval> | undefined;

	/** Matches the /request screen: live enough to read, quiet enough to leave on. */
	const NEARBY_POLL_MS = 10_000;

	async function refreshNearby() {
		try {
			const response = await fetch('/api/couriers/nearby');
			const payload = await response.json().catch(() => null);
			if (!response.ok || !payload?.ok) return;

			nearby = payload.couriers ?? [];
		} catch {
			// A dropped poll holds the last positions until the next one lands.
		}
	}

	/**
	 * Poll only while there is something to poll for.
	 *
	 * Keyed on the same `searching && !closed` that gates the markers, so the
	 * request stops the moment a rider accepts rather than continuing to ask
	 * about riders nobody is going to see. `$effect` rather than a branch inside
	 * the existing interval: this way acceptance tears the timer down instead of
	 * leaving it running and discarding every answer.
	 */
	$effect(() => {
		const wanted = searching && !closed;

		if (!wanted) {
			if (nearbyTimer) clearInterval(nearbyTimer);
			nearbyTimer = undefined;
			nearby = [];
			return;
		}

		void refreshNearby();
		nearbyTimer = setInterval(() => void refreshNearby(), NEARBY_POLL_MS);

		return () => {
			if (nearbyTimer) clearInterval(nearbyTimer);
			nearbyTimer = undefined;
		};
	});

	/**
	 * One marker per available rider, under the pickup and dropoff pins so the
	 * two ends of the job still read on top of the supply behind them.
	 *
	 * `minutesAway` rather than a distance in the hover title, for the reason the
	 * search copy carries no radius: a time is what a business is waiting on, and
	 * a distance is a fact about the dispatcher.
	 */
	const nearbyMarkers = $derived(
		searching && !closed
			? nearby.map((courier) => ({
					id: `nearby-${courier.ref}`,
					lat: courier.lat,
					lng: courier.lng,
					label: `Rider · about ${courier.minutesAway} min away`,
					role: 'rider' as const
				}))
			: []
	);

	/**
	 * The riders the camera must not crop, handed to `contain` rather than to
	 * `fitIds`.
	 *
	 * The difference is the whole point: framing pickup-and-riders together
	 * would put the middle of *that set* in the middle of the screen, sliding
	 * the counter off to whichever side the riders happened to be. `contain`
	 * only loosens the zoom, so the counter stays centred and the span above
	 * stays the tightest the camera will go — a rider already inside the frame
	 * costs nothing, and one outside it opens the view exactly far enough.
	 *
	 * Empty once someone accepts, along with the markers themselves, which hands
	 * the camera back to the ring span alone.
	 */
	const searchContain = $derived(
		nearbyMarkers.map((rider) => ({ lat: rider.lat, lng: rider.lng }))
	);

	const markers = $derived(
		trip
			? [
					// First, so they sit *under* the two ends of the job and the rider
					// coming: supply is the backdrop to this screen, never the subject.
					// Empty from the moment someone accepts, which is what leaves the
					// assigned rider below as the only one on the map.
					...nearbyMarkers,
					{
						// The pickup *is* the business, and this is the slot a custom
						// business marker drops into when there is one.
						id: 'pickup',
						lat: trip.pickupLat,
						lng: trip.pickupLng,
						label: trip.pickupAddress,
						role: 'business' as const,
						// Rings while the request is still ringing riders: the search
						// radiates from this counter, and the map is the only place that
						// can show it happening. It stops the moment someone accepts —
						// or the moment the dispatch window closes with nobody.
						pulse: matching,
						// Throws further as the dispatcher widens, so the map shows the
						// search reaching out without ever stating how far.
						pulseScale: searchPulseScale
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
									heading: riderHeading,
									stale: riderStale
								}
							]
						: [])
				]
			: []
	);

	const statusLabel = $derived(trip ? STATUS_LABELS[trip.status] : 'Loading…');

	/** Delivery time in the viewer's own clock, for the completion screen. */
	const completedTime = $derived(
		trip?.completedAt
			? new Date(trip.completedAt).toLocaleTimeString(undefined, {
					hour: 'numeric',
					minute: '2-digit'
				})
			: null
	);

	/**
	 * A delivered trip stops being a map. On a phone the screen becomes the
	 * receipt for it — what was delivered, by whom, and the one prompt worth
	 * asking at that moment — because there is nothing left to watch move.
	 */
	const delivered = $derived(trip?.status === 'completed');

	/** The order number as the rest of the workspace prints it. */
	const shortId = $derived(trip ? `YD-${trip.id.slice(0, 4).toUpperCase()}` : '—');
</script>

<svelte:head>
	<title>Tracking | YADA</title>
</svelte:head>

<!-- Full-bleed, like `/request`: the layout hands this page the height left under
     the header, so there is no card frame to draw and no viewport arithmetic to
     do here — `flex-1` takes what's left and `min-h-0` lets the map shrink into
     it instead of overflowing. -->
<!-- The rating exchange, in one place: the phone shows it on the completion
     screen, the desktop in the column beside the map, and neither should be able
     to drift from the other. -->
{#snippet ratingBlock()}
	{#if myRating != null}
		<div class="flex items-center justify-between gap-3">
			<p class="text-sm font-semibold text-ink">Your rating</p>
			<RatingStars value={myRating} readonly size={20} />
		</div>
	{:else}
		<p class="text-sm font-semibold text-ink">
			How was {trip?.courier?.name ?? 'your rider'}?
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
{/snippet}

<div class="relative flex min-h-0 flex-1 flex-col bg-surface lg:flex-row lg:overflow-hidden">
	{#if delivered}
		<!-- Phone-only completion screen. The desktop keeps map-and-column, where
		     the operator is watching several jobs at once and this one closing is
		     an update rather than the whole screen. -->
		<section
			class="rise flex min-h-0 flex-1 flex-col overflow-y-auto bg-bg px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-10 lg:hidden"
		>
			<div class="mx-auto flex w-full max-w-sm flex-1 flex-col items-center text-center">
				<span
					class="flex h-16 w-16 items-center justify-center rounded-full bg-success-subtle text-success"
				>
					<IconCheck class="h-9 w-9" aria-hidden="true" />
				</span>
				<h1 class="mt-4 text-2xl font-bold text-ink">Delivered</h1>
				<p class="mt-1 text-sm text-ink-secondary">{trip?.dropoffAddress}</p>

				<dl
					class="mt-6 w-full space-y-2.5 rounded-lg border border-border bg-surface p-4 text-left text-sm shadow-xs"
				>
					<div class="flex items-center justify-between gap-3">
						<dt class="text-ink-secondary">Order</dt>
						<dd class="font-mono-data text-ink">{shortId}</dd>
					</div>
					<div class="flex items-center justify-between gap-3">
						<dt class="text-ink-secondary">Rider</dt>
						<dd class="min-w-0 truncate text-ink">{trip?.courier?.name ?? '—'}</dd>
					</div>
					<div class="flex items-center justify-between gap-3">
						<dt class="text-ink-secondary">Delivered</dt>
						<dd class="font-mono-data text-ink">{completedTime ?? '—'}</dd>
					</div>
				</dl>

				{#if trip?.courier}
					<div
						class="mt-3 flex w-full flex-col gap-3 rounded-lg border border-border bg-surface p-4 text-left shadow-xs"
					>
						{@render ratingBlock()}
					</div>
				{/if}

				<div class="flex-1 pt-6"></div>

				<div class="w-full space-y-2">
					<Button variant="primary" size="lg" fullWidth onclick={() => goto('/dashboard')}>
						Back to dashboard
					</Button>
					<Button variant="neutral" size="sm" fullWidth onclick={() => goto('/history')}>
						View in history
					</Button>
				</div>
			</div>
		</section>
	{/if}

	<div class="relative min-h-[40svh] flex-1 lg:min-h-0 {delivered ? 'hidden lg:block' : ''}">
		<div class="absolute left-4 top-4 z-10 lg:hidden">
			<IconButton ariaLabel="Back" onclick={() => goto('/dashboard')}>
				<IconChevronLeft class="h-5 w-5" aria-hidden="true" />
			</IconButton>
		</div>

		<!-- The only off switch for the alert bell on this side: the business
		     workspace has no settings screen, and a sound someone cannot silence
		     from where they hear it is one they will silence at the operating
		     system instead — losing every other alert with it. -->
		<div class="absolute right-4 top-4 z-10">
			<IconButton
				ariaLabel={alerts.enabled ? 'Mute delivery alerts' : 'Unmute delivery alerts'}
				onclick={() => alerts.set(!alerts.enabled)}
			>
				{#if alerts.enabled}
					<IconBell class="h-5 w-5" aria-hidden="true" />
				{:else}
					<IconBellOff class="h-5 w-5" aria-hidden="true" />
				{/if}
			</IconButton>
		</div>

		<!-- Focus follows the job. While the request is open the destination is the
		     only thing to look at; the moment a rider takes it the map frames the
		     rider *and* this counter together, because what the sender is watching
		     is the gap between the two closing. The only line drawn is the rider's
		     run to the counter — the dashed pickup→dropoff hint that used to sit
		     under it is gone: it competed with the leg actually being watched, and
		     it described a journey nobody has started. The dropoff keeps its
		     marker, so where the parcel goes next is still on the map. -->
		<MapBackdrop
			center={mapCentre}
			{markers}
			polylinePath={routePath}
			fitIds={searching ? [] : ['rider', 'pickup']}
			locationUnavailable={!searching && riderStale}
			zoom={searchZoom}
			contain={searchContain}
		>
			{#if searching && !closed}
				<!-- Desktop only: on a phone the sheet below already narrates the
				     search, and a second copy of it would collide with the back
				     button. -->
				<div
					class="absolute left-1/2 top-4 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-surface/95 px-3 py-2 text-sm text-ink-secondary shadow-sm lg:block"
				>
					{#if dispatchExpired}
						No rider accepted — ring again from the panel.
					{:else}
						Looking for a rider near {trip?.pickupAddress ?? 'you'}…
					{/if}
				</div>
			{/if}
		</MapBackdrop>
	</div>

	<!-- Mobile keeps the sheet look, because there the panel sits *over* the map
	     and needs an edge to read as lifted off it — the same 28px lip the
	     courier screens use. On desktop it's a column beside the map, so it
	     scrolls itself rather than growing the page. -->
	<aside
		style="--rise-delay: 90ms"
		class="rise z-10 flex flex-col gap-4 rounded-t-[28px] border-t border-border bg-surface p-5 shadow-lg lg:w-[320px] lg:shrink-0 lg:overflow-y-auto lg:rounded-none lg:border-t-0 lg:p-6 lg:shadow-none {delivered
			? 'hidden lg:flex'
			: ''}"
	>
		{#if loadError}
			<Alert>{loadError}</Alert>
		{/if}
		{#if actionError}
			<Alert>{actionError}</Alert>
		{/if}

		{#if searching && !closed}
			<!-- Matching. Nobody has taken the job, so there is no rider to show and
			     no ETA to give: the sheet says what is happening and offers the one
			     thing that can be done about it. Centred on a phone, where it's the
			     whole screen; left-aligned in the desktop column, where it isn't. -->
			<div class="flex flex-1 flex-col items-center gap-3 py-2 text-center lg:items-start lg:py-0 lg:text-left">
				<StatusPill status="searching" pulse={matching} />
				<div>
					<p class="text-lg font-semibold text-ink lg:text-base">Finding a rider near you</p>
					<!-- Small on purpose. A rider dropping out before the counter is
					     ordinary, and the request is already back out to everyone else
					     — this says why the search restarted, not that anything broke. -->
					{#if trip?.releasedByCourier && !dispatchExpired}
						<p class="mt-1 text-sm text-ink-secondary">
							The last rider dropped this job — we're ringing others.
						</p>
					{/if}
					<p class="mt-1 text-sm text-ink-secondary">
						{#if dispatchExpired}
							No rider accepted in time. Ring again, or cancel the request.
						{:else}
							<!-- "Usually under a minute" used to close this line. The bar
							     below now says how long is left without naming it, and
							     leaving the phrase in would have restated the window in
							     words a moment after taking it out of digits. -->
							Ringing riders near your pickup.
						{/if}
					</p>
				</div>

				<!-- The search window, as a bar draining right to left.
				     `aria-hidden` because it is the countdown it replaced, drawn: a
				     screen reader that announced a value here would be reading out
				     the timeout this stopped printing. The sentence above already
				     says a search is running, and the copy that matters — that it
				     ran out, and what to do — is text when it happens. -->
				{#if matching}
					<div class="h-1.5 w-full overflow-hidden rounded-full bg-primary-subtle" aria-hidden="true">
						<!-- Anchored left, so the fill's right edge retreats leftward as
						     the window drains. The direction is the point: a bar growing
						     from the left would read as progress being made rather than
						     as time being spent. -->
						<div
							class="dispatch-fill h-full rounded-full bg-primary"
							style="width: {searchRemaining * 100}%"
						></div>
					</div>
				{/if}

				<p class="hidden w-full min-w-0 items-center gap-1.5 text-sm text-ink-secondary lg:flex">
					<span class="min-w-0 truncate">{trip?.pickupAddress ?? 'Pickup'}</span>
					<IconArrowRight class="h-4 w-4 shrink-0 text-ink-tertiary" aria-label="to" />
					<span class="min-w-0 truncate">{trip?.dropoffAddress ?? 'Dropoff'}</span>
				</p>
			</div>

			<div class="flex w-full flex-col gap-2">
				{#if dispatchExpired && canCancel}
					<!-- The 60-second search failed; per the spec the request is remade
					     manually. Declines persist — riders who said no stay unrung. -->
					<Button variant="primary" size="lg" fullWidth disabled={retrying} onclick={retryDispatch}>
						{retrying ? 'Ringing…' : 'Ring riders again'}
					</Button>
				{/if}
				{#if canCancel}
					<Button variant="outline" size="sm" fullWidth disabled={cancelling} onclick={cancelRequest}>
						{cancelling ? 'Cancelling…' : 'Cancel request'}
					</Button>
				{/if}
			</div>
		{:else}
			<StatusPill status={toDispatchStage(trip?.status ?? 'requested')} />

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
					{#if trip?.courier?.isDeleted}
						<ClosedAccountTag compact />
					{/if}
				</p>
				<p class="text-sm text-ink-secondary">{statusLabel}</p>
				{#if trip?.courier}
					<p class="flex items-center gap-1 text-xs text-ink-tertiary">
						<!-- The plate, not the vehicle type: every YADA courier rides a
						     motorbike, so "Motorbike" told the counter nothing they could
						     check. The plate is what pulls up outside. -->
						<span class={trip.courier.plateNumber ? 'font-mono-data' : ''}>
							{formatPlate(trip.courier.plateNumber) || trip.courier.vehicleType || 'Rider'}
						</span>
						{#if trip.courier.rating}
							<span aria-hidden="true">·</span>
							<IconStar class="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
							<span>{trip.courier.rating.toFixed(1)} ({trip.courier.ratingCount})</span>
						{:else}
							<span>· not yet rated</span>
						{/if}
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
			<p class="flex items-center gap-1.5 text-sm text-ink-secondary">
				<span class="min-w-0 truncate">{trip?.pickupAddress ?? 'Pickup'}</span>
				<IconArrowRight class="h-4 w-4 shrink-0 text-ink-tertiary" aria-label="to" />
				<span class="min-w-0 truncate">{trip?.dropoffAddress ?? 'Dropoff'}</span>
			</p>
		</div>

		<!-- What is in the parcel, on the sender's screen only: the rider is
		     carrying it either way, and a value on their phone is a reason to be
		     robbed for it. The API leaves both fields out of their copy. -->
		{#if trip?.orderName}
			<div class="border-t border-border pt-3">
				<p class="text-eyebrow text-ink-tertiary">Order</p>
				<p class="mt-1 flex items-baseline justify-between gap-3 text-sm">
					<span class="min-w-0 truncate text-ink">{trip.orderName}</span>
					<span class="font-mono-data shrink-0 text-ink-secondary">
						{formatCedis(trip.orderPrice)}
					</span>
				</p>
			</div>
		{/if}

		{#if !searching && !closed && trip?.courier?.phone}
			<!-- Real links, not decoration: the number belongs to the rider actually
			     carrying this parcel. -->
			<div class="flex items-center gap-3">
				<a
					href="tel:{trip.courier.phone}"
					class="inline-flex h-10 w-10 items-center justify-center rounded-full border-md border-primary text-primary transition-colors hover:bg-primary-subtle"
					aria-label="Call {trip.courier.name}"
				>
					<IconPhone class="h-[18px] w-[18px]" aria-hidden="true" />
				</a>
				<!-- Grouped for reading and reading back; the button beside it dials
				     the stored E.164 number, which is what a dialler wants. -->
				<p class="font-mono-data text-sm text-ink-secondary">{formatPhone(trip.courier.phone)}</p>
			</div>
		{/if}

		<div class="mt-auto flex flex-col gap-2 lg:pt-4">
			{#if canCancel}
				<!-- Still callable off: the rider has accepted but hasn't reached the
				     counter, so nobody is standing at the shop for this yet. The
				     button disappears the moment they arrive — from there it is a
				     conversation, not a control. -->
				<Button variant="outline" size="sm" disabled={cancelling} onclick={cancelRequest}>
					{cancelling ? 'Cancelling…' : 'Cancel delivery'}
				</Button>
			{/if}

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
			{:else if closed}
				{#if trip?.status === 'completed'}
					<!-- The prompt lands at the moment of delivery (SRS 2.2.1.5), while
					     the trip is still on screen and the rider still has a face. -->
					<div class="flex flex-col gap-3 border-t border-border pt-4">
						{@render ratingBlock()}
					</div>
				{/if}
				<Button variant="neutral" size="sm" onclick={() => goto('/history')}>View in history</Button>
			{/if}
			</div>
		{/if}
	</aside>
</div>

<style>
	/*
	 * The dispatch bar's motion only. Its colours are utility classes on the
	 * elements themselves: the palette tokens in tailwind.config are functions
	 * (see `withAlpha`), so `theme()` cannot resolve them from a stylesheet.
	 *
	 * The width is re-assigned once a second by the same local ticker that
	 * carries the dispatch clock between polls, so this transition is what makes
	 * the bar a slide rather than a series of steps. `linear` for the reason a
	 * clock hand is: any easing would be the bar implying something about the
	 * shape of the wait.
	 */
	.dispatch-fill {
		transition: width 1s linear;
	}

	/* Someone who asked for reduced motion still gets the bar, and it still
	   drains — it just arrives at each new width instead of travelling there. */
	@media (prefers-reduced-motion: reduce) {
		.dispatch-fill {
			transition: none;
		}
	}
</style>
