<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { boardColumns, type MockTrip, type TripStatus } from '$lib/data/mock-trips';

	export let trips: MockTrip[] = [];
	export let deliveredToday: MockTrip[] = [];

	const dispatch = createEventDispatcher<{ select: MockTrip }>();

	function columnTrips(key: TripStatus | 'delivered') {
		if (key === 'delivered') return deliveredToday;
		return trips.filter((t) => t.status === key);
	}
</script>

<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
	{#each boardColumns as column}
		{@const cards = columnTrips(column.key)}
		<section class="flex min-h-[220px] flex-col rounded-lg border border-border bg-surface-sunken p-3">
			<h3 class="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
				{column.title} ({cards.length})
			</h3>
			<div class="flex flex-1 flex-col gap-2">
				{#each cards as trip (trip.id)}
					<button
						type="button"
						class="rounded-md border bg-surface p-3 text-left text-sm shadow-xs transition hover:border-primary {trip.status ===
						'en_route'
							? 'border-primary'
							: 'border-border'} {column.key === 'delivered' ? 'opacity-60' : ''}"
						on:click={() => {
							if (column.key !== 'delivered') dispatch('select', trip);
						}}
					>
						{#if column.key === 'delivered'}
							<span class="font-mono-data text-ink-tertiary">#{trip.id.replace('YD-', '')}</span>
							· {trip.completedAt ?? ''}
						{:else}
							<span class="font-semibold text-ink">#{trip.id.replace('YD-', '')}</span>
							{#if trip.rider}
								· {trip.rider}
							{/if}
							· {trip.destination}
							{#if trip.eta}
								· <span class="font-mono-data text-primary">{trip.eta}</span>
							{/if}
						{/if}
					</button>
				{/each}
			</div>
		</section>
	{/each}
</div>
