<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';

  export let data: {
    trip: {
      id: string;
      businessName: string;
      pickupAddress: string;
      dropoffAddress: string;
      completedAt: string | null;
      estimatedDistanceKm: number | null;
      estimatedPayout: number;
    };
    earningsLabel: string;
  };

  function backOnline() {
    goto('/courier/home');
  }
</script>

<svelte:head>
  <title>Delivered | YADA Courier</title>
</svelte:head>

<div class="flex h-full min-h-[inherit] flex-1 flex-col items-center bg-bg px-6 py-10 text-center">
  <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-subtle text-success">
    <svg viewBox="0 0 24 24" class="h-8 w-8" fill="none" stroke="currentColor" stroke-width="2.5">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  </div>

  <h1 class="text-2xl font-bold text-ink">Delivered!</h1>
  <p class="mt-1 text-sm text-ink-secondary">{data.trip.businessName} has been updated in the backend.</p>

  <div class="mt-6 w-full">
    <Card>
      <div class="flex flex-col gap-3 text-left text-sm">
        <div class="flex items-center justify-between">
          <span class="text-ink-secondary">Trip earnings</span>
          <span class="font-mono-data font-semibold text-ink">{data.earningsLabel}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-ink-secondary">Distance</span>
          <span class="font-mono-data font-semibold text-ink">{data.trip.estimatedDistanceKm != null ? `${data.trip.estimatedDistanceKm.toFixed(1)} km` : '—'}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-ink-secondary">Order</span>
          <span class="font-mono-data font-semibold text-ink">#{data.trip.id.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>
    </Card>
  </div>

  <div class="mt-auto w-full pt-8">
    <Button variant="primary" size="lg" fullWidth on:click={backOnline}>Back online</Button>
  </div>
</div>