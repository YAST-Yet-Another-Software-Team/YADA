<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import Alert from '$lib/components/Alert.svelte';
	import Button from '$lib/components/Button.svelte';
	import LocationPickerMap from '$lib/components/LocationPickerMap.svelte';
	import { computeDrivingRoute } from '$lib/client/maps/routing';
	import { getMapsConfig } from '$lib/client/maps/maps-config.svelte';
	import { KUMASI_CENTER } from '$lib/shared/geo/service-area';
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

	const canSubmit = $derived(
		Boolean(pickupPoint && dropoffPoint && dropoffAddress.trim()) && !submitting
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
</script>

<svelte:head>
	<title>New request | YADA</title>
</svelte:head>

<!-- No card: the layout hands this page the whole area under the header, and a
     map with a border around it is a map with less map in it. -->
<div class="flex min-h-0 flex-1 flex-col bg-surface lg:overflow-hidden">
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
			{#if business}
				<LocationPickerMap
					bind:point={dropoffPoint}
					bind:address={dropoffAddress}
					bind:error={dropoffError}
					bind:resolving={resolvingDropoff}
					markerLabel="Delivery address"
					markerRole="dropoff"
					extraMarkers={pickupMarker}
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

		<!-- Request controls below in portrait; left pane in landscape -->
		<aside
			class="relative z-20 order-2 flex w-full shrink-0 flex-col gap-5 overflow-visible border-t border-border bg-surface p-4 lg:order-1 lg:w-[320px] lg:overflow-y-auto lg:border-r lg:border-t-0 lg:p-6"
		>
			{#if business}
				<div class="hidden lg:block">
					<h1 class="text-xl font-semibold text-ink">New delivery request</h1>
					<p class="mt-1 text-sm text-ink-secondary">
						Search the customer's address, then nudge the pin if it needs it.
					</p>
				</div>

				{#if submitError}
					<Alert>{submitError}</Alert>
				{/if}

				<section class="space-y-1">
					<p class="text-eyebrow font-bold text-primary">Pickup</p>
					<p class="text-sm font-semibold text-ink">{business.businessName}</p>
					<p class="text-sm text-ink-secondary">{business.address}</p>
				</section>

				<section class="space-y-1">
					<p class="text-eyebrow font-bold text-secondary-700">Deliver to</p>
					{#if resolvingDropoff}
						<p class="text-sm text-ink-tertiary">Reading that spot…</p>
					{:else if dropoffAddress}
						<p class="text-sm text-ink">{dropoffAddress}</p>
					{:else}
						<p class="text-sm text-ink-tertiary">
							Search the address above, or tap the map.
						</p>
					{/if}
					{#if dropoffError}
						<p class="text-xs font-medium text-danger">{dropoffError}</p>
					{/if}
				</section>

				{#if estimate}
					<section class="space-y-1 border-t border-border pt-4">
						<p class="text-eyebrow font-bold text-primary">Estimate</p>
						<p class="font-mono-data text-sm text-ink">
							{estimate.distanceKm.toFixed(1)} km · {estimate.durationText}
						</p>
					</section>
				{/if}

				<div class="mt-auto pt-2">
					<Button
						variant="primary"
						size="lg"
						fullWidth
						disabled={!canSubmit}
						onclick={requestDelivery}
					>
						{submitting ? 'Sending…' : 'Request a rider'}
					</Button>
				</div>
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

				<p class="text-sm {setupAddress ? 'text-ink' : 'text-ink-tertiary'}">
					{setupAddress || 'No location pinned yet'}
				</p>

				<div class="mt-auto pt-2">
					<Button
						variant="primary"
						size="lg"
						fullWidth
						disabled={!setupPoint || savingAddress}
						onclick={saveBusinessAddress}
					>
						{savingAddress ? 'Saving…' : 'Save business address'}
					</Button>
				</div>
			{/if}
		</aside>
	</div>
</div>
