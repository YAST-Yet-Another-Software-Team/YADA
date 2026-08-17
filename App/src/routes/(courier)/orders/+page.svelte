<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { onDestroy, onMount } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { fade, fly } from 'svelte/transition';
	import { motion } from '$lib/client/motion';
	import Alert from '$lib/components/Alert.svelte';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import RatingBadge from '$lib/components/RatingBadge.svelte';
	import IconButton from '$lib/components/IconButton.svelte';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import { courierTripHref, toTripStage } from '$lib/shared/trip-status';
	import IconArrowRight from '~icons/mdi/arrow-right';
	import IconClose from '~icons/mdi/close';
	import IconInbox from '~icons/mdi/inbox-outline';
	import type { CourierOffer, TripStatus } from '$lib/utils/types';
	import { getCourierOnline } from '../courier-online.svelte';
	import { acceptOffer, countdownLabel, declineOffer, distanceLabel } from '../offers';

	let {
		data
	}: {
		data: {
			activeTrip: {
				id: string;
				status: TripStatus;
				businessName: string;
				pickupAddress: string;
				dropoffAddress: string;
				estimatedDistanceKm: number | null;
			} | null;
			pendingRequests: CourierOffer[];
		};
	} = $props();

	const online = getCourierOnline();

	let acceptingId = $state<string | null>(null);
	let decliningId = $state<string | null>(null);
	let actionError = $state('');
	let nowTick = $state(Date.now());
	let refreshTimer: ReturnType<typeof setInterval> | undefined;
	let tickTimer: ReturnType<typeof setInterval> | undefined;

	/**
	 * Offers expire on a 60-second dispatch window, so a board that never
	 * re-reads itself would keep showing jobs that are already gone. Same cadence
	 * as Home, and idle for an offline rider, who cannot be ringed at all.
	 */
	onMount(() => {
		refreshTimer = setInterval(() => {
			if (!online.online && !data.activeTrip) return;
			void invalidateAll();
		}, 5000);

		tickTimer = setInterval(() => {
			nowTick = Date.now();
		}, 1000);
	});

	onDestroy(() => {
		if (refreshTimer) clearInterval(refreshTimer);
		if (tickTimer) clearInterval(tickTimer);
	});

	/**
	 * Seconds left on each offer, counted from when this payload arrived. The
	 * whole board re-seeds on every refresh, so the server stays the authority.
	 */
	const loadedAt = $derived.by(() => {
		data.pendingRequests;
		return Date.now();
	});

	function secondsLeft(offer: CourierOffer) {
		return Math.max(0, offer.expiresInSeconds - (nowTick - loadedAt) / 1000);
	}

	const liveOffers = $derived(data.pendingRequests.filter((offer) => secondsLeft(offer) > 0));

	function shortId(id: string) {
		return `#${id.slice(0, 8).toUpperCase()}`;
	}

	async function accept(id: string) {
		if (acceptingId || !online.online) return;

		acceptingId = id;
		actionError = '';

		const result = await acceptOffer(id);
		acceptingId = null;

		if (!result.ok) {
			actionError = result.message;
			void invalidateAll();
			return;
		}

		goto(`/pickup?tripId=${encodeURIComponent(result.tripId)}`);
	}

	async function decline(id: string) {
		if (decliningId || !online.online) return;

		decliningId = id;
		actionError = '';

		const result = await declineOffer(id);
		decliningId = null;

		if (!result.ok) {
			actionError = result.message;
			return;
		}

		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Orders | YADA Courier</title>
</svelte:head>

<!-- The screen names itself in the layout's title bar; what's left here is the
     work. -->
<div class="flex flex-1 flex-col gap-4 bg-bg p-4">
	{#if actionError}
		<Alert>{actionError}</Alert>
	{/if}

	{#if data.activeTrip}
		<!-- Shown even when offline: going offline stops new offers, it doesn't
		     hand back a parcel the courier is already carrying. -->
		<div class="rise">
			<Card>
			<div class="flex flex-col gap-3">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0 space-y-1">
						<p class="font-mono-data text-xs text-ink-tertiary">{shortId(data.activeTrip.id)}</p>
						<p class="truncate font-semibold text-ink">{data.activeTrip.dropoffAddress}</p>
						<p class="truncate text-sm text-ink-secondary">
							Pickup at {data.activeTrip.businessName} — {data.activeTrip.pickupAddress}
						</p>
						{#if data.activeTrip.estimatedDistanceKm != null}
							<p class="font-mono-data text-xs text-ink-tertiary">
								{distanceLabel(data.activeTrip.estimatedDistanceKm)}
							</p>
						{/if}
					</div>
					<StatusPill status={toTripStage(data.activeTrip.status)} />
				</div>
				<Button
					variant="primary"
					size="sm"
					onclick={() => data.activeTrip && goto(courierTripHref(data.activeTrip))}
				>
					Open active trip
				</Button>
			</div>
			</Card>
		</div>
	{/if}

	{#if online.online}
		<div class="rise flex flex-1 flex-col gap-3" style="--rise-delay: 80ms">
			<p class="text-eyebrow text-ink-tertiary">Incoming requests</p>

			{#if liveOffers.length === 0}
				<div
					class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center"
				>
					<IconInbox class="h-8 w-8 text-ink-tertiary" aria-hidden="true" />
					<p class="text-sm font-semibold text-ink">No requests waiting</p>
					<p class="text-sm text-ink-secondary">
						Stay nearby — businesses call riders by distance.
					</p>
				</div>
			{:else}
				<!-- Answerable here, not "from Home". The list used to show offers it
				     wouldn't let you take, which cost the rider the walk back to
				     another screen out of a 60-second window. -->
				{#each liveOffers as offer (offer.id)}
					{@const left = secondsLeft(offer)}
					{@const pickupAway = distanceLabel(offer.distanceToPickupKm)}
					{@const tripAway = distanceLabel(offer.tripDistanceKm)}
					<!-- Keyed by id, so this plays for an offer the ring has just reached
					     and not for the ones already listed when the poll returns. -->
					<div
						in:fly={motion({ y: 12, duration: 260, easing: cubicOut })}
						out:fade={motion({ duration: 150 })}
					>
					<Card>
						<div class="flex flex-col gap-3">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0 space-y-1">
									<p class="font-mono-data text-xs text-ink-tertiary">{shortId(offer.id)}</p>
									<div class="flex items-center gap-2">
										<p class="truncate font-semibold text-ink">{offer.businessName}</p>
										<RatingBadge
											average={offer.businessRating.average}
											count={offer.businessRating.count}
										/>
									</div>
									<p class="flex items-center gap-1 text-sm text-ink-secondary">
										<span class="min-w-0 truncate">{offer.pickupAddress}</span>
										<IconArrowRight
											class="h-3.5 w-3.5 shrink-0 text-ink-tertiary"
											aria-label="to"
										/>
										<span class="min-w-0 truncate">{offer.dropoffAddress}</span>
									</p>
									<p class="text-xs text-ink-tertiary">
										{tripAway ? `${pickupAway} to pickup · ${tripAway} trip` : `${pickupAway} to pickup`}
									</p>
								</div>
								<span
									class="font-mono-data shrink-0 rounded-full px-3 py-1 text-sm font-bold {left <= 10
										? 'animate-yada-pulse bg-danger-subtle text-danger'
										: 'bg-primary-subtle text-primary'}"
									aria-label="{Math.ceil(left)} seconds left to answer"
								>
									{countdownLabel(left)}
								</span>
							</div>

							<div class="flex items-center gap-3">
								<IconButton
									ariaLabel="Decline {shortId(offer.id)}"
									variant="outline"
									disabled={decliningId === offer.id}
									onclick={() => decline(offer.id)}
								>
									<IconClose class="h-5 w-5" aria-hidden="true" />
								</IconButton>
								<div class="flex-1">
									<Button
										variant="primary"
										size="sm"
										fullWidth
										disabled={acceptingId === offer.id}
										onclick={() => accept(offer.id)}
									>
										{acceptingId === offer.id ? 'Accepting…' : 'Accept'}
									</Button>
								</div>
							</div>
						</div>
					</Card>
					</div>
				{/each}
			{/if}
		</div>
	{:else if !data.activeTrip}
		<div class="rise flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
			<p class="font-semibold text-ink">No active orders</p>
			<p class="text-sm text-ink-secondary">Go online from Home to start receiving requests.</p>
		</div>
	{/if}
</div>
