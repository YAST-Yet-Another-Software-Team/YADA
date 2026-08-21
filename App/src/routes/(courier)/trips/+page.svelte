<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import RatingStars from '$lib/components/RatingStars.svelte';
  import ClosedAccountTag from '$lib/components/ClosedAccountTag.svelte';
  import StatusPill from '$lib/components/StatusPill.svelte';
  import { toTripStage } from '$lib/shared/trip-status';
  import type { TripStatus } from '$lib/utils/types';
  import IconStar from '~icons/mdi/star';
  import IconHistory from '~icons/mdi/history';

  type HistoryTrip = {
    id: string;
    businessName: string;
    businessDeleted: boolean;
    pickupAddress: string;
    dropoffAddress: string;
    completedAt: string | null;
    requestedAt: string;
    status: TripStatus;
    myRating: number | null;
  };

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
      historyTrips: HistoryTrip[];
    };
  } = $props();

  const totalTrips = $derived(data.summary.completedTrips + data.summary.activeTrips);

  /**
   * The catch-up surface for the rider→business rating: the completion screen
   * asks first, and anything tapped past lands here.
   *
   * State is keyed by trip id rather than held per card, because the cards are
   * an `{#each}` over server data — a component-local `let` would be reused by
   * whichever trip took that slot after an `invalidateAll`, and the stars a
   * rider picked for one business would reappear under another.
   */
  let openFor = $state<string | null>(null);
  let ratingValue = $state(0);
  let ratingBusy = $state(false);
  let ratingError = $state('');

  function openRating(tripId: string) {
    openFor = openFor === tripId ? null : tripId;
    ratingValue = 0;
    ratingError = '';
  }

  async function submitRating(tripId: string) {
    if (ratingValue === 0 || ratingBusy) return;

    ratingBusy = true;
    ratingError = '';

    try {
      const response = await fetch('/api/trips/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, stars: ratingValue })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        ratingError = payload?.message ?? 'Could not save your rating.';
        return;
      }

      // Re-read rather than patch the row in place: the server owns `myRating`,
      // and the closed form must not depend on this component guessing right.
      openFor = null;
      await invalidateAll();
    } catch {
      ratingError = 'Could not save your rating. Check your connection.';
    } finally {
      ratingBusy = false;
    }
  }

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
  <div class="rise grid grid-cols-2 gap-3">
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

  <!-- The whole history block rises together: rating a trip calls
       `invalidateAll`, which re-keys the each, and per-card entrances would
       replay the entire list on every submit. -->
  <div class="rise flex flex-1 flex-col gap-3" style="--rise-delay: 90ms">
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
              <p class="truncate text-sm text-ink-secondary">
                {trip.businessName}
                {#if trip.businessDeleted}<ClosedAccountTag compact />{/if}
              </p>
              <p class="text-xs text-ink-tertiary">{when(trip)}</p>
            </div>
            <StatusPill status={toTripStage(trip.status)} />
          </div>

          <!-- Only completed trips: a cancelled delivery is one that didn't
               happen, and the API refuses to rate it, so offering the stars
               here would be a button whose only outcome is an error. -->
          {#if trip.status === 'completed'}
            <div class="mt-3 border-t border-border pt-3">
              {#if trip.myRating != null}
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm text-ink-secondary">Your rating</p>
                  <RatingStars value={trip.myRating} readonly size={18} />
                </div>
              {:else if openFor === trip.id}
                <div class="flex flex-col gap-3">
                  <p class="text-sm font-semibold text-ink">How was {trip.businessName}?</p>
                  <RatingStars bind:value={ratingValue} />
                  {#if ratingError}
                    <Alert>{ratingError}</Alert>
                  {/if}
                  <div class="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={ratingValue === 0 || ratingBusy}
                      onclick={() => submitRating(trip.id)}
                    >
                      {ratingBusy ? 'Saving…' : 'Submit'}
                    </Button>
                    <Button variant="neutral" size="sm" onclick={() => (openFor = null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              {:else}
                <Button variant="neutral" size="sm" onclick={() => openRating(trip.id)}>
                  Rate business
                </Button>
              {/if}
            </div>
          {/if}
        </Card>
      {/each}
    {/if}
  </div>
</div>
