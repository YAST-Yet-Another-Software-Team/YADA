<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
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
  <div
    class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-subtle text-success"
  >
    <IconCheck class="h-8 w-8" aria-hidden="true" />
  </div>

  <h1 class="text-2xl font-bold text-ink">Delivered!</h1>
  <!-- What was delivered and where, rather than a line about the backend: the
       rider is checking they finished the right job. -->
  <p class="mt-1 text-sm text-ink-secondary">{data.trip.dropoffAddress}</p>

  <dl
    class="mt-6 w-full space-y-2.5 rounded-lg border border-border bg-surface p-4 text-left text-sm shadow-xs"
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

  <div class="mt-auto w-full space-y-2 pt-8">
    <Button variant="primary" size="lg" fullWidth onclick={backOnline}>Back online</Button>
    <Button variant="neutral" size="sm" fullWidth onclick={() => goto('/trips')}>
      See your trips
    </Button>
  </div>
</div>
