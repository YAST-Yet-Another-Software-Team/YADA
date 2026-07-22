<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import DashboardBoard from '$lib/components/business/DashboardBoard.svelte';
	import DashboardTable from '$lib/components/business/DashboardTable.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import StatusPill from '$lib/components/ui/StatusPill.svelte';
	import {
		activeTrips,
		dashboardStats,
		historyTrips
	} from '$lib/data/mock-trips';
	import { dashboardView } from '$lib/stores/dashboard-view';

	onMount(() => {
		dashboardView.hydrate();
	});

	$: deliveredToday = historyTrips.filter((t) => t.status === 'delivered').slice(0, 2);

	function newRequest() {
		goto('/request');
	}

	function setView(view: 'table' | 'board') {
		dashboardView.set(view);
	}
</script>

<svelte:head>
	<title>Dashboard | YADA</title>
</svelte:head>

<div class="flex flex-col gap-6 p-4 pb-24 lg:p-0 lg:pb-0">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold text-ink">Dashboard</h1>
			<p class="mt-1 text-sm text-ink-secondary">Active deliveries and request status</p>
		</div>

		<div class="flex items-center gap-3">
			<!-- Desktop view toggle -->
			<div class="hidden items-center rounded-md bg-surface-sunken p-1 lg:flex">
				<button
					type="button"
					class="rounded-sm px-3 py-1.5 text-sm font-semibold transition {$dashboardView === 'table'
						? 'bg-surface text-ink shadow-xs'
						: 'text-ink-secondary hover:text-ink'}"
					on:click={() => setView('table')}
				>
					Table
				</button>
				<button
					type="button"
					class="rounded-sm px-3 py-1.5 text-sm font-semibold transition {$dashboardView === 'board'
						? 'bg-surface text-ink shadow-xs'
						: 'text-ink-secondary hover:text-ink'}"
					on:click={() => setView('board')}
				>
					Board
				</button>
			</div>

			<div class="hidden lg:block">
				<Button variant="primary" size="sm" on:click={newRequest}>+ New request</Button>
			</div>
		</div>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
		<div class="rounded-lg border border-border bg-surface p-4 shadow-xs">
			<p class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
				Active deliveries
			</p>
			<p class="font-mono-data mt-2 text-2xl font-bold text-ink lg:text-[26px]">
				{dashboardStats.activeDeliveries}
			</p>
		</div>
		<div class="hidden rounded-lg border border-border bg-surface p-4 shadow-xs lg:block">
			<p class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
				Avg. pickup time
			</p>
			<p class="font-mono-data mt-2 text-[26px] font-bold text-ink">{dashboardStats.avgPickupTime}</p>
		</div>
		<div class="rounded-lg border border-border bg-surface p-4 shadow-xs">
			<p class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
				Delivered today
			</p>
			<p class="font-mono-data mt-2 text-2xl font-bold text-ink lg:text-[26px]">
				{dashboardStats.deliveredToday}
			</p>
		</div>
	</div>

	<!-- Mobile: card list -->
	<section class="flex flex-col gap-3 lg:hidden">
		<h2 class="text-base font-semibold text-ink">Active requests</h2>
		{#each activeTrips as trip (trip.id)}
			<Card>
				<div class="flex items-center justify-between gap-3">
					<div>
						<p class="text-sm font-semibold text-ink">
							#{trip.id.replace('YD-', '')} · {trip.destination}
						</p>
						{#if trip.rider}
							<p class="text-sm text-ink-secondary">{trip.rider}</p>
						{/if}
					</div>
					<StatusPill status={trip.status} />
				</div>
			</Card>
		{/each}
	</section>

	<!-- Desktop: table or board -->
	<section class="hidden flex-col gap-4 lg:flex">
		{#if $dashboardView === 'table'}
			<div class="flex items-center justify-between">
				<h2 class="text-base font-semibold text-ink">Active requests</h2>
			</div>
			<DashboardTable trips={activeTrips} />
		{:else}
			<DashboardBoard trips={activeTrips} {deliveredToday} />
		{/if}
	</section>

	<!-- Mobile sticky CTA -->
	<div
		class="fixed bottom-0 left-0 right-0 border-t border-border bg-surface p-4 lg:hidden"
	>
		<Button variant="primary" size="lg" fullWidth on:click={newRequest}>+ New request</Button>
	</div>
</div>
