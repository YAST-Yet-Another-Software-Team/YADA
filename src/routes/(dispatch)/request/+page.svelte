<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import MapBackdrop from '$lib/components/MapBackdrop.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { loadGoogleMapsGeocoding } from '$lib/maps/google-maps-loader';

	type LocationPoint = {
		lat: number;
		lng: number;
	};

	type LocationMode = 'pickup' | 'dropoff';

	let pickup = 'Current location';
	let dropoff = '';
	let distance = 'fastest';
	let activeLocation: LocationMode = 'dropoff';
	let pickupPoint: LocationPoint | null = null;
	let dropoffPoint: LocationPoint | null = null;
	let pickupLoading = true;

	const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

	const distanceOptions = [
		{ value: 'fastest', label: 'Fastest nearby' },
		{ value: 'nearby', label: 'Nearby' },
		{ value: 'further', label: 'Further away' },
		{ value: 'any', label: 'Any available' }
	];

	function getUserLocation(): Promise<LocationPoint | null> {
		if (!navigator.geolocation) {
			return Promise.resolve(null);
		}

		return new Promise((resolve) => {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					resolve({
						lat: position.coords.latitude,
						lng: position.coords.longitude
					});
				},
				() => resolve(null),
				{
					enableHighAccuracy: true,
					timeout: 6000,
					maximumAge: 60_000
				}
			);
		});
	}

	async function reverseGeocode(point: LocationPoint): Promise<string | null> {
		if (!googleMapsApiKey) {
			return null;
		}

		const geocodingLibrary = await loadGoogleMapsGeocoding(googleMapsApiKey);
		const geocoder = new geocodingLibrary.Geocoder();
		const response = await geocoder.geocode({ location: point });

		return response.results[0]?.formatted_address ?? null;
	}

	async function setPickupFromLocation() {
		pickupLoading = true;
		const location = await getUserLocation();

		if (!location) {
			pickupLoading = false;
			return;
		}

		pickupPoint = location;
		pickup = (await reverseGeocode(location)) ?? 'Current location';
		pickupLoading = false;
	}

	function handleMapPick(event: CustomEvent<LocationPoint>) {
		if (activeLocation === 'pickup') {
			pickupPoint = event.detail;
			void (async () => {
				pickup = (await reverseGeocode(event.detail)) ?? pickup;
			})();
			return;
		}

		dropoffPoint = event.detail;
		void (async () => {
			dropoff = (await reverseGeocode(event.detail)) ?? dropoff;
		})();
	}

	onMount(() => {
		void setPickupFromLocation();
	});

	function findRider() {
		if (!dropoff.trim()) return;
		goto('/matching');
	}
</script>

<svelte:head>
	<title>New request | YADA</title>
</svelte:head>

<div class="flex h-full min-h-[calc(100svh-3.25rem)] flex-col lg:min-h-[calc(100svh-58px-3rem)]">
	<div class="flex items-center gap-3 border-b border-border px-4 py-3 lg:hidden">
		<a href="/dashboard" class="text-ink" aria-label="Back">
			<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2"
				><path d="m15 18-6-6 6-6" /></svg
			>
		</a>
		<h1 class="text-lg font-semibold text-ink">New request</h1>
	</div>

	<div
		class="flex flex-1 flex-col lg:min-h-[calc(100svh-58px-3rem)] lg:flex-row lg:overflow-hidden lg:rounded-lg lg:border lg:border-border lg:bg-surface"
	>
		<div class="flex w-full flex-col gap-4 p-4 lg:w-[380px] lg:shrink-0 lg:gap-5 lg:p-8">
			<h1 class="hidden text-xl font-semibold text-ink lg:block">New delivery request</h1>

			<div class="flex gap-2 rounded-lg border border-border bg-surface p-1 text-sm">
				<button
					type="button"
					class="flex-1 rounded-md px-3 py-2 font-semibold transition-colors {activeLocation === 'pickup'
						? 'bg-primary text-primary-on'
						: 'text-ink-secondary hover:bg-primary-subtle'}"
					on:click={() => (activeLocation = 'pickup')}
				>
					Set pickup on map
				</button>
				<button
					type="button"
					class="flex-1 rounded-md px-3 py-2 font-semibold transition-colors {activeLocation === 'dropoff'
						? 'bg-primary text-primary-on'
						: 'text-ink-secondary hover:bg-primary-subtle'}"
					on:click={() => (activeLocation = 'dropoff')}
				>
					Set dropoff on map
				</button>
			</div>

			<p class="text-xs text-ink-tertiary">
				{#if pickupLoading}
					Using your browser location for pickup…
				{:else}
					Click the map to place pickup or dropoff, then switch between the two targets as needed.
				{/if}
			</p>

			<Input label="Pickup (defaults to your location)" bind:value={pickup}>
				<svelte:fragment slot="icon">
					<svg
						viewBox="0 0 24 24"
						class="h-4 w-4 text-primary"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /></svg
					>
				</svelte:fragment>
			</Input>

			<Input label="Dropoff" placeholder="Customer address" bind:value={dropoff}>
				<svelte:fragment slot="icon">
					<svg
						viewBox="0 0 24 24"
						class="h-4 w-4 text-secondary"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						><path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" /><circle
							cx="12"
							cy="10"
							r="2.5"
						/></svg
					>
				</svelte:fragment>
			</Input>

			<Select label="Rider distance" options={distanceOptions} bind:value={distance} />

			<div class="relative h-[160px] overflow-hidden rounded-lg border border-border lg:hidden">
				<MapBackdrop
					routeLabel
					interactive
					markers={[
						...(pickupPoint
							? [
								{
									id: 'pickup',
									lat: pickupPoint.lat,
									lng: pickupPoint.lng,
									label: 'Pickup',
									accent: false
								}
							]
							: []),
						...(dropoffPoint
							? [
								{
									id: 'dropoff',
									lat: dropoffPoint.lat,
									lng: dropoffPoint.lng,
									label: 'Dropoff',
									accent: true
								}
							]
							: [])
					]}
					on:pick={handleMapPick}
				/>
			</div>

			<div class="mt-auto pt-2">
				<Button
					variant="primary"
					size="lg"
					fullWidth
					disabled={!dropoff.trim()}
					on:click={findRider}
				>
					Find a rider
				</Button>
			</div>
		</div>

		<!-- Desktop: route preview fills remaining space (wireframe-style) -->
		<aside
			class="relative hidden min-h-[320px] flex-1 flex-col border-l border-border bg-surface lg:flex"
		>
			<div class="border-b border-border px-5 py-4">
				<h2 class="font-semibold text-ink">Route preview</h2>
				<p class="mt-1 text-sm text-ink-secondary">Est. distance 1.4 mi · Est. time 5–8 min</p>
			</div>
			<div class="relative min-h-0 flex-1">
				<MapBackdrop
					routeLabel
					interactive
					markers={[
						...(pickupPoint
							? [
								{
									id: 'pickup',
									lat: pickupPoint.lat,
									lng: pickupPoint.lng,
									label: 'Pickup',
									accent: false
								}
							]
							: []),
						...(dropoffPoint
							? [
								{
									id: 'dropoff',
									lat: dropoffPoint.lat,
									lng: dropoffPoint.lng,
									label: 'Dropoff',
									accent: true
								}
							]
							: [])
					]}
					on:pick={handleMapPick}
				/>
			</div>
		</aside>
	</div>
</div>
