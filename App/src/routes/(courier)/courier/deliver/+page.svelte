<script lang="ts">
  import { goto } from '$app/navigation';
  import { onDestroy, onMount } from 'svelte';
  import MapBackdrop from '$lib/components/MapBackdrop.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import IconButton from '$lib/components/ui/IconButton.svelte';
  import { KUMASI_CENTER, type LatLng, distanceToPolylineKm } from '$lib/geo/service-area';
  import { computeDrivingRoute, OFF_ROUTE_THRESHOLD_KM } from '$lib/maps/routing';
  import { startCourierLocationReporter } from '$lib/realtime/courier-location';

  export let data: {
    trip: {
      id: string;
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

  let riderPoint: LatLng | null = null;
  let routePath: LatLng[] = [];
  let etaText = 'Calculating…';
  let locationUnavailable = false;
  let completing = false;
  let actionError = '';
  let stopReporter: (() => void) | null = null;

  $: pickupPoint =
    data.trip.pickupLat != null && data.trip.pickupLng != null
      ? { lat: data.trip.pickupLat, lng: data.trip.pickupLng }
      : { lat: 6.6785, lng: -1.5645 };

  $: dropoffPoint =
    data.trip.dropoffLat != null && data.trip.dropoffLng != null
      ? { lat: data.trip.dropoffLat, lng: data.trip.dropoffLng }
      : { lat: 6.6745, lng: -1.5716 };

  async function updateRoute(from: LatLng, force = false) {
    if (!googleMapsApiKey) return;
    try {
      const route = await computeDrivingRoute(googleMapsApiKey, from, dropoffPoint, { force });
      routePath = route.path;
      etaText = route.durationText;
    } catch {
      etaText = 'Unavailable';
    }
  }

  async function markDelivered() {
    if (completing) return;
    completing = true;
    actionError = '';
    try {
      const response = await fetch('/api/courier/trip-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: data.trip.id, action: 'complete' })
      });

      if (!response.ok) {
        throw new Error('Unable to complete trip');
      }

      goto(`/courier/complete?tripId=${encodeURIComponent(data.trip.id)}`);
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'Unable to complete trip';
    } finally {
      completing = false;
    }
  }

  onMount(() => {
    riderPoint = { lat: pickupPoint.lat, lng: pickupPoint.lng };
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
  <title>Delivering | YADA Courier</title>
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
        {
          id: 'dropoff',
          lat: dropoffPoint.lat,
          lng: dropoffPoint.lng,
          label: 'Dropoff',
          role: 'dropoff'
        },
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
    <span class="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-subtle px-3 py-1 text-sm font-semibold text-primary">
      → Delivering · {etaText}
    </span>

    <div>
      <p class="font-semibold text-ink">{data.trip.dropoffAddress}</p>
      <p class="text-sm text-ink-secondary">{data.trip.businessName} delivery</p>
    </div>

    {#if data.trip.notes}
      <p class="rounded-2xl bg-neutral-50 px-3 py-2 text-sm text-ink-secondary">{data.trip.notes}</p>
    {/if}

    {#if actionError}
      <p class="rounded-2xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{actionError}</p>
    {/if}

    <div class="flex items-center gap-3">
      <IconButton ariaLabel="Call customer" variant="outline">
        <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2">
          <path
            d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z"
          />
        </svg>
      </IconButton>
      <IconButton ariaLabel="Message customer" variant="outline">
        <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </svg>
      </IconButton>
      <div class="flex-1"></div>
      <Button variant="primary" size="sm" disabled={completing} on:click={markDelivered}>
        {completing ? 'Completing…' : 'Mark delivered'}
      </Button>
    </div>
  </div>
</div>