<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';
  import { toTripStage } from '$lib/shared/trip-status';
  import type { TripStatus } from '$lib/utils/types';
  import IconStar from '~icons/mdi/star';
  import IconHistory from '~icons/mdi/history';

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

  const totalTrips = $derived(data.summary.completedTrips + data.summary.activeTrips);

  function when(trip: { completedAt: string | null; requestedAt: string }) {
    return new Date(trip.completedAt ?? trip.requestedAt).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
</script>

<svelte:head>
  <title>Trips | YADA Courier</title>
</svelte:head>

<!-- No avatar, no online switch, no back button: the tab bar navigates, Home
     owns the shift switch, and Settings owns the account. This screen used to
     repeat all three at the cost of a third of the viewport. What is left is
     what only it has — the rider's numbers, and what they have carried. -->
<div class="flex flex-1 flex-col gap-4 bg-bg p-4">
  <div class="grid grid-cols-2 gap-3">
    <div class="rounded-lg border border-border bg-surface p-4 shadow-xs">
      <p class="text-eyebrow text-ink-tertiary">Trips</p>
      <p class="font-mono-data mt-2 text-2xl font-bold text-ink">{totalTrips}</p>
    </div>
    <div class="rounded-lg border border-border bg-surface p-4 shadow-xs">
      <p class="text-eyebrow text-ink-tertiary">Today</p>
      <p class="font-mono-data mt-2 text-2xl font-bold text-ink">{data.summary.tripsToday}</p>
    </div>
    <div class="rounded-lg border border-border bg-surface p-4 shadow-xs">
      <p class="text-eyebrow text-ink-tertiary">Distance</p>
      <p class="font-mono-data mt-2 text-2xl font-bold text-ink">
        {data.summary.totalDistanceKm.toFixed(1)} km
      </p>
    </div>
    <!-- The score businesses rate them by and matching ranks them by — visible
         to the rider, because a number nobody sees changes nothing. -->
    <div class="rounded-lg border border-border bg-surface p-4 shadow-xs">
      <p class="text-eyebrow text-ink-tertiary">Rating</p>
      <p class="font-mono-data mt-2 flex items-center gap-1.5 text-2xl font-bold text-ink">
        {#if data.rating.average != null}
          {data.rating.average.toFixed(1)}
          <IconStar class="h-5 w-5 shrink-0 text-warning" aria-label="stars" />
          <span class="text-sm font-medium text-ink-tertiary">({data.rating.count})</span>
        {:else}
          —
        {/if}
      </p>
    </div>
  </div>

  <div class="flex flex-1 flex-col gap-3">
    <h2 class="text-base font-semibold text-ink">History</h2>

    {#if data.historyTrips.length === 0}
      <div
        class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center"
      >
        <IconHistory class="h-8 w-8 text-ink-tertiary" aria-hidden="true" />
        <p class="text-sm font-semibold text-ink">No trips yet</p>
        <p class="text-sm text-ink-secondary">
          Deliveries you complete are kept here with the distance you covered.
        </p>
      </div>
    {:else}
      {#each data.historyTrips as trip (trip.id)}
        <Card>
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 space-y-1">
              <p class="font-mono-data text-xs text-ink-tertiary">
                #{trip.id.slice(0, 8).toUpperCase()}
              </p>
              <p class="truncate text-sm font-semibold text-ink">{trip.dropoffAddress}</p>
              <p class="truncate text-sm text-ink-secondary">{trip.businessName}</p>
              <p class="text-xs text-ink-tertiary">{when(trip)}</p>
            </div>
            <StatusPill status={toTripStage(trip.status)} />
          </div>
        </Card>
      {/each}
    {/if}
  </div>
</div>
