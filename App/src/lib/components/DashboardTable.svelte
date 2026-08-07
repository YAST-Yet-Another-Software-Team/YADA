<script lang="ts">
	import StatusPill from '$lib/components/StatusPill.svelte';
	import type { DashboardTripRecord } from '$lib/utils/types';

	let {
		trips = [],
		onselect
	}: {
		trips?: DashboardTripRecord[];
		onselect?: (trip: DashboardTripRecord) => void;
	} = $props();
</script>

<div class="overflow-x-auto">
	<table class="w-full min-w-[640px] table-fixed text-left text-sm">
		<thead class="border-b-2 border-border-strong text-ink-tertiary">
			<tr>
				<th class="text-eyebrow px-3 py-2 first:pl-0 last:pr-0">Order</th>
				<th class="text-eyebrow px-3 py-2 first:pl-0 last:pr-0">Rider</th>
				<th class="text-eyebrow px-3 py-2 first:pl-0 last:pr-0">Destination</th>
				<th class="text-eyebrow px-3 py-2 first:pl-0 last:pr-0">ETA</th>
				<th class="text-eyebrow px-3 py-2 first:pl-0 last:pr-0">Status</th>
			</tr>
		</thead>
		<tbody>
			{#each trips as trip (trip.id)}
				<tr
					class="cursor-pointer border-b border-dashed border-border transition hover:bg-wash"
					onclick={() => onselect?.(trip)}
					onkeydown={(e) => e.key === 'Enter' && onselect?.(trip)}
					tabindex="0"
					role="button"
				>
					<td class="font-mono-data px-3 py-3 text-ink first:pl-0 last:pr-0"
						>#{trip.id.replace('YD-', '')}</td
					>
					<td class="truncate px-3 py-3 text-ink first:pl-0 last:pr-0">{trip.rider ?? '—'}</td>
					<td class="truncate px-3 py-3 text-ink first:pl-0 last:pr-0">{trip.destination}</td>
					<td class="font-mono-data px-3 py-3 text-ink first:pl-0 last:pr-0">{trip.eta ?? '—'}</td>
					<td class="px-3 py-3 first:pl-0 last:pr-0"><StatusPill status={trip.status} /></td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
