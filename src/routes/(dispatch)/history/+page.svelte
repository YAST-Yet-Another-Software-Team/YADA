<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import StatusPill from '$lib/components/ui/StatusPill.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { historyTrips } from '$lib/data/mock-trips';

	let tab = 'history';
	let statusFilter = 'all';
	let search = '';

	$: filtered = historyTrips.filter((trip) => {
		const statusOk = statusFilter === 'all' || trip.status === statusFilter;
		const q = search.trim().toLowerCase();
		const searchOk =
			!q ||
			trip.id.toLowerCase().includes(q) ||
			trip.destination.toLowerCase().includes(q) ||
			(trip.rider?.toLowerCase().includes(q) ?? false);
		return statusOk && searchOk;
	});

	$: mobileList = tab === 'active' ? [] : filtered;

	function requestNew() {
		goto('/request');
	}
</script>

<svelte:head>
	<title>History | YADA</title>
</svelte:head>

<div class="flex flex-col gap-4 p-4 lg:gap-6 lg:p-0">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold text-ink">Orders</h1>
			<p class="mt-1 hidden text-sm text-ink-secondary lg:block">Delivery history</p>
		</div>

		<!-- Desktop filters -->
		<div class="hidden flex-wrap items-center gap-2 lg:flex">
			<select
				bind:value={statusFilter}
				class="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink"
			>
				<option value="all">Status</option>
				<option value="delivered">Delivered</option>
				<option value="cancelled">Cancelled</option>
			</select>
			<input
				type="search"
				placeholder="Search order #"
				bind:value={search}
				class="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
			/>
		</div>
	</div>

	<!-- Mobile tabs -->
	<div class="lg:hidden">
		<Tabs
			tabs={[
				{ value: 'active', label: 'Active' },
				{ value: 'history', label: 'History' }
			]}
			bind:active={tab}
		/>
	</div>

	<!-- Mobile cards -->
	<div class="flex flex-1 flex-col gap-3 lg:hidden">
		{#if mobileList.length === 0}
			<p class="py-8 text-center text-sm text-ink-secondary">No active orders right now.</p>
		{:else}
			{#each mobileList as order (order.id)}
				<Card>
					<div class="flex items-center justify-between gap-3">
						<div>
							<p class="font-mono-data text-sm text-ink-tertiary">#{order.id}</p>
							<p class="text-sm font-semibold text-ink">{order.destination}</p>
							<p class="text-sm text-ink-secondary">{order.completedAt}</p>
						</div>
						<StatusPill status={order.status} />
					</div>
				</Card>
			{/each}
		{/if}
	</div>

	<!-- Desktop table -->
	<div class="hidden overflow-x-auto rounded-lg border border-border bg-surface lg:block">
		<table class="w-full min-w-[720px] text-left text-sm">
			<thead class="border-b border-border bg-surface-sunken text-ink-secondary">
				<tr>
					<th class="px-4 py-3 font-semibold">Order</th>
					<th class="px-4 py-3 font-semibold">Rider</th>
					<th class="px-4 py-3 font-semibold">Destination</th>
					<th class="px-4 py-3 font-semibold">Completed</th>
					<th class="px-4 py-3 font-semibold">Status</th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as trip (trip.id)}
					<tr class="border-b border-border last:border-0">
						<td class="font-mono-data px-4 py-3">#{trip.id.replace('YD-', '')}</td>
						<td class="px-4 py-3">{trip.rider ?? '—'}</td>
						<td class="px-4 py-3">{trip.destination}</td>
						<td class="px-4 py-3 text-ink-secondary">{trip.completedAt}</td>
						<td class="px-4 py-3"><StatusPill status={trip.status} /></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="lg:hidden">
		<Button variant="primary" size="lg" fullWidth on:click={requestNew}>Request a courier</Button>
	</div>
</div>
