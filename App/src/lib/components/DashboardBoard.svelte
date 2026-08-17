<script lang="ts">
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import { fade, fly } from 'svelte/transition';
	import { motion } from '$lib/client/motion';
	import type { DashboardTripRecord, TripStage } from '$lib/utils/types';

	/**
	 * Card motion. Keyed by trip id, so a card that was already on the board
	 * survives a poll untouched and only real changes animate.
	 *
	 * A trip advancing a stage is a *remove from one column and add to another*,
	 * not a move — `flip` only reconciles within a single each block, and these
	 * are four of them. So it reads as the card fading out of "Finding rider"
	 * and dropping into "Assigned", which is the honest description of what the
	 * board just learned. `flip` still earns its place inside a column, closing
	 * the gap the departing card left instead of snapping the rest upward.
	 */
	const CARD_IN = { y: 8, duration: 240, easing: cubicOut };
	const CARD_OUT = { duration: 150 };
	const CARD_MOVE = { duration: 240, easing: cubicOut };

	const boardColumns: Array<{ key: TripStage; title: string }> = [
		{ key: 'searching', title: 'Finding rider' },
		{ key: 'assigned', title: 'Assigned' },
		{ key: 'en_route', title: 'En route' },
		{ key: 'delivered', title: 'Delivered today' }
	];

	let {
		trips = [],
		deliveredToday = [],
		onselect
	}: {
		trips?: DashboardTripRecord[];
		deliveredToday?: DashboardTripRecord[];
		onselect?: (trip: DashboardTripRecord) => void;
	} = $props();

	function columnTrips(key: TripStage) {
		if (key === 'delivered') return deliveredToday;
		return trips.filter((t) => t.status === key);
	}
</script>

<div class="overflow-x-auto border-t-2 border-border-strong bg-surface-sunken">
	<div class="grid min-w-[720px] grid-cols-4">
		{#each boardColumns as column (column.key)}
			{@const cards = columnTrips(column.key)}
			<section
				class="flex min-h-[240px] flex-col gap-2.5 border-r border-dashed border-border p-3 last:border-r-0"
			>
				<h3 class="text-eyebrow text-ink-tertiary">
					{column.title} ({cards.length})
				</h3>
				{#each cards as trip (trip.id)}
					<button
						type="button"
						class="rounded-md border bg-surface px-3 py-2.5 text-left text-sm transition hover:border-primary {trip.status ===
						'en_route'
							? 'border-primary'
							: 'border-border-strong'} {column.key === 'delivered' ? 'opacity-50' : ''}"
						onclick={() => {
							if (column.key !== 'delivered') onselect?.(trip);
						}}
						in:fly={motion(CARD_IN)}
						out:fade={motion(CARD_OUT)}
						animate:flip={motion(CARD_MOVE)}
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
							{#if trip.rideTime}
								· <span class="font-mono-data text-primary">{trip.rideTime}</span>
							{/if}
						{/if}
					</button>
				{/each}
			</section>
		{/each}
	</div>
</div>
