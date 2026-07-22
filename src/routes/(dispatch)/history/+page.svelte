<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import StatusPill from '$lib/components/ui/StatusPill.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { historyTrips, type MockTrip } from '$lib/data/mock-trips';

	let tab = 'history';
	let statusFilter = 'all';
	let search = '';
	let selected: MockTrip | null = null;

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

	function openDetails(trip: MockTrip) {
		selected = trip;
	}

	function closeDetails() {
		selected = null;
	}
</script>

<svelte:head>
	<title>History | YADA</title>
</svelte:head>

<div class="flex flex-col gap-4 p-4 lg:gap-6 lg:p-0">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold text-ink">Orders</h1>
			<p class="mt-1 hidden text-sm text-ink-secondary lg:block">
				Delivery history — click an order for details
			</p>
		</div>

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

	<div class="lg:hidden">
		<Tabs
			tabs={[
				{ value: 'active', label: 'Active' },
				{ value: 'history', label: 'History' }
			]}
			bind:active={tab}
		/>
	</div>

	<div class="flex flex-1 flex-col gap-3 lg:hidden">
		{#if mobileList.length === 0}
			<p class="py-8 text-center text-sm text-ink-secondary">No active orders right now.</p>
		{:else}
			{#each mobileList as order (order.id)}
				<button type="button" class="w-full text-left" on:click={() => openDetails(order)}>
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
				</button>
			{/each}
		{/if}
	</div>

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
					<tr
						class="cursor-pointer border-b border-border last:border-0 transition hover:bg-primary-subtle"
						on:click={() => openDetails(trip)}
						on:keydown={(e) => e.key === 'Enter' && openDetails(trip)}
						tabindex="0"
						role="button"
					>
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

{#if selected}
	<div class="fixed inset-0 z-40 flex justify-end bg-[color:var(--color-overlay)]" role="dialog" aria-modal="true">
		<button
			type="button"
			class="absolute inset-0 cursor-default"
			aria-label="Close order details"
			on:click={closeDetails}
		></button>
		<aside
			class="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-surface p-6 shadow-lg"
		>
			<div class="mb-6 flex items-start justify-between gap-3">
				<div>
					<p class="font-mono-data text-xs text-ink-tertiary">#{selected.id}</p>
					<h2 class="text-xl font-semibold text-ink">Order details</h2>
				</div>
				<button
					type="button"
					class="rounded-md px-2 py-1 text-sm font-semibold text-ink-secondary hover:bg-neutral-100"
					on:click={closeDetails}
				>
					Close
				</button>
			</div>

			<div class="mb-4"><StatusPill status={selected.status} /></div>

			<dl class="space-y-4 text-sm">
				<div>
					<dt class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
						Destination
					</dt>
					<dd class="mt-1 text-ink">{selected.destination}</dd>
				</div>
				<div>
					<dt class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Pickup</dt>
					<dd class="mt-1 text-ink">{selected.pickup ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Rider</dt>
					<dd class="mt-1 text-ink">{selected.rider ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
						Completed
					</dt>
					<dd class="mt-1 text-ink">{selected.completedAt ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Notes</dt>
					<dd class="mt-1 text-ink-secondary">{selected.notes ?? '—'}</dd>
				</div>
			</dl>
		</aside>
	</div>
{/if}
