<script lang="ts">
	import RiderPin from '$lib/components/business/RiderPin.svelte';
	import MapBackdrop from '$lib/components/MapBackdrop.svelte';
	import { availableRiders, businessProfile } from '$lib/data/mock-trips';
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
			{availableRiders.length} riders online
		</p>
	</div>

	<div
		class="relative min-h-[420px] flex-1 overflow-hidden rounded-lg border border-border bg-surface lg:min-h-[calc(100svh-58px-8rem)]"
	>
		<MapBackdrop>
			<!-- Business HQ -->
			<div
				class="absolute z-20 -translate-x-1/2 -translate-y-1/2"
				style="left:{businessProfile.mapX}%; top:{businessProfile.mapY}%"
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
						{businessProfile.businessName}
					</span>
				</div>
			</div>

			{#each availableRiders as rider (rider.id)}
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
			{#each availableRiders as rider (rider.id)}
				<li class="flex items-center justify-between text-sm">
					<span class="font-semibold text-ink">{rider.name}</span>
					<span class="text-ink-secondary">{rider.vehicle} · {rider.distanceKm} km</span>
				</li>
			{/each}
		</ul>
	</aside>
</div>
