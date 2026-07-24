<script lang="ts">
  import { goto } from '$app/navigation';
  import { onDestroy, onMount } from 'svelte';
  import MapBackdrop from '$lib/components/MapBackdrop.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { KUMASI_CENTER, type LatLng, distanceToPolylineKm } from '$lib/geo/service-area';
  import { computeDrivingRoute, OFF_ROUTE_THRESHOLD_KM } from '$lib/maps/routing';
  import { startCourierLocationReporter } from '$lib/realtime/courier-location';

  export let data: {
    trip: {
      id: string;
      status: 'assigned' | 'en_route' | 'arrived' | 'searching';
      businessName: string;
      pickupAddress: string;
      dropoffAddress: string;
      pickupLat: number | null;
      pickupLng: number | null;
      dropoffLat: number | null;
      dropoffLng: number | null;
      notes: string | null;
    };
  };

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
  const fallbackPickup = { lat: 6.6785, lng: -1.5645 };

  let riderPoint: LatLng | null = null;
  let routePath: LatLng[] = [];
  let etaText = 'Calculating…';
  let locationUnavailable = false;
  let confirming = false;
  let stopReporter: (() => void) | null = null;

  $: pickupPoint =
    data.trip.pickupLat != null && data.trip.pickupLng != null
      ? { lat: data.trip.pickupLat, lng: data.trip.pickupLng }
      : fallbackPickup;

  $: dropoffPoint =
    data.trip.dropoffLat != null && data.trip.dropoffLng != null
      ? { lat: data.trip.dropoffLat, lng: data.trip.dropoffLng }
      : null;

  async function updateRoute(from: LatLng, force = false) {
    if (!googleMapsApiKey) return;
    try {
      const route = await computeDrivingRoute(googleMapsApiKey, from, pickupPoint, { force });
      routePath = route.path;
      etaText = route.durationText;
    } catch {
      etaText = 'Unavailable';
    }
  }

  async function confirmPickup() {
    if (confirming) return;
    confirming = true;
    try {
      const response = await fetch('/api/courier/trip-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: data.trip.id, action: 'pickup' })
      });

      if (!response.ok) {
        throw new Error('Unable to advance trip');
      }

      goto(`/courier/deliver?tripId=${encodeURIComponent(data.trip.id)}`);
    } finally {
      confirming = false;
    }
  }

  onMount(() => {
    riderPoint = { lat: pickupPoint.lat - 0.003, lng: pickupPoint.lng + 0.002 };
    void updateRoute(riderPoint);

    stopReporter = startCourierLocationReporter({
      tripId: data.trip.id,
      enabled: true,
      onUpdate: (point) => {
        riderPoint = { lat: point.lat, lng: point.lng };
        locationUnavailable = point.stale;

        if (routePath.length > 1) {
          const drift = distanceToPolylineKm(riderPoint, routePath);
          if (drift > OFF_ROUTE_THRESHOLD_KM) {
            void updateRoute(riderPoint, true);
            return;
          }
        }

        void updateRoute(riderPoint);
      },
      onError: () => {
        locationUnavailable = true;
      }
    });
  });

  onDestroy(() => {
    stopReporter?.();
  });
</script>

<svelte:head>
  <title>Heading to pickup | YADA Courier</title>
</svelte:head>

<div class="relative flex h-full min-h-[inherit] flex-1 flex-col bg-bg">
  <div class="relative min-h-[45%] flex-1">
    <MapBackdrop
      routeLabel
      center={riderPoint ?? KUMASI_CENTER}
      followId="rider"
      locationUnavailable={locationUnavailable}
      polylinePath={routePath}
      markers={[
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
          : []),
        ...(riderPoint
          ? [
              {
                id: 'rider',
                lat: riderPoint.lat,
                lng: riderPoint.lng,
                label: 'You',
                role: 'rider' as const,
                stale: locationUnavailable
              }
            ]
          : [])
      ]}
    />
  </div>

  <div class="z-10 flex flex-col gap-4 rounded-t-[28px] border-t border-border bg-surface p-5 shadow-lg">
    <span class="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary-subtle px-3 py-1 text-sm font-semibold text-secondary-700">
      → Heading to pickup · {etaText}
    </span>

    <div>
      <p class="font-semibold text-ink">{data.trip.businessName}</p>
      <p class="text-sm text-ink-secondary">{data.trip.pickupAddress}</p>
    </div>

    {#if data.trip.notes}
      <p class="rounded-2xl bg-neutral-50 px-3 py-2 text-sm text-ink-secondary">{data.trip.notes}</p>
    {/if}

    <div class="flex items-center gap-3">
      <Button variant="ghost" size="sm" on:click={() => goto('/courier/home')}>Back home</Button>
      <div class="flex-1"></div>
      <Button variant="primary" size="sm" disabled={confirming} on:click={confirmPickup}>
        {confirming ? 'Updating…' : 'Confirm pickup'}
      </Button>
    </div>
  </div>
</div>