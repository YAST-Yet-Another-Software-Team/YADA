<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import DashboardBoard from '$lib/components/business/DashboardBoard.svelte';
	import DashboardTable from '$lib/components/business/DashboardTable.svelte';
	import MapBackdrop from '$lib/components/MapBackdrop.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import StatusPill from '$lib/components/ui/StatusPill.svelte';
	import type { DashboardTripRecord } from '$lib/server/dashboard-data';
	import { dashboardView } from '$lib/stores/dashboard-view';

	export let data: {
		dashboard: {
			activeTrips: DashboardTripRecord[];
			historyTrips: DashboardTripRecord[];
			businessProfile: {
				name: string;
				businessName: string;
				email: string | null;
				phone: string | null;
				address: string;
				lat: number;
				lng: number;
			} | null;
		};
	};

	let selected: DashboardTripRecord | null = null;

	onMount(() => {
		dashboardView.hydrate();
	});

	$: deliveredToday = data.dashboard.historyTrips.filter((t) => t.status === 'delivered').slice(0, 2);

	function newRequest() {
		goto('/request');
	}

	function setView(view: 'table' | 'board') {
		dashboardView.set(view);
	}

	function selectTrip(trip: DashboardTripRecord) {
		selected = trip;
	}

	function closePanel() {
		selected = null;
	}
</script>

<svelte:head>
	<title>Dashboard | YADA</title>
</svelte:head>

<div class="relative flex flex-col gap-6 p-4 pb-24 lg:p-0 lg:pb-0">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold text-ink">Dashboard</h1>
			<p class="mt-1 text-sm text-ink-secondary">Active deliveries and request status</p>
		</div>

		<div class="flex items-center gap-3">
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

	<div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
		<div class="rounded-lg border border-border bg-surface p-4 shadow-xs">
			<p class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
				Active deliveries
			</p>
			<p class="font-mono-data mt-2 text-2xl font-bold text-ink lg:text-[26px]">
				{data.dashboard.activeTrips.length}
			</p>
		</div>
		<div class="hidden rounded-lg border border-border bg-surface p-4 shadow-xs lg:block">
			<p class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
				Avg. pickup time
			</p>
			<p class="font-mono-data mt-2 text-[26px] font-bold text-ink">
				{data.dashboard.activeTrips.length > 0 ? 'Live' : '—'}
			</p>
		</div>
		<div class="rounded-lg border border-border bg-surface p-4 shadow-xs">
			<p class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
				Delivered today
			</p>
			<p class="font-mono-data mt-2 text-2xl font-bold text-ink lg:text-[26px]">
				{data.dashboard.historyTrips.filter((t) => t.status === 'delivered').length}
			</p>
		</div>
	</div>

	<section class="flex flex-col gap-3 lg:hidden">
		<h2 class="text-base font-semibold text-ink">Active requests</h2>
		{#each data.dashboard.activeTrips as trip (trip.id)}
			<button type="button" class="w-full text-left" on:click={() => selectTrip(trip)}>
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
			</button>
		{/each}
	</section>

	<section class="hidden flex-col gap-4 lg:flex">
		{#if $dashboardView === 'table'}
			<div class="flex items-center justify-between">
				<h2 class="text-base font-semibold text-ink">Active requests</h2>
				<p class="text-sm text-ink-tertiary">Click a row to see the rider on the map</p>
			</div>
			<DashboardTable trips={data.dashboard.activeTrips} on:select={(e) => selectTrip(e.detail)} />
		{:else}
			<DashboardBoard
				trips={data.dashboard.activeTrips}
				{deliveredToday}
				on:select={(e) => selectTrip(e.detail)}
			/>
		{/if}
	</section>

	<div class="fixed bottom-0 left-0 right-0 border-t border-border bg-surface p-4 lg:hidden">
		<Button variant="primary" size="lg" fullWidth on:click={newRequest}>+ New request</Button>
	</div>
</div>

{#if selected}
	<!-- Overlay map panel (stays on dashboard) -->
	<div class="fixed inset-0 z-40 flex justify-end bg-[color:var(--color-overlay)]" role="dialog" aria-modal="true">
		<button
			type="button"
			class="absolute inset-0 cursor-default"
			aria-label="Close map panel"
			on:click={closePanel}
		></button>
		<aside
			class="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-border bg-surface shadow-lg"
		>
			<div class="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
				<div>
					<p class="font-mono-data text-xs text-ink-tertiary">#{selected.id}</p>
					<h2 class="text-lg font-semibold text-ink">{selected.destination}</h2>
					<div class="mt-2"><StatusPill status={selected.status} /></div>
				</div>
				<button
					type="button"
					class="rounded-md px-2 py-1 text-sm font-semibold text-ink-secondary hover:bg-neutral-100"
					on:click={closePanel}
				>
					Close
				</button>
			</div>

			<div class="relative min-h-0 flex-1">
				<MapBackdrop
					routeLabel={selected.status === 'en_route'}
					showZone
					center={selected.dropoffLat != null && selected.dropoffLng != null
						? { lat: selected.dropoffLat, lng: selected.dropoffLng }
						: data.dashboard.businessProfile
							? {
									lat: data.dashboard.businessProfile.lat,
									lng: data.dashboard.businessProfile.lng
								}
							: null}
					markers={[
						...(data.dashboard.businessProfile
							? [
									{
										id: 'hq',
										lat: data.dashboard.businessProfile.lat,
										lng: data.dashboard.businessProfile.lng,
										label: data.dashboard.businessProfile.businessName,
										role: 'business' as const
									}
								]
							: []),
						...(selected.pickupLat != null && selected.pickupLng != null
							? [
									{
										id: 'pickup',
										lat: selected.pickupLat,
										lng: selected.pickupLng,
										label: 'Pickup',
										role: 'pickup' as const
									}
								]
							: []),
						...(selected.dropoffLat != null && selected.dropoffLng != null
							? [
									{
										id: 'dropoff',
										lat: selected.dropoffLat,
										lng: selected.dropoffLng,
										label: selected.destination,
										role: 'dropoff' as const
									}
								]
							: [])
					]}
				>
					{#if !selected.rider}
						<div
							class="absolute left-1/2 top-[42%] z-10 -translate-x-1/2 rounded-md bg-surface px-3 py-2 text-sm text-ink-secondary shadow-sm"
						>
							Searching for a nearby motor rider…
						</div>
					{/if}
				</MapBackdrop>
			</div>

			<div class="space-y-2 border-t border-border px-5 py-4 text-sm">
				<p class="text-ink-secondary">
					<span class="font-semibold text-ink">Rider:</span>
					{selected.rider ?? 'Unassigned'}
				</p>
				{#if selected.eta}
					<p class="text-ink-secondary">
						<span class="font-semibold text-ink">ETA:</span>
						<span class="font-mono-data text-primary">{selected.eta}</span>
					</p>
				{/if}
				<p class="text-ink-secondary">
					<span class="font-semibold text-ink">Pickup:</span>
					{selected.pickup ?? data.dashboard.businessProfile?.address ?? '—'}
				</p>
			</div>
		</aside>
	</div>
{/if}
