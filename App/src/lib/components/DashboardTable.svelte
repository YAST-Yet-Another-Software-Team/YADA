<script lang="ts">
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import { fade, fly } from 'svelte/transition';
	import { motion } from '$lib/client/motion';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import { isMatchingNow } from '$lib/shared/dispatch';
	import type { DashboardTripRecord } from '$lib/utils/types';

	/**
	 * Row motion, rather than the page-level `.rise` the dashboard wraps this in.
	 *
	 * The each is keyed by trip id, so Svelte keeps the DOM node for a row that
	 * was already listed and only creates one for a trip that is genuinely new.
	 * That is the whole reason transitions belong here and a CSS animation does
	 * not: `.rise` on a row would replay for every row on every poll, because
	 * the class runs whenever an element is created and the list is rebuilt from
	 * server data. These fire only when the list actually changes.
	 *
	 * `flip` is what makes a status change legible — a trip leaving `searching`
	 * re-sorts the table, and without it rows would teleport into their new
	 * order between two polls.
	 */
	const ROW_IN = { y: -6, duration: 220, easing: cubicOut };
	const ROW_OUT = { duration: 150 };
	const ROW_MOVE = { duration: 220, easing: cubicOut };

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
				<th class="text-eyebrow px-3 py-2 first:pl-0 last:pr-0">Time taken</th>
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
					in:fly={motion(ROW_IN)}
					out:fade={motion(ROW_OUT)}
					animate:flip={motion(ROW_MOVE)}
				>
					<td class="font-mono-data px-3 py-3 text-ink first:pl-0 last:pr-0"
						>#{trip.id.replace('YD-', '')}</td
					>
					<td class="truncate px-3 py-3 text-ink first:pl-0 last:pr-0">{trip.rider ?? '—'}</td>
					<td class="truncate px-3 py-3 text-ink first:pl-0 last:pr-0">{trip.destination}</td>
					<td class="font-mono-data px-3 py-3 text-ink first:pl-0 last:pr-0">{trip.rideTime ?? '—'}</td>
					<td class="px-3 py-3 first:pl-0 last:pr-0">
						<StatusPill
							status={trip.status}
							pulse={isMatchingNow(trip.status, trip.dispatchStartedAt)}
						/>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
