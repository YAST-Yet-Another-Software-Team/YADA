<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { onDestroy, onMount, untrack } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import Alert from '$lib/components/Alert.svelte';
	import Button from '$lib/components/Button.svelte';
	import IconButton from '$lib/components/IconButton.svelte';
	import MapBackdrop from '$lib/components/MapBackdrop.svelte';
	import { startDeviceLocationWatcher } from '$lib/shared/geo/device-location';
	import { startCourierLocationReporter } from '../location-reporter';
	import { getCourierOnline } from '../courier-online.svelte';
	import { KUMASI_CENTER } from '$lib/shared/geo/service-area';
	import { courierTripHref } from '$lib/shared/trip-status';
	import IconArrowRight from '~icons/mdi/arrow-right';
	import IconClose from '~icons/mdi/close';
	import IconStore from '~icons/mdi/storefront-outline';
	import IconPin from '~icons/mdi/map-marker';
	import IconMotorbike from '~icons/mdi/motorbike';
	import { acceptOffer, countdownLabel, declineOffer, distanceLabel } from '../offers';
	import type { CourierOffer, TripStatus } from '$lib/utils/types';

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
			pendingRequests: CourierOffer[];
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
	let tickTimer: ReturnType<typeof setInterval> | undefined;
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

		// One second, for the offer countdown between board refreshes.
		tickTimer = setInterval(() => {
			nowTick = Date.now();
		}, 1000);
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
		if (tickTimer) clearInterval(tickTimer);
		stopDeviceWatcher?.();
	});

	const currentRequest = $derived(data.pendingRequests[0] ?? null);

	/**
	 * The offer clock. The server sends what is left of the 60-second dispatch
	 * window; this carries it between the 5-second board refreshes so the number
	 * counts down smoothly instead of stepping. Re-seeded from every payload, so
	 * the server stays the authority on when an offer dies.
	 */
	let offerBase = $state<{ id: string; seconds: number; at: number } | null>(null);
	let nowTick = $state(Date.now());

	$effect(() => {
		const offer = currentRequest;

		untrack(() => {
			offerBase = offer ? { id: offer.id, seconds: offer.expiresInSeconds, at: Date.now() } : null;
		});
	});

	const offerSecondsLeft = $derived(
		offerBase && currentRequest?.id === offerBase.id
			? Math.max(0, offerBase.seconds - (nowTick - offerBase.at) / 1000)
			: 0
	);

	/**
	 * An expired offer leaves the screen here rather than waiting for the next
	 * poll to remove it: a rider tapping Accept on a dead countdown gets a
	 * refusal from the server, which reads as the app being broken.
	 */
	const liveOffer = $derived(currentRequest && offerSecondsLeft > 0 ? currentRequest : null);
	const heroTrip = $derived(data.activeTrip ?? liveOffer);
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

		const result = await acceptOffer(requestId);
		acceptingId = null;

		if (!result.ok) {
			actionError = result.message;
			// Whatever the reason, the board is stale — re-read it so a taken job
			// stops sitting there offering itself.
			void invalidateAll();
			return;
		}

		goto(`/pickup?tripId=${encodeURIComponent(result.tripId)}`);
	}

	async function declineRequest(requestId: string) {
		if (decliningId || !online.online) return;

		decliningId = requestId;
		actionError = '';

		const result = await declineOffer(requestId);
		decliningId = null;

		if (!result.ok) {
			actionError = result.message;
			return;
		}

		// The decline is stored, so the next board won't ring this trip again.
		await invalidateAll();
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
			center={online.online ? pickupPoint : (deviceCenter ?? KUMASI_CENTER)}
			markers={online.online && heroTrip
				? [
						{
							id: 'pickup',
							lat: pickupPoint.lat,
							lng: pickupPoint.lng,
							label: 'Pickup',
							role: 'pickup' as const
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
	</div>

	<!-- The waiting state, centred on the map the way the wireframe draws it: a
	     radar that is plainly *listening*, and one line saying what makes the
	     phone ring. It steps aside the moment there is an offer or a live trip —
	     both of those own the screen. -->
	{#if !liveOffer && !data.activeTrip}
		<div
			class="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-8 pb-40 text-center"
			in:fade={{ duration: 200 }}
		>
			<div class="relative flex h-36 w-36 items-center justify-center">
				{#if online.online}
					<span class="absolute inset-3 rounded-full border-md border-primary/25" aria-hidden="true"
					></span>
					<span
						class="absolute inset-0 animate-ping rounded-full border-md border-primary/40"
						style="animation-duration: 2.4s;"
						aria-hidden="true"
					></span>
					<span
						class="absolute inset-5 animate-ping rounded-full border-md border-primary/50"
						style="animation-duration: 2.4s; animation-delay: .6s;"
						aria-hidden="true"
					></span>
				{:else}
					<span class="absolute inset-0 rounded-full border-md border-border" aria-hidden="true"
					></span>
					<span class="absolute inset-5 rounded-full border-md border-border" aria-hidden="true"
					></span>
				{/if}
				<span
					class="relative flex h-16 w-16 items-center justify-center rounded-full {online.online
						? 'bg-primary text-primary-on shadow-primary-glow'
						: 'bg-surface text-ink-tertiary shadow-sm'}"
				>
					<IconMotorbike class="h-8 w-8" aria-hidden="true" />
				</span>
			</div>

			<div class="mt-6 max-w-xs rounded-xl bg-surface/90 px-4 py-3 shadow-sm backdrop-blur-sm">
				{#if online.online}
					<p class="font-semibold text-ink">Waiting for a delivery request…</p>
					<p class="mt-1 text-sm text-ink-secondary">
						Stay nearby — businesses call riders by distance
					</p>
				{:else}
					<p class="font-semibold text-ink">You're offline</p>
					<p class="mt-1 text-sm text-ink-secondary">
						Go online when you're ready to receive requests
					</p>
				{/if}
			</div>
		</div>
	{/if}

	<div class="relative z-20 mt-auto">
		<!-- Shift state, riding just above the sheet that switches it. It sits over
		     the map rather than inside the sheet so the answer to "am I online?"
		     and the control that changes it are the same glance apart, whatever
		     the sheet below is currently showing. -->
		<div class="px-5 pb-2">
			<p
				class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm {online.online
					? 'bg-success-subtle text-success'
					: 'bg-surface/90 text-ink-tertiary'}"
			>
				<span
					class="h-2 w-2 rounded-full {online.online
						? 'animate-yada-pulse bg-success'
						: 'bg-ink-disabled'}"
					aria-hidden="true"
				></span>
				{online.online ? 'Online' : 'Offline'}
			</p>
		</div>

		<!-- One sheet, three jobs: the offer, the trip in hand, or the shift switch.
		     Same 28px lip as every other courier sheet. -->
		<div
			class="flex flex-col gap-4 rounded-t-[28px] border-t border-border bg-surface p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-lg"
		>
		{#if actionError}
			<Alert>{actionError}</Alert>
		{/if}

		{#if liveOffer}
			{@const pickupAway = distanceLabel(liveOffer.distanceToPickupKm)}
			{@const tripAway = distanceLabel(liveOffer.tripDistanceKm)}
			<!-- Variant B from the wireframe: the map stays live underneath and the
			     offer arrives as a sheet, so accepting doesn't mean losing sight of
			     where the job is. -->
			<div in:fly={{ y: 120, duration: 220 }}>
				<div class="flex items-center justify-between gap-3">
					<p class="text-lg font-bold text-ink">New request</p>
					<span
						class="font-mono-data inline-flex items-center rounded-full px-3 py-1 text-sm font-bold {offerSecondsLeft <=
						10
							? 'animate-yada-pulse bg-danger-subtle text-danger'
							: 'bg-primary-subtle text-primary'}"
						aria-label="{Math.ceil(offerSecondsLeft)} seconds left to answer"
					>
						{countdownLabel(offerSecondsLeft)}
					</span>
				</div>

				<div class="mt-4 flex gap-3">
					<div class="flex flex-col items-center pt-1">
						<IconStore class="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
						<span class="my-1 w-px flex-1 bg-border" aria-hidden="true"></span>
						<IconPin class="h-4 w-4 shrink-0 text-secondary-700" aria-hidden="true" />
					</div>

					<div class="min-w-0 flex-1 space-y-3">
						<div>
							<p class="text-eyebrow text-ink-tertiary">
								{pickupAway ? `Pickup · ${pickupAway} away` : 'Pickup'}
							</p>
							<p class="truncate font-semibold text-ink">{liveOffer.businessName}</p>
							<p class="truncate text-sm text-ink-secondary">{liveOffer.pickupAddress}</p>
						</div>
						<div>
							<p class="text-eyebrow text-ink-tertiary">
								{tripAway ? `Dropoff · ${tripAway} trip` : 'Dropoff'}
							</p>
							<p class="truncate font-semibold text-ink">{liveOffer.dropoffAddress}</p>
						</div>
					</div>
				</div>

				{#if liveOffer.notes}
					<p class="mt-3 rounded-lg bg-bg px-3 py-2 text-sm text-ink-secondary">
						{liveOffer.notes}
					</p>
				{/if}

				<div class="mt-4 flex items-center gap-3">
					<IconButton
						ariaLabel="Decline this request"
						variant="outline"
						disabled={decliningId === liveOffer.id}
						onclick={() => declineRequest(liveOffer.id)}
					>
						<IconClose class="h-5 w-5" aria-hidden="true" />
					</IconButton>
					<div class="flex-1">
						<Button
							variant="primary"
							size="lg"
							fullWidth
							disabled={acceptingId === liveOffer.id}
							onclick={() => acceptRequest(liveOffer.id)}
						>
							{acceptingId === liveOffer.id ? 'Accepting…' : 'Accept'}
						</Button>
					</div>
				</div>
			</div>
		{:else if data.activeTrip}
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<span
						class="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary-subtle px-3 py-1 text-sm font-semibold text-secondary-700"
					>
						<IconArrowRight class="h-4 w-4 shrink-0" aria-hidden="true" />
						{statusLabel}
					</span>
					<p class="mt-2 truncate font-semibold text-ink">{data.activeTrip.businessName}</p>
					<p class="mt-0.5 flex items-center gap-1 text-sm text-ink-secondary">
						<span class="min-w-0 truncate">{data.activeTrip.pickupAddress}</span>
						<IconArrowRight class="h-3.5 w-3.5 shrink-0 text-ink-tertiary" aria-label="to" />
						<span class="min-w-0 truncate">{data.activeTrip.dropoffAddress}</span>
					</p>
				</div>
			</div>
			<Button variant="primary" size="lg" fullWidth onclick={openActiveTrip}>Continue trip</Button>
		{:else if online.online}
			<!-- The shift, as the wireframe frames it: what today has come to, and
			     the one switch that ends it. -->
			<div class="flex items-center justify-between pt-3 text-sm">
				<span class="text-ink-secondary">Today</span>
				<span class="font-mono-data font-semibold text-ink">
					{data.summary.tripsToday}
					{data.summary.tripsToday === 1 ? 'delivery' : 'deliveries'}
				</span>
			</div>
			<Button variant="outline" size="lg" fullWidth onclick={goOffline}>Go offline</Button>
		{:else}
			<Button variant="primary" size="lg" fullWidth onclick={goOnline}>Go online</Button>
		{/if}
		</div>
	</div>
</div>
