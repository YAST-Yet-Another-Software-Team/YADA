<script lang="ts">
  import { goto } from '$app/navigation';
  import { onDestroy, onMount } from 'svelte';
  import MapBackdrop from '$lib/components/MapBackdrop.svelte';
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import { KUMASI_CENTER, distanceToPolylineKm } from '$lib/shared/geo/service-area';
  import {
    DELIVERY_PROXIMITY_KM,
    isWithinRange,
    metresBetween
  } from '$lib/shared/geo/proximity';
  import type { LatLng } from '$lib/utils/types';
  import { computeDrivingRoute, OFF_ROUTE_THRESHOLD_KM } from '$lib/client/maps/routing';
  import { getMapsConfig } from '$lib/client/maps/maps-config.svelte';
  import IconArrowRight from '~icons/mdi/arrow-right';
  import IconPhone from '~icons/mdi/phone';
  import IconMessage from '~icons/mdi/message-text-outline';
  import IconNavigation from '~icons/mdi/navigation-variant-outline';
  import { directionsHref } from '../offers';
  import { startCourierLocationReporter } from '../location-reporter';

  let {
    data
  }: {
    data: {
      trip: {
        id: string;
        businessName: string;
        businessPhone: string | null;
        pickupAddress: string;
        dropoffAddress: string;
        pickupLat: number | null;
        pickupLng: number | null;
        dropoffLat: number | null;
        dropoffLng: number | null;
        notes: string | null;
      };
    };
  } = $props();

  const maps = getMapsConfig();

  let riderPoint = $state<LatLng | null>(null);
  let routePath = $state<LatLng[]>([]);
  let etaText = $state('Calculating…');
  let locationUnavailable = $state(false);
  let completing = $state(false);
  let actionError = $state('');
  let stopReporter: (() => void) | null = null;

  const pickupPoint = $derived(
    data.trip.pickupLat != null && data.trip.pickupLng != null
      ? { lat: data.trip.pickupLat, lng: data.trip.pickupLng }
      : { lat: 6.6785, lng: -1.5645 }
  );

  const dropoffPoint = $derived(
    data.trip.dropoffLat != null && data.trip.dropoffLng != null
      ? { lat: data.trip.dropoffLat, lng: data.trip.dropoffLng }
      : { lat: 6.6745, lng: -1.5716 }
  );

  /**
   * How far the courier still has to go, and whether that is close enough to
   * hand the parcel over. The same rule runs server-side on the completing
   * request — this only decides whether the button is worth offering.
   */
  const metresToDropoff = $derived(riderPoint ? metresBetween(riderPoint, dropoffPoint) : null);
  const atDropoff = $derived(
    Boolean(riderPoint && isWithinRange(riderPoint, dropoffPoint, DELIVERY_PROXIMITY_KM))
  );

  async function updateRoute(from: LatLng) {
    if (!maps.routingEnabled) return;
    try {
      const route = await computeDrivingRoute(from, dropoffPoint, { force: true });
      routePath = route.path;
      etaText = route.durationText;
    } catch {
      etaText = 'Unavailable';
    }
  }

  async function markDelivered() {
    if (completing || !atDropoff) return;
    completing = true;
    actionError = '';
    try {
      const response = await fetch('/api/courier/trip-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: data.trip.id, action: 'complete' })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        // The server checks the courier's stored position, which can be a fix or
        // two behind the one on screen, so its refusal is the one worth showing.
        actionError = payload?.message ?? 'Unable to complete trip';
        return;
      }

      goto(`/complete?tripId=${encodeURIComponent(data.trip.id)}`);
    } catch {
      actionError = 'Unable to complete trip. Check your connection and try again.';
    } finally {
      completing = false;
    }
  }

  onMount(() => {
    // No seeded position: the delivery can only be completed from where the
    // courier actually is, so an assumed one — the pickup, say — would be a lie
    // the proximity check then has to catch.
    stopReporter = startCourierLocationReporter({
      tripId: data.trip.id,
      enabled: true,
      onUpdate: (point) => {
        riderPoint = { lat: point.lat, lng: point.lng };
        locationUnavailable = point.stale;

        // Only redraw when there's no route yet or the courier has left the one
        // on screen. Recomputing per fix bills a Routes call every few seconds
        // to draw the same line.
        if (
          routePath.length > 1 &&
          distanceToPolylineKm(riderPoint, routePath) <= OFF_ROUTE_THRESHOLD_KM
        ) {
          return;
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
      {locationUnavailable}
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
      <IconArrowRight class="h-4 w-4 shrink-0" aria-hidden="true" />
      Delivering · {etaText}
    </span>

    <div>
      <p class="font-semibold text-ink">{data.trip.dropoffAddress}</p>
      <p class="text-sm text-ink-secondary">{data.trip.businessName} delivery</p>
    </div>

    {#if data.trip.notes}
      <p class="rounded-lg bg-bg px-3 py-2 text-sm text-ink-secondary">{data.trip.notes}</p>
    {/if}

    {#if actionError}
      <Alert>{actionError}</Alert>
    {/if}

    <div class="flex items-center gap-3">
      <!-- Real links now. These were two buttons wired to nothing: there is no
           customer account in YADA, so the person to reach about a parcel in
           transit is the counter that sent it, and their number comes off the
           trip. Navigation hands off to the phone's map app. -->
      <a
        href={directionsHref(dropoffPoint)}
        target="_blank"
        rel="noopener"
        class="inline-flex h-10 w-10 items-center justify-center rounded-full border-md border-primary text-primary transition-colors hover:bg-primary-subtle"
        aria-label="Navigate to {data.trip.dropoffAddress}"
      >
        <IconNavigation class="h-[18px] w-[18px]" aria-hidden="true" />
      </a>
      {#if data.trip.businessPhone}
        <a
          href="tel:{data.trip.businessPhone}"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border-md border-primary text-primary transition-colors hover:bg-primary-subtle"
          aria-label="Call {data.trip.businessName}"
        >
          <IconPhone class="h-[18px] w-[18px]" aria-hidden="true" />
        </a>
      {/if}
      <div class="flex-1"></div>
      {#if atDropoff}
        <Button variant="primary" size="sm" disabled={completing} onclick={markDelivered}>
          {completing ? 'Confirming…' : 'Confirm delivery'}
        </Button>
      {:else}
        <!-- Not a disabled button: there is nothing to press yet, and a greyed
             one invites tapping at it the whole way there. -->
        <p class="text-right text-sm text-ink-secondary">
          {#if metresToDropoff == null}
            Waiting for your location…
          {:else}
            {metresToDropoff} m away — you can confirm this within
            {Math.round(DELIVERY_PROXIMITY_KM * 1000)} m
          {/if}
        </p>
      {/if}
    </div>
  </div>
</div>