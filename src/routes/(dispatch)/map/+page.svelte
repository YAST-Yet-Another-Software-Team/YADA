<script lang="ts">
	import RiderPin from '$lib/components/business/RiderPin.svelte';
	import MapBackdrop from '$lib/components/MapBackdrop.svelte';
	import AddressAutocomplete from '$lib/components/ui/AddressAutocomplete.svelte';

	export let data: {
		businessProfile: {
			businessName: string;
			address: string;
			mapX: number;
			mapY: number;
		} | null;
		availableRiders: Array<{
			id: string;
			name: string;
			vehicle: string;
			distanceKm: number;
			mapX: number;
			mapY: number;
		}>;
	};

	let searchedLocation: { lat: number; lng: number; address: string } | null = null;
	let mapCenter: { lat: number; lng: number } | null = null;
	let searchValue = '';

	function handleSearchSelect(event: CustomEvent<{ address: string; lat: number; lng: number }>) {
		searchedLocation = {
			address: event.detail.address,
			lat: event.detail.lat,
			lng: event.detail.lng
		};
		mapCenter = { lat: event.detail.lat, lng: event.detail.lng };
	}
</script>

<svelte:head>
	<title>Map | YADA</title>
</svelte:head>

<div class="flex h-full min-h-[calc(100svh-3.25rem)] flex-col gap-4 p-4 lg:min-h-[calc(100svh-58px-3rem)] lg:p-0">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold text-ink">Area map</h1>
			<p class="mt-1 text-sm text-ink-secondary">
				Your kitchen and nearby motor riders available for dispatch
			</p>
		</div>
		<p class="font-mono-data text-sm text-ink-tertiary">
			{data.availableRiders.length} riders online
		</p>
	</div>

	<div
		class="relative min-h-[420px] flex-1 overflow-hidden rounded-lg border border-border bg-surface lg:min-h-[calc(100svh-58px-8rem)]"
	>
		<!-- Floating Autocomplete Search Bar -->
		<div class="absolute left-4 right-4 top-4 z-30 max-w-md shadow-lg sm:left-6">
			<AddressAutocomplete
				placeholder="Search any place or address on map..."
				bind:value={searchValue}
				on:select={handleSearchSelect}
			/>
		</div>

		<MapBackdrop
			center={mapCenter}
			markers={[
				...(searchedLocation
					? [
						{
							id: 'searched',
							lat: searchedLocation.lat,
							lng: searchedLocation.lng,
							label: searchedLocation.address,
							accent: true
						}
					]
					: [])
			]}
		>
			<!-- Business HQ -->
			<div
				class="absolute z-20 -translate-x-1/2 -translate-y-1/2"
					style="left:{data.businessProfile?.mapX ?? 48}%; top:{data.businessProfile?.mapY ?? 52}%"
			>
				<div class="flex flex-col items-center">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface bg-ink text-xs font-bold text-primary-on shadow-md"
					>
						HQ
					</div>
					<span
						class="mt-1 max-w-[7rem] truncate rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-ink shadow-xs"
					>
						{data.businessProfile?.businessName ?? 'Business'}
					</span>
				</div>
			</div>

			{#each data.availableRiders as rider (rider.id)}
				<div
					class="absolute z-10 -translate-x-1/2 -translate-y-full"
					style="left:{rider.mapX}%; top:{rider.mapY}%"
				>
					<RiderPin
						label="{rider.name.split(' ')[0]} · {rider.distanceKm} km"
						size={38}
						accent={rider.distanceKm < 1}
					/>
				</div>
			{/each}
		</MapBackdrop>
	</div>

	<aside class="rounded-lg border border-border bg-surface p-4 lg:hidden">
		<h2 class="mb-3 text-sm font-semibold text-ink">Nearby riders</h2>
		<ul class="space-y-2">
				{#each data.availableRiders as rider (rider.id)}
				<li class="flex items-center justify-between text-sm">
					<span class="font-semibold text-ink">{rider.name}</span>
					<span class="text-ink-secondary">{rider.vehicle} · {rider.distanceKm} km</span>
				</li>
			{/each}
		</ul>
	</aside>
</div>
