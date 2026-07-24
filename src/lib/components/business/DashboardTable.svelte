<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import StatusPill from '$lib/components/ui/StatusPill.svelte';
	import type { DashboardTripRecord } from '$lib/server/dashboard-data';

	export let trips: DashboardTripRecord[] = [];

	const dispatch = createEventDispatcher<{ select: DashboardTripRecord }>();
</script>

<div class="overflow-x-auto rounded-lg border border-border bg-surface">
	<table class="w-full min-w-[640px] text-left text-sm">
		<thead class="border-b border-border bg-surface-sunken text-ink-secondary">
			<tr>
				<th class="px-4 py-3 font-semibold">Order</th>
				<th class="px-4 py-3 font-semibold">Rider</th>
				<th class="px-4 py-3 font-semibold">Destination</th>
				<th class="px-4 py-3 font-semibold">ETA</th>
				<th class="px-4 py-3 font-semibold">Status</th>
			</tr>
		</thead>
		<tbody>
			{#each trips as trip (trip.id)}
				<tr
					class="cursor-pointer border-b border-border last:border-0 transition hover:bg-primary-subtle"
					on:click={() => dispatch('select', trip)}
					on:keydown={(e) => e.key === 'Enter' && dispatch('select', trip)}
					tabindex="0"
					role="button"
				>
					<td class="font-mono-data px-4 py-3 text-ink">#{trip.id.replace('YD-', '')}</td>
					<td class="px-4 py-3 text-ink">{trip.rider ?? '—'}</td>
					<td class="px-4 py-3 text-ink">{trip.destination}</td>
					<td class="font-mono-data px-4 py-3 text-ink">{trip.eta ?? '—'}</td>
					<td class="px-4 py-3"><StatusPill status={trip.status} /></td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
