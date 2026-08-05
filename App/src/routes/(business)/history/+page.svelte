<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import Alert from '$lib/components/Alert.svelte';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import RatingStars from '$lib/components/RatingStars.svelte';
	import SelectMenu from '$lib/components/SelectMenu.svelte';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import Tabs from '$lib/components/Tabs.svelte';
	import type { DashboardTripRecord } from '$lib/utils/types';

	let {
		data
	}: {
		data: {
			historyTrips: DashboardTripRecord[];
		};
	} = $props();

	let tab = $state('history');
	let statusFilter = $state('all');

	// `all` is a real choice in the menu rather than the label doing double duty,
	// which is what "Status" as the first option amounted to.
	const statusOptions = [
		{ value: 'all', label: 'All' },
		{ value: 'delivered', label: 'Delivered' },
		{ value: 'cancelled', label: 'Cancelled' }
	];
	let search = $state('');
	let selected = $state<DashboardTripRecord | null>(null);

	const filtered = $derived(
		data.historyTrips.filter((trip) => {
			const statusOk = statusFilter === 'all' || trip.status === statusFilter;
			const q = search.trim().toLowerCase();
			const searchOk =
				!q ||
				trip.id.toLowerCase().includes(q) ||
				trip.destination.toLowerCase().includes(q) ||
				(trip.rider?.toLowerCase().includes(q) ?? false);
			return statusOk && searchOk;
		})
	);

	const mobileList = $derived(tab === 'active' ? [] : filtered);

	/** The rating form inside the details panel; reset per trip on open. */
	let ratingValue = $state(0);
	let ratingBusy = $state(false);
	let ratingError = $state('');

	async function submitRating() {
		if (!selected || ratingValue === 0 || ratingBusy) return;

		ratingBusy = true;
		ratingError = '';

		try {
			const response = await fetch('/api/trips/rate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tripId: selected.rawId, stars: ratingValue })
			});

			const payload = await response.json().catch(() => null);
			if (!response.ok) {
				ratingError = payload?.message ?? 'Could not save your rating.';
				return;
			}

			// The open panel updates in place; the list behind it re-reads so the
			// same trip doesn't offer stars twice.
			selected = { ...selected, myRating: ratingValue };
			await invalidateAll();
		} catch {
			ratingError = 'Could not save your rating. Check your connection.';
		} finally {
			ratingBusy = false;
		}
	}

	function openDetails(trip: DashboardTripRecord) {
		selected = trip;
		ratingValue = 0;
		ratingError = '';
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
			<div class="w-44">
				<SelectMenu
					bind:value={statusFilter}
					label="Status"
					ariaLabel="Filter orders by status"
					options={statusOptions}
				/>
			</div>
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
				<button type="button" class="w-full text-left" onclick={() => openDetails(order)}>
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
						onclick={() => openDetails(trip)}
						onkeydown={(e) => e.key === 'Enter' && openDetails(trip)}
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
</div>

{#if selected}
	<div class="fixed inset-0 z-40 flex justify-end bg-overlay" role="dialog" aria-modal="true">
		<button
			type="button"
			class="absolute inset-0 cursor-default"
			aria-label="Close order details"
			onclick={closeDetails}
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
					onclick={closeDetails}
				>
					Close
				</button>
			</div>

			<div class="mb-4"><StatusPill status={selected.status} /></div>

			<dl class="space-y-4 text-sm">
				<div>
					<dt class="text-eyebrow text-ink-tertiary">
						Destination
					</dt>
					<dd class="mt-1 text-ink">{selected.destination}</dd>
				</div>
				<div>
					<dt class="text-eyebrow text-ink-tertiary">Pickup</dt>
					<dd class="mt-1 text-ink">{selected.pickup ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-eyebrow text-ink-tertiary">Rider</dt>
					<dd class="mt-1 text-ink">{selected.rider ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-eyebrow text-ink-tertiary">
						Completed
					</dt>
					<dd class="mt-1 text-ink">{selected.completedAt ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-eyebrow text-ink-tertiary">Notes</dt>
					<dd class="mt-1 text-ink-secondary">{selected.notes ?? '—'}</dd>
				</div>
			</dl>

			{#if selected.status === 'delivered' && selected.rider}
				<!-- SRS 2.2.1.5 — the catch-up surface for a trip whose completion the
				     business didn't watch happen. -->
				<div class="mt-6 border-t border-border pt-4">
					{#if selected.myRating != null}
						<div class="flex items-center justify-between gap-3">
							<p class="text-sm font-semibold text-ink">Your rating</p>
							<RatingStars value={selected.myRating} readonly size={20} />
						</div>
					{:else}
						<div class="flex flex-col gap-3">
							<p class="text-sm font-semibold text-ink">How was {selected.rider}?</p>
							<RatingStars bind:value={ratingValue} />
							{#if ratingError}
								<Alert>{ratingError}</Alert>
							{/if}
							<Button
								variant="primary"
								size="sm"
								disabled={ratingValue === 0 || ratingBusy}
								onclick={submitRating}
							>
								{ratingBusy ? 'Saving…' : 'Rate rider'}
							</Button>
						</div>
					{/if}
				</div>
			{/if}
		</aside>
	</div>
{/if}
