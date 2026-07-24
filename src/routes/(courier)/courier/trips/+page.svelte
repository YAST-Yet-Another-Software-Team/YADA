<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import StatusPill from '$lib/components/ui/StatusPill.svelte';
  import IconButton from '$lib/components/ui/IconButton.svelte';
  import { courierOnline } from '$lib/stores/courier-online';

  export let data: {
    profile: { name: string; initials: string };
    summary: {
      completedTrips: number;
      tripsToday: number;
      totalDistanceKm: number;
      activeTrips: number;
    };
    historyTrips: Array<{
      id: string;
      businessName: string;
      pickupAddress: string;
      dropoffAddress: string;
      completedAt: string | null;
      requestedAt: string;
      status: 'searching' | 'assigned' | 'en_route' | 'arrived' | 'delivered' | 'cancelled';
    }>;
  };

  onMount(() => {
    courierOnline.hydrate();
  });

  $: totalTrips = data.summary.completedTrips + data.summary.activeTrips;
</script>

<svelte:head>
  <title>Trips | YADA Courier</title>
</svelte:head>

<div class="flex flex-1 flex-col bg-[#eef3ff]">
  <div class="sticky top-0 z-20 border-b border-white/70 bg-[#eef3ff]/95 px-4 py-3 backdrop-blur">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-primary shadow-sm">
          {data.profile.initials}
        </div>
        <div>
          <p class="text-[11px] font-medium text-ink-tertiary">Welcome back</p>
          <p class="text-sm font-semibold text-ink">{data.profile.name}</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-primary shadow-sm"
          on:click={() => goto('/courier/home')}
        >
          <span class="h-2 w-2 rounded-full {$courierOnline ? 'bg-success' : 'bg-neutral-400'}"></span>
          {$courierOnline ? 'Online' : 'Offline'}
        </button>

        <IconButton ariaLabel="Back to home" on:click={() => goto('/courier/home')}>
          <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </IconButton>
      </div>
    </div>

    <div class="mt-3 grid grid-cols-3 gap-2">
      <div class="rounded-2xl bg-white px-3 py-3 shadow-sm">
        <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Trips</p>
        <p class="font-mono-data mt-1 text-lg font-bold text-ink">{totalTrips}</p>
      </div>
      <div class="rounded-2xl bg-white px-3 py-3 shadow-sm">
        <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Today</p>
        <p class="font-mono-data mt-1 text-lg font-bold text-ink">{data.summary.tripsToday}</p>
      </div>
      <div class="rounded-2xl bg-white px-3 py-3 shadow-sm">
        <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Distance</p>
        <p class="font-mono-data mt-1 text-lg font-bold text-ink">{data.summary.totalDistanceKm.toFixed(1)} km</p>
      </div>
    </div>
  </div>

  <div class="flex flex-1 flex-col gap-4 px-4 py-4">
    <Card>
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-ink">Trip history</p>
          <p class="text-xs text-ink-secondary">Completed deliveries and active assignments.</p>
        </div>
        <button
          type="button"
          class="rounded-full bg-primary-subtle px-3 py-2 text-xs font-semibold text-primary"
          on:click={() => goto('/courier/home')}
        >
          Home
        </button>
      </div>
    </Card>

    <div class="flex flex-col gap-3">
      {#if data.historyTrips.length === 0}
        <Card>
          <p class="text-sm text-ink-secondary">No trip history yet.</p>
        </Card>
      {:else}
        {#each data.historyTrips as trip (trip.id)}
          <Card>
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1">
                <p class="font-mono-data text-xs text-ink-tertiary">#{trip.id.slice(0, 8).toUpperCase()}</p>
                <p class="text-sm font-semibold text-ink">{trip.dropoffAddress}</p>
                <p class="text-sm text-ink-secondary">{trip.businessName}</p>
                <p class="text-xs text-ink-tertiary">{trip.pickupAddress}</p>
                <p class="text-xs text-ink-tertiary">
                  {trip.completedAt ? new Date(trip.completedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : new Date(trip.requestedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
              <StatusPill status={trip.status} />
            </div>
          </Card>
        {/each}
      {/if}
    </div>
  </div>
</div>