<script lang="ts">
  import { goto } from '$app/navigation';
  import Card from '$lib/components/Card.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';
  import { toTripStage } from '$lib/shared/trip-status';
  import type { TripStatus } from '$lib/utils/types';
  import IconButton from '$lib/components/IconButton.svelte';
  import IconChevronLeft from '~icons/mdi/chevron-left';
  import IconStar from '~icons/mdi/star';
  import { getCourierOnline } from '../courier-online.svelte';

  let {
    data
  }: {
    data: {
      profile: { name: string; initials: string };
      summary: {
        completedTrips: number;
        tripsToday: number;
        totalDistanceKm: number;
        activeTrips: number;
      };
      rating: { average: number | null; count: number };
      historyTrips: Array<{
        id: string;
        businessName: string;
        pickupAddress: string;
        dropoffAddress: string;
        completedAt: string | null;
        requestedAt: string;
        status: TripStatus;
      }>;
    };
  } = $props();

  const online = getCourierOnline();

  const totalTrips = $derived(data.summary.completedTrips + data.summary.activeTrips);
</script>

<svelte:head>
  <title>Trips | YADA Courier</title>
</svelte:head>

<div class="flex flex-1 flex-col bg-surface-sunken">
  <div class="sticky top-0 z-20 border-b border-border bg-surface-sunken/95 px-4 py-3 backdrop-blur">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-sm font-bold text-primary shadow-sm">
          {data.profile.initials}
        </div>
        <div>
          <p class="text-xs font-medium text-ink-tertiary">Welcome back</p>
          <p class="text-sm font-semibold text-ink">{data.profile.name}</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-2 text-xs font-semibold text-primary shadow-sm"
          onclick={() => goto('/home')}
        >
          <span class="h-2 w-2 rounded-full {online.online ? 'bg-success' : 'bg-ink-disabled'}"></span>
          {online.online ? 'Online' : 'Offline'}
        </button>

        <IconButton ariaLabel="Back to home" onclick={() => goto('/home')}>
          <IconChevronLeft class="h-5 w-5" aria-hidden="true" />
        </IconButton>
      </div>
    </div>

    <div class="mt-3 grid grid-cols-4 gap-2">
      <div class="rounded-lg bg-surface px-3 py-3 shadow-sm">
        <p class="text-eyebrow text-ink-tertiary">Trips</p>
        <p class="font-mono-data mt-1 text-lg font-bold text-ink">{totalTrips}</p>
      </div>
      <div class="rounded-lg bg-surface px-3 py-3 shadow-sm">
        <p class="text-eyebrow text-ink-tertiary">Today</p>
        <p class="font-mono-data mt-1 text-lg font-bold text-ink">{data.summary.tripsToday}</p>
      </div>
      <div class="rounded-lg bg-surface px-3 py-3 shadow-sm">
        <p class="text-eyebrow text-ink-tertiary">Distance</p>
        <p class="font-mono-data mt-1 text-lg font-bold text-ink">{data.summary.totalDistanceKm.toFixed(1)} km</p>
      </div>
      <!-- The score businesses rate them by and matching will rank them by —
           visible to the rider, because a number nobody sees changes nothing. -->
      <div class="rounded-lg bg-surface px-3 py-3 shadow-sm">
        <p class="text-eyebrow text-ink-tertiary">Rating</p>
        <p class="font-mono-data mt-1 flex items-center gap-1 text-lg font-bold text-ink">
          {#if data.rating.average != null}
            {data.rating.average.toFixed(1)}
            <IconStar class="h-4 w-4 shrink-0 text-warning" aria-label="stars" />
          {:else}
            —
          {/if}
        </p>
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
          onclick={() => goto('/home')}
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
              <StatusPill status={toTripStage(trip.status)} />
            </div>
          </Card>
        {/each}
      {/if}
    </div>
  </div>
</div>