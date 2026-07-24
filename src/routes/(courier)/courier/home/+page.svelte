<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import Button from '$lib/components/ui/Button.svelte';
  import IconButton from '$lib/components/ui/IconButton.svelte';
  import MapBackdrop from '$lib/components/MapBackdrop.svelte';
  import { courierOnline } from '$lib/stores/courier-online';
  import { KUMASI_CENTER } from '$lib/geo/service-area';

  export let data: {
    profile: { name: string; initials: string };
    activeTrip: {
      id: string;
      status: 'assigned' | 'en_route' | 'arrived' | 'delivered' | 'cancelled' | 'searching';
      businessName: string;
      pickupAddress: string;
      dropoffAddress: string;
      pickupLat: number | null;
      pickupLng: number | null;
      dropoffLat: number | null;
      dropoffLng: number | null;
      notes: string | null;
      estimatedPayout: number;
    } | null;
    pendingRequests: Array<{
      id: string;
      businessName: string;
      pickupAddress: string;
      dropoffAddress: string;
      pickupLat: number | null;
      pickupLng: number | null;
      dropoffLat: number | null;
      dropoffLng: number | null;
      notes: string | null;
    }>;
    summary: {
      walletBalance: number;
      completedTrips: number;
      tripsToday: number;
      totalDistanceKm: number;
      activeTrips: number;
    };
  };

  let acceptingId: string | null = null;

  onMount(() => {
    courierOnline.hydrate();
  });

  $: currentRequest = data.pendingRequests[0] ?? null;
  $: heroTrip = data.activeTrip ?? currentRequest;
  $: pickupPoint = heroTrip?.pickupLat != null && heroTrip?.pickupLng != null ? { lat: heroTrip.pickupLat, lng: heroTrip.pickupLng } : KUMASI_CENTER;
  $: dropoffPoint = heroTrip?.dropoffLat != null && heroTrip?.dropoffLng != null ? { lat: heroTrip.dropoffLat, lng: heroTrip.dropoffLng } : null;
  $: routePath = pickupPoint && dropoffPoint ? [pickupPoint, dropoffPoint] : [];
  $: statusLabel = data.activeTrip
    ? data.activeTrip.status === 'en_route'
      ? 'On the way'
      : data.activeTrip.status === 'arrived'
        ? 'Arrived'
        : 'Active trip'
    : 'Online';

  async function acceptRequest(requestId: string) {
    if (acceptingId || !$courierOnline) return;

    acceptingId = requestId;
    try {
      const response = await fetch('/api/courier/accept-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: requestId })
      });

      if (!response.ok) {
        throw new Error('Unable to accept request');
      }

      const payload = await response.json();
      if (payload.ok) {
        goto(`/courier/pickup?tripId=${encodeURIComponent(payload.tripId)}`);
      }
    } finally {
      acceptingId = null;
    }
  }

  function openActiveTrip() {
    if (!data.activeTrip) return;
    const route = data.activeTrip.status === 'en_route' ? '/courier/deliver' : '/courier/pickup';
    goto(`${route}?tripId=${encodeURIComponent(data.activeTrip.id)}`);
  }

  function toggleOnline() {
    if ($courierOnline) {
      courierOnline.goOffline();
    } else {
      courierOnline.goOnline();
    }
  }
</script>

<svelte:head>
  <title>Home | YADA Courier</title>
</svelte:head>

<div class="flex flex-1 flex-col bg-[#eef3ff]">
  <div class="sticky top-0 z-20 border-b border-white/70 bg-[#eef3ff]/90 px-4 py-3 backdrop-blur">
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
          on:click={toggleOnline}
        >
          <span class="h-2 w-2 rounded-full { $courierOnline ? 'bg-success' : 'bg-neutral-400' }"></span>
          {$courierOnline ? 'Online' : 'Offline'}
        </button>

        <IconButton ariaLabel="Go to trips" on:click={() => goto('/courier/trips')}>
          <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </IconButton>
      </div>
    </div>
  </div>

  <div class="relative flex min-h-0 flex-1 flex-col">
    <div class="relative min-h-[58vh] flex-1">
      <MapBackdrop
        routeLabel
        center={pickupPoint}
        markers={heroTrip
          ? [
              {
                id: 'pickup',
                lat: pickupPoint.lat,
                lng: pickupPoint.lng,
                label: 'Pickup',
                role: 'pickup'
              },
              ...(dropoffPoint
                ? [
                    {
                      id: 'dropoff',
                      lat: dropoffPoint.lat,
                      lng: dropoffPoint.lng,
                      label: 'Dropoff',
                      role: 'dropoff' as const
                    }
                  ]
                : [])
            ]
          : []}
        polylinePath={routePath}
      />

      <div class="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm">
        {statusLabel}
      </div>

      <div class="absolute inset-x-4 bottom-4 rounded-[28px] border border-white/60 bg-white/96 p-4 shadow-[0_24px_60px_rgba(29,78,216,0.16)] backdrop-blur">
        {#if data.activeTrip}
          <div in:fade={{ duration: 160 }} class="space-y-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Active trip</p>
                <h1 class="mt-1 text-xl font-bold text-ink">{data.activeTrip.businessName}</h1>
                <p class="mt-1 text-sm text-ink-secondary">{data.activeTrip.pickupAddress} → {data.activeTrip.dropoffAddress}</p>
              </div>
              <div class="rounded-2xl bg-primary-subtle px-3 py-2 text-right">
                <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">Earning</p>
                <p class="font-mono-data text-lg font-bold text-primary">${data.activeTrip.estimatedPayout.toFixed(2)}</p>
              </div>
            </div>

            {#if data.activeTrip.notes}
              <p class="rounded-2xl bg-neutral-50 px-3 py-2 text-sm text-ink-secondary">{data.activeTrip.notes}</p>
            {/if}

            <div class="flex items-center gap-3">
              <Button variant="ghost" size="sm" on:click={() => goto('/courier/trips')}>View history</Button>
              <div class="flex-1"></div>
              <Button variant="primary" size="sm" on:click={openActiveTrip}>Continue trip</Button>
            </div>
          </div>
        {:else if currentRequest}
          <div in:fade={{ duration: 160 }} class="space-y-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">New request</p>
                <h1 class="mt-1 text-xl font-bold text-ink">{currentRequest.businessName}</h1>
                <p class="mt-1 text-sm text-ink-secondary">{currentRequest.pickupAddress} → {currentRequest.dropoffAddress}</p>
              </div>
              <button type="button" class="rounded-2xl bg-neutral-50 px-3 py-2 text-right" on:click={() => goto('/courier/trips')}>
                <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Trips</p>
                <p class="font-mono-data text-lg font-bold text-ink">{data.summary.completedTrips}</p>
              </button>
            </div>

            {#if currentRequest.notes}
              <p class="rounded-2xl bg-neutral-50 px-3 py-2 text-sm text-ink-secondary">{currentRequest.notes}</p>
            {/if}

            <div class="flex items-center gap-3">
              <div class="rounded-2xl bg-neutral-50 px-3 py-2">
                <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Today</p>
                <p class="font-mono-data text-sm font-bold text-ink">{data.summary.tripsToday} trips</p>
              </div>
              <div class="flex-1"></div>
              <Button variant="primary" size="sm" disabled={acceptingId === currentRequest.id} on:click={() => acceptRequest(currentRequest.id)}>
                {acceptingId === currentRequest.id ? 'Accepting…' : 'Accept ride'}
              </Button>
            </div>
          </div>
        {:else}
          <div class="space-y-4 text-center" in:fade={{ duration: 160 }}>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">No request yet</p>
              <h1 class="mt-1 text-xl font-bold text-ink">Stay online for nearby business orders.</h1>
              <p class="mt-1 text-sm text-ink-secondary">Requests will appear here as soon as dispatch creates one.</p>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <div class="rounded-2xl bg-neutral-50 px-3 py-3 text-left">
                <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Balance</p>
                <p class="font-mono-data mt-1 text-lg font-bold text-ink">${data.summary.walletBalance.toFixed(2)}</p>
              </div>
              <div class="rounded-2xl bg-neutral-50 px-3 py-3 text-left">
                <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Trips</p>
                <p class="font-mono-data mt-1 text-lg font-bold text-ink">{data.summary.completedTrips}</p>
              </div>
              <div class="rounded-2xl bg-neutral-50 px-3 py-3 text-left">
                <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Km</p>
                <p class="font-mono-data mt-1 text-lg font-bold text-ink">{data.summary.totalDistanceKm.toFixed(1)}</p>
              </div>
            </div>

            <Button variant="primary" size="sm" on:click={() => goto('/courier/trips')}>View earnings</Button>
          </div>
        {/if}
      </div>
    </div>

    <div in:fly={{ y: 12, duration: 220, easing: quintOut }} class="border-t border-white/70 bg-[#eef3ff] px-4 py-4">
      <div class="grid grid-cols-3 gap-3">
        <div class="rounded-2xl border border-white bg-white p-3 shadow-sm">
          <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Wallet</p>
          <p class="font-mono-data mt-1 text-lg font-bold text-ink">${data.summary.walletBalance.toFixed(2)}</p>
        </div>
        <div class="rounded-2xl border border-white bg-white p-3 shadow-sm">
          <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Trips today</p>
          <p class="font-mono-data mt-1 text-lg font-bold text-ink">{data.summary.tripsToday}</p>
        </div>
        <div class="rounded-2xl border border-white bg-white p-3 shadow-sm">
          <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Distance</p>
          <p class="font-mono-data mt-1 text-lg font-bold text-ink">{data.summary.totalDistanceKm.toFixed(1)} km</p>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
        <div>
          <p class="text-sm font-semibold text-ink">{data.summary.activeTrips ? 'Active trip in progress' : 'Ready for the next order'}</p>
          <p class="text-xs text-ink-secondary">Business requests are now backed by the database.</p>
        </div>
        <Button variant="ghost" size="sm" on:click={() => goto('/courier/trips')}>History</Button>
      </div>
    </div>
  </div>
</div>