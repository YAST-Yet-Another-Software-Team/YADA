<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { onDestroy, onMount } from 'svelte';
	import Alert from '$lib/components/Alert.svelte';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import LocationPickerMap from '$lib/components/LocationPickerMap.svelte';
	import { computeDrivingRoute } from '$lib/client/maps/routing';
	import { getMapsConfig } from '$lib/client/maps/maps-config.svelte';
	import { KUMASI_CENTER } from '$lib/shared/geo/service-area';
	import { NEARBY_MINUTES } from '$lib/shared/geo/nearby';
	import IconCircle from '~icons/mdi/record-circle-outline';
	import IconPin from '~icons/mdi/map-marker';
	import type { LatLng } from '$lib/utils/types';

	let {
		data
	}: {
		data: {
			business: { businessName: string; address: string; lat: number; lng: number } | null;
		};
	} = $props();

	const maps = getMapsConfig();

	const business = $derived(data.business);
	const pickupPoint = $derived(business ? { lat: business.lat, lng: business.lng } : null);

	let dropoffPoint = $state<LatLng | null>(null);
	let dropoffAddress = $state('');
	let dropoffError = $state('');
	let resolvingDropoff = $state(false);
	let submitting = $state(false);
	let submitError = $state('');
	let estimate = $state<{ distanceKm: number; durationMinutes: number; durationText: string } | null>(
		null
	);

	// Only reachable by accounts created before sign-up asked for an address.
	let setupPoint = $state<LatLng | null>(null);
	let setupAddress = $state('');
	let setupError = $state('');
	let savingAddress = $state(false);

	/**
	 * The order record. Asked for here rather than left to a note, because a
	 * delivery that cannot say what was in it is a delivery nobody can audit
	 * afterwards — and the columns behind these two are NOT NULL for the same
	 * reason. The price is what the *order* is worth, not a fee for the ride.
	 */
	let orderName = $state('');
	let orderPrice = $state('');

	const priceAmount = $derived(Number(orderPrice.trim()));
	const priceValid = $derived(
		orderPrice.trim().length > 0 && Number.isFinite(priceAmount) && priceAmount >= 0
	);

	const canSubmit = $derived(
		Boolean(pickupPoint && dropoffPoint && dropoffAddress.trim()) &&
			orderName.trim().length > 0 &&
			priceValid &&
			!submitting
	);

	/**
	 * Distance and ETA for the trip about to be requested.
	 *
	 * Deliberately not drawn on the map: until a rider is on it, a line between
	 * two pins is a guess at a journey nobody is making yet. The numbers are
	 * stored with the trip, so the dashboard can show an ETA before the first fix.
	 */
	async function refreshEstimate(origin: LatLng, destination: LatLng) {
		if (!maps.enabled) {
			estimate = null;
			return;
		}

		try {
			const route = await computeDrivingRoute(maps.apiKey, origin, destination);
			estimate = {
				distanceKm: route.distanceKm,
				durationMinutes: route.durationMinutes,
				durationText: route.durationText
			};
		} catch {
			estimate = null;
		}
	}

	$effect(() => {
		const origin = pickupPoint;
		const destination = dropoffPoint;

		if (!origin || !destination) {
			estimate = null;
			return;
		}

		void refreshEstimate(origin, destination);
	});

	async function requestDelivery() {
		if (!canSubmit || !dropoffPoint) return;

		submitting = true;
		submitError = '';

		try {
			const response = await fetch('/api/trips', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					dropoffAddress,
					dropoffLat: dropoffPoint.lat,
					dropoffLng: dropoffPoint.lng,
					orderName: orderName.trim(),
					orderPrice: priceAmount,
					estimatedDistanceKm: estimate?.distanceKm,
					estimatedDurationMinutes: estimate?.durationMinutes
				})
			});

			const payload = await response.json().catch(() => null);

			// No local-preview fallback: a request that didn't reach the database is
			// one no courier can ever see, and sending the business to a tracking
			// screen for it only hides that.
			if (!response.ok || !payload?.trip?.id) {
				submitError = payload?.message ?? 'Could not send your request. Try again.';
				return;
			}

			goto(`/tracking?trip=${encodeURIComponent(payload.trip.id)}`);
		} catch {
			submitError = 'Could not send your request. Check your connection and try again.';
		} finally {
			submitting = false;
		}
	}

	async function saveBusinessAddress() {
		if (!setupPoint || !setupAddress.trim() || savingAddress) return;

		savingAddress = true;
		setupError = '';

		try {
			const response = await fetch('/api/business/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					address: setupAddress,
					lat: setupPoint.lat,
					lng: setupPoint.lng
				})
			});

			const payload = await response.json().catch(() => null);
			if (!response.ok) {
				setupError = payload?.message ?? 'Could not save your address. Try again.';
				return;
			}

			await invalidateAll();
		} catch {
			setupError = 'Could not save your address. Check your connection and try again.';
		} finally {
			savingAddress = false;
		}
	}

	const pickupMarker = $derived(
		business && pickupPoint
			? [
					{
						id: 'pickup',
						lat: pickupPoint.lat,
						lng: pickupPoint.lng,
						label: business.businessName,
						role: 'business' as const
					}
				]
			: []
	);

	/* ------------------------------------------------------- riders nearby */

	/**
	 * The online riders around the shop, drawn on the map before anything is
	 * requested — the same reassurance every ride-hailing app opens with. They
	 * are anonymous by construction: `GET /api/couriers/nearby` sends positions
	 * and an opaque ref, never a name, so this can show supply without showing
	 * people.
	 */
	type NearbyCourier = { ref: string; lat: number; lng: number; minutesAway: number };

	let nearby = $state<NearbyCourier[]>([]);
	let nearbyLoaded = $state(false);
	let nearbyTimer: ReturnType<typeof setInterval> | undefined;

	/** Often enough to feel live, rarely enough to be a background tab's guest. */
	const NEARBY_POLL_MS = 10_000;

	async function refreshNearby() {
		try {
			const response = await fetch('/api/couriers/nearby');
			const payload = await response.json().catch(() => null);
			if (!response.ok || !payload?.ok) return;

			nearby = payload.couriers ?? [];
		} catch {
			// A dropped poll is not worth a message: the markers simply hold their
			// last position until the next one lands.
		} finally {
			nearbyLoaded = true;
		}
	}

	const nearbyMarkers = $derived(
		nearby.map((courier) => ({
			id: `rider-${courier.ref}`,
			lat: courier.lat,
			lng: courier.lng,
			// The title a hover reveals. A time, not a distance: "4 min away" is
			// what the business is deciding on.
			label: `Rider · about ${courier.minutesAway} min away`,
			role: 'rider' as const
		}))
	);

	/** Riders under the pin, so the destination marker still reads on top. */
	const mapMarkers = $derived([...nearbyMarkers, ...pickupMarker]);

	onMount(() => {
		void refreshNearby();
		nearbyTimer = setInterval(() => void refreshNearby(), NEARBY_POLL_MS);
	});

	onDestroy(() => {
		if (nearbyTimer) clearInterval(nearbyTimer);
	});
</script>

<svelte:head>
	<title>New request | YADA</title>
</svelte:head>

<!-- No card: the layout hands this page the whole area under the header (and the
     header itself, on a phone, is the layout's back bar), and a map with a
     border around it is a map with less map in it. -->
<div class="flex min-h-0 flex-1 flex-col bg-surface lg:overflow-hidden">
	<div class="flex min-h-0 flex-1 flex-col lg:flex-row">
		<!-- Map on top in portrait; right pane in landscape. It takes whatever the
		     sheet below doesn't need, with a floor under it so the sheet can never
		     grow over the pin the person is placing. -->
		<!-- The map fades rather than lifts: it is the full-bleed backdrop, and a
		     translate on it would show a bare edge for the length of the animation. -->
		<div class="fade-in relative order-1 min-h-[38svh] flex-1 lg:order-2 lg:min-h-0">
			{#if business}
				<LocationPickerMap
					bind:point={dropoffPoint}
					bind:address={dropoffAddress}
					bind:error={dropoffError}
					bind:resolving={resolvingDropoff}
					markerLabel="Delivery address"
					markerRole="dropoff"
					extraMarkers={mapMarkers}
					initialCenter={pickupPoint}
					searchPlaceholder="Where is this going?"
				/>
			{:else}
				<LocationPickerMap
					bind:point={setupPoint}
					bind:address={setupAddress}
					bind:error={setupError}
					markerLabel="Your business"
					markerRole="business"
					initialCenter={KUMASI_CENTER}
					searchPlaceholder="Search your shop's address"
					showLocateButton
					locateLabel="I'm here now"
				/>
			{/if}
		</div>

		<!-- Request controls below in portrait; left pane in landscape.
		     On a phone the panel lifts over the bottom of the map — the same
		     rounded sheet the courier screens use — so the two read as one
		     surface rather than two stacked panes. -->
		<!-- `max-h` is what stops the sheet eating the map on a phone. It was 58svh,
		     which left the map barely more than a third of the screen once the
		     sheet filled — and the sheet scrolls internally, so the extra height
		     bought no content, only a smaller map to place a pin on. -->
		<aside
			style="--rise-delay: 90ms"
			class="rise relative z-20 order-2 -mt-5 flex max-h-[52svh] w-full shrink-0 flex-col rounded-t-[28px] border-t border-border bg-surface shadow-lg lg:order-1 lg:mt-0 lg:max-h-none lg:w-[320px] lg:flex-none lg:rounded-none lg:border-r lg:border-t-0 lg:shadow-none"
		>
			<!-- `pt-7` on mobile, not `p-4`: the sheet is pulled 20px over the map and
			     its top corners are a 28px radius, so 16px of padding put the first
			     label inside the curve. The top padding has to clear the radius. -->
			<div
				class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-7 lg:gap-5 lg:p-6"
			>
				{#if business}
					<div class="rise hidden lg:block" style="--rise-delay: 150ms">
						<h1 class="text-xl font-semibold text-ink">New delivery request</h1>
						<p class="mt-1 text-sm text-ink-secondary">
							Search the customer's address, then nudge the pin if it needs it.
						</p>
					</div>

					{#if submitError}
						<Alert>{submitError}</Alert>
					{/if}

					<!-- Two rows, one journey: the labelled boxes read as the form the
					     wireframe asks for, and the connector between the pins says
					     which way the parcel goes without a word. -->
					<section class="rise space-y-2" style="--rise-delay: 200ms">
						<div class="flex gap-3">
							<div class="flex flex-col items-center pt-3.5">
								<IconCircle class="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
								<span class="my-1 w-px flex-1 bg-border" aria-hidden="true"></span>
								<IconPin
									class="h-4 w-4 shrink-0 text-secondary-700"
									aria-hidden="true"
								/>
							</div>

							<div class="min-w-0 flex-1 space-y-2">
								<div>
									<p class="text-eyebrow mb-1 text-ink-tertiary">Pickup</p>
									<div class="rounded-md border border-border bg-surface px-3 py-2.5">
										<p class="truncate text-sm font-semibold text-ink">
											{business.businessName}
										</p>
										<p class="truncate text-sm text-ink-secondary">{business.address}</p>
									</div>
								</div>

								<div>
									<p class="text-eyebrow mb-1 text-ink-tertiary">Deliver to</p>
									<div
										class="rounded-md border px-3 py-2.5 {dropoffAddress
											? 'border-border bg-surface'
											: 'border-dashed border-border bg-surface-sunken'}"
									>
										{#if resolvingDropoff}
											<p class="text-sm text-ink-tertiary">Reading that spot…</p>
										{:else if dropoffAddress}
											<p class="text-sm text-ink">{dropoffAddress}</p>
										{:else}
											<p class="text-sm text-ink-tertiary">
												Search on the map, or tap it to drop the pin.
											</p>
										{/if}
									</div>
									{#if dropoffError}
										<p class="mt-1 text-xs font-medium text-danger">{dropoffError}</p>
									{/if}
								</div>
							</div>
						</div>
					</section>

					<!-- Supply, before the ask. The map already shows the riders as
					     dots; this is the sentence that makes them mean something —
					     and when it reads zero it is the most useful thing on the
					     screen, because the request would sit unanswered. -->
					{#if nearbyLoaded}
						<section class="flex items-center gap-2 border-t border-border pt-3">
							<span
								class="inline-flex h-2 w-2 shrink-0 rounded-full {nearby.length > 0
									? 'animate-yada-pulse bg-info'
									: 'bg-ink-disabled'}"
								aria-hidden="true"
							></span>
							<p class="text-sm text-ink-secondary">
								{#if nearby.length === 0}
									No riders online near you right now — you can still send the request.
								{:else}
									<span class="font-semibold text-ink">
										{nearby.length}
										{nearby.length === 1 ? 'rider' : 'riders'}
									</span>
									within about {NEARBY_MINUTES} min
								{/if}
							</p>
						</section>
					{/if}

					<!-- The order itself. Above the estimate because it is part of the
					     request rather than a consequence of it, and required before
					     "Find a rider" will do anything. -->
					<section class="rise space-y-2 border-t border-border pt-3" style="--rise-delay: 260ms">
						<p class="text-eyebrow text-ink-tertiary">Order</p>

						<Input
							label="Order Name"
							type="text"
							placeholder="Pancakes × 4"
							maxlength={120}
							required
							bind:value={orderName}
						/>

						<Input
							label="Price (GH₵)"
							type="text"
							inputmode="decimal"
							placeholder="55.00"
							required
							bind:value={orderPrice}
						/>
						<p class="text-xs leading-relaxed text-ink-secondary">
							The rider is not shown the order details.
						</p>
					</section>

					{#if estimate}
						<section class="flex items-center justify-between border-t border-border pt-3">
							<p class="text-eyebrow text-ink-tertiary">Estimate</p>
							<p class="font-mono-data text-sm text-ink">
								{estimate.distanceKm.toFixed(1)} km · {estimate.durationText}
							</p>
						</section>
					{/if}
				{:else}
					<div>
						<h1 class="text-xl font-semibold text-ink">Where do you dispatch from?</h1>
						<p class="mt-1 text-sm text-ink-secondary">
							Set this once and every delivery you request leaves from there. Search your
							address, or tap the map to place the pin exactly.
						</p>
					</div>

					{#if setupError}
						<Alert>{setupError}</Alert>
					{/if}

					<div class="rounded-md border border-border bg-surface px-3 py-2.5">
						<p class="text-sm {setupAddress ? 'text-ink' : 'text-ink-tertiary'}">
							{setupAddress || 'No location pinned yet'}
						</p>
					</div>
				{/if}
			</div>

			<!-- The one action, always on screen: on a phone it stays at the foot of
			     the sheet however long the addresses run. -->
			<div
				class="fade-in shrink-0 border-t border-border px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 lg:border-t-0 lg:px-6 lg:pb-6 lg:pt-0"
				style="--rise-delay: 320ms"
			>
				{#if business}
					<Button
						variant="primary"
						size="lg"
						fullWidth
						disabled={!canSubmit}
						onclick={requestDelivery}
					>
						{submitting ? 'Sending…' : 'Request a rider'}
					</Button>
				{:else}
					<Button
						variant="primary"
						size="lg"
						fullWidth
						disabled={!setupPoint || savingAddress}
						onclick={saveBusinessAddress}
					>
						{savingAddress ? 'Saving…' : 'Save business address'}
					</Button>
				{/if}
			</div>
		</aside>
	</div>
</div>
