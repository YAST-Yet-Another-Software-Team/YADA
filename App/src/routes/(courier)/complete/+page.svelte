<script lang="ts">
  import { goto } from '$app/navigation';
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import RatingStars from '$lib/components/RatingStars.svelte';
  import { formatRideTimeBetween } from '$lib/shared/ride-time';
  import IconCheck from '~icons/mdi/check-bold';

  let {
    data
  }: {
    data: {
      trip: {
        id: string;
        businessName: string;
        pickupAddress: string;
        dropoffAddress: string;
        acceptedAt: string | null;
        completedAt: string | null;
        estimatedDistanceKm: number | null;
        myRating: number | null;
      };
    };
  } = $props();

  const distance = $derived(
    data.trip.estimatedDistanceKm != null ? `${data.trip.estimatedDistanceKm.toFixed(1)} km` : '—'
  );

  /**
   * What the ride took, from the rider's own accept to their own completion —
   * not what the map predicted before they set off. This screen is the receipt
   * for a job just finished, so a forecast here would be the one number on it
   * that isn't a record of what happened.
   */
  const duration = $derived(
    formatRideTimeBetween(data.trip.acceptedAt, data.trip.completedAt) ?? '—'
  );

  /** In the rider's own clock, not the server's. */
  const completedTime = $derived(
    data.trip.completedAt
      ? new Date(data.trip.completedAt).toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit'
        })
      : null
  );

  /**
   * The rider's verdict on the business (SRS 3.4), offered here because this is
   * the moment they have an opinion — they have just left the place. The trips
   * list carries the same form for anyone who tapped past this screen.
   *
   * The server's answer is the source of truth, so a reload after rating shows
   * the stars read-only instead of a form the API would reject as a duplicate.
   * `submitted` only covers the gap before that reload, and is keyed by trip so
   * that arriving here for a *different* delivery — this screen takes a
   * `?tripId=` — doesn't inherit the stars given to the last one.
   */
  let submitted = $state<{ tripId: string; stars: number } | null>(null);
  const myRating = $derived(
    submitted?.tripId === data.trip.id ? submitted.stars : data.trip.myRating
  );
  let ratingValue = $state(0);
  let ratingComment = $state('');
  let ratingBusy = $state(false);
  let ratingError = $state('');

  async function submitRating() {
    if (ratingValue === 0 || ratingBusy) return;

    ratingBusy = true;
    ratingError = '';

    try {
      const response = await fetch('/api/trips/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: data.trip.id,
          stars: ratingValue,
          comment: ratingComment.trim() || undefined
        })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        ratingError = payload?.message ?? 'Could not save your rating.';
        return;
      }

      submitted = { tripId: data.trip.id, stars: ratingValue };
    } catch {
      ratingError = 'Could not save your rating. Check your connection.';
    } finally {
      ratingBusy = false;
    }
  }

  function backOnline() {
    goto('/home');
  }
</script>

<svelte:head>
  <title>Delivered | YADA Courier</title>
</svelte:head>

<div
  class="flex h-full min-h-[inherit] flex-1 flex-col items-center bg-bg px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-10 text-center"
>
  <!-- A moment worth staggering: this screen is the reward for finishing a
       job, and everything on it arrives in the order the rider reads it. -->
  <div
    class="rise mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-subtle text-success"
  >
    <IconCheck class="h-8 w-8" aria-hidden="true" />
  </div>

  <h1 class="rise text-2xl font-bold text-ink" style="--rise-delay: 70ms">Delivered!</h1>
  <!-- What was delivered and where, rather than a line about the backend: the
       rider is checking they finished the right job. -->
  <p class="rise mt-1 text-sm text-ink-secondary" style="--rise-delay: 110ms">
    {data.trip.dropoffAddress}
  </p>

  <dl
    class="rise mt-6 w-full space-y-2.5 rounded-lg border border-border bg-surface p-4 text-left text-sm shadow-xs"
    style="--rise-delay: 170ms"
  >
    <div class="flex items-center justify-between gap-3">
      <dt class="text-ink-secondary">Distance</dt>
      <dd class="font-mono-data font-semibold text-ink">{distance}</dd>
    </div>
    <div class="flex items-center justify-between gap-3">
      <dt class="text-ink-secondary">Time</dt>
      <dd class="font-mono-data font-semibold text-ink">{duration}</dd>
    </div>
    <div class="flex items-center justify-between gap-3">
      <dt class="text-ink-secondary">For</dt>
      <dd class="min-w-0 truncate font-semibold text-ink">{data.trip.businessName}</dd>
    </div>
    <div class="flex items-center justify-between gap-3">
      <dt class="text-ink-secondary">Order</dt>
      <dd class="font-mono-data font-semibold text-ink">
        #{data.trip.id.slice(0, 8).toUpperCase()}
        {#if completedTime}
          <span class="text-ink-tertiary">· {completedTime}</span>
        {/if}
      </dd>
    </div>
  </dl>

  <!-- Rating the business, mirroring what the business gets on its own
       completion screen. Below the receipt because the receipt is what the
       rider came here to check; above the buttons because tapping either of
       those leaves, and the stars would be missed entirely under them. -->
  <div
    class="rise mt-4 w-full rounded-lg border border-border bg-surface p-4 text-left shadow-xs"
    style="--rise-delay: 240ms"
  >
    {#if myRating != null}
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-semibold text-ink">Your rating</p>
        <RatingStars value={myRating} readonly size={20} />
      </div>
    {:else}
      <div class="flex flex-col gap-3">
        <p class="text-sm font-semibold text-ink">
          How was {data.trip.businessName}?
        </p>
        <RatingStars bind:value={ratingValue} />
        <textarea
          bind:value={ratingComment}
          rows={2}
          maxlength={500}
          placeholder="Anything worth noting? (optional)"
          class="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-disabled focus:border-primary"
        ></textarea>
        {#if ratingError}
          <Alert>{ratingError}</Alert>
        {/if}
        <Button
          variant="primary"
          size="sm"
          disabled={ratingValue === 0 || ratingBusy}
          onclick={submitRating}
        >
          {ratingBusy ? 'Saving…' : 'Rate business'}
        </Button>
      </div>
    {/if}
  </div>

  <div class="rise mt-auto w-full space-y-2 pt-8" style="--rise-delay: 310ms">
    <Button variant="primary" size="lg" fullWidth onclick={backOnline}>Back online</Button>
    <Button variant="neutral" size="sm" fullWidth onclick={() => goto('/trips')}>
      See your trips
    </Button>
  </div>
</div>
