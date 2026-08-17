<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { onDestroy, onMount } from 'svelte';
  import MapBackdrop from '$lib/components/MapBackdrop.svelte';
  import Alert from '$lib/components/Alert.svelte';
  import Button from '$lib/components/Button.svelte';
  import { KUMASI_CENTER, distanceToPolylineKm } from '$lib/shared/geo/service-area';
  import { isWithinRange, metresBetween, PICKUP_PROXIMITY_KM } from '$lib/shared/geo/proximity';
  import { isReleasableByCourier } from '$lib/shared/trip-status';
  import type { LatLng, TripStatus } from '$lib/utils/types';
  import { computeDrivingRoute, OFF_ROUTE_THRESHOLD_KM } from '$lib/client/maps/routing';
  import { getMapsConfig } from '$lib/client/maps/maps-config.svelte';
  import IconCheck from '~icons/mdi/check';
  import IconArrowRight from '~icons/mdi/arrow-right';
  import IconNavigation from '~icons/mdi/navigation-variant-outline';
  import IconPhone from '~icons/mdi/phone';
  import { directionsHref } from '../offers';
  import { startCourierLocationReporter } from '../location-reporter';

  let {
    data
  }: {
    data: {
      trip: {
        id: string;
        status: TripStatus;
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
  const fallbackPickup = { lat: 6.6785, lng: -1.5645 };

  /** How often to re-read the trip while waiting on the business to confirm. */
  const POLL_MS = 4000;

  let riderPoint = $state<LatLng | null>(null);
  let riderHeading = $state<number | null>(null);
  let routePath = $state<LatLng[]>([]);
  let etaText = $state('Calculating…');
  let locationUnavailable = $state(false);
  let starting = $state(false);
  let releasing = $state(false);
  let actionError = $state('');
  let stopReporter: (() => void) | null = null;
  let refreshTimer: ReturnType<typeof setInterval> | undefined;

  const pickupPoint = $derived(
    data.trip.pickupLat != null && data.trip.pickupLng != null
      ? { lat: data.trip.pickupLat, lng: data.trip.pickupLng }
      : fallbackPickup
  );

  const dropoffPoint = $derived(
    data.trip.dropoffLat != null && data.trip.dropoffLng != null
      ? { lat: data.trip.dropoffLat, lng: data.trip.dropoffLng }
      : null
  );

  /**
   * The parcel is in hand: the business has confirmed the handover, and the
   * delivery is the courier's to start. Until then this screen is a waiting
   * room — the courier cannot mark their own pickup, because the person handing
   * the parcel over is the one who knows it happened.
   */
  const collected = $derived(data.trip.status === 'picked_up');

  /** The order number, as it reads on the business's screen and the wireframe. */
  const shortId = $derived(`#${data.trip.id.slice(0, 8).toUpperCase()}`);
  const metresToPickup = $derived(riderPoint ? metresBetween(riderPoint, pickupPoint) : null);
  const atPickup = $derived(
    Boolean(riderPoint && isWithinRange(riderPoint, pickupPoint, PICKUP_PROXIMITY_KM))
  );

  /**
   * Dropping the job is only offered on the way there. `accepted` is the stored
   * status until the courier's own position writes `courier_arriving`, so this
   * mirrors the server's window rather than guessing at it.
   */
  const canRelease = $derived(isReleasableByCourier(data.trip.status));

  async function updateRoute(from: LatLng) {
    if (!maps.enabled) return;
    try {
      const route = await computeDrivingRoute(maps.apiKey, from, pickupPoint, { force: true });
      routePath = route.path;
      etaText = route.durationText;
    } catch {
      etaText = 'Unavailable';
    }
  }

  /**
   * Let the job go, before reaching the counter.
   *
   * Not a cancellation of the delivery: the business still wants it moved, so
   * the request goes back out to every other rider (see
   * `POST /api/courier/cancel-trip`). The window closes on arrival — from the
   * shop's doorstep this is a conversation, not a button — which is why it
   * follows the same `atPickup` reading the rest of this screen uses, and the
   * server checks the stored status regardless.
   */
  async function releaseTrip() {
    if (releasing || !canRelease) return;

    releasing = true;
    actionError = '';

    try {
      const response = await fetch('/api/courier/cancel-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: data.trip.id })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        actionError = payload?.message ?? 'Unable to cancel this job.';
        return;
      }

      goto('/home');
    } catch {
      actionError = 'Unable to cancel this job. Check your connection and try again.';
    } finally {
      releasing = false;
    }
  }

  async function startDelivery() {
    if (starting || !collected) return;
    starting = true;
    actionError = '';

    try {
      const response = await fetch('/api/courier/trip-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: data.trip.id, action: 'start_delivery' })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        actionError = payload?.message ?? 'Unable to start the delivery';
        return;
      }

      goto(`/deliver?tripId=${encodeURIComponent(data.trip.id)}`);
    } catch {
      actionError = 'Unable to start the delivery. Check your connection and try again.';
    } finally {
      starting = false;
    }
  }

  onMount(() => {
    // The route starts at the courier's first real fix. Seeding a position near
    // the pickup drew a plausible-looking leg for a rider who might be across
    // town, and the business watching the same trip saw it too.
    stopReporter = startCourierLocationReporter({
      tripId: data.trip.id,
      enabled: true,
      onUpdate: (point) => {
        riderPoint = { lat: point.lat, lng: point.lng };
        riderHeading = point.heading;
        locationUnavailable = point.stale;

        // Redraw only when there's no route yet or the courier has left the one
        // on screen — otherwise every fix would bill a fresh Routes call for the
        // same line.
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

    // The confirmation happens in someone else's app, so this screen has to go
    // looking for it.
    refreshTimer = setInterval(() => {
      if (!collected) void invalidateAll();
    }, POLL_MS);
  });

  onDestroy(() => {
    stopReporter?.();
    if (refreshTimer) clearInterval(refreshTimer);
  });
</script>

<svelte:head>
  <title>{collected ? 'Ready to deliver' : 'Heading to pickup'} | YADA Courier</title>
</svelte:head>

<div class="relative flex h-full min-h-[inherit] flex-1 flex-col bg-bg">
  <!-- Map fades, sheet lifts: the same pairing every courier trip screen uses. -->
  <div class="fade-in relative min-h-[45%] flex-1">
    <!-- Deliberately no `hintPath`. The dashed pickup→dropoff line used to be
         drawn here as well as on tracking, but on this screen the rider's job is
         to reach the counter: a second line heading somewhere else competes with
         the route they are actually following, and the leg it describes has not
         started. The dropoff keeps its marker, so where the parcel goes next is
         still on the map — just without a line pulling the eye off the route. -->
    <MapBackdrop
      routeLabel
      center={riderPoint ?? KUMASI_CENTER}
      fitIds={['rider', 'pickup']}
      {locationUnavailable}
      polylinePath={routePath}
      markers={[
        {
          id: 'pickup',
          lat: pickupPoint.lat,
          lng: pickupPoint.lng,
          // The shop's own name and glyph, not a generic red pin. The rider is
          // looking for a counter, and `business` is the role that carries the
          // shopfront icon — the same one the tracking map gives the business
          // for itself, so both sides point at the same landmark.
          label: data.trip.businessName,
          role: 'business'
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
                heading: riderHeading,
                stale: locationUnavailable
              }
            ]
          : [])
      ]}
    />
  </div>

  <div
    class="rise z-10 flex flex-col gap-4 rounded-t-[28px] border-t border-border bg-surface p-5 shadow-lg"
    style="--rise-delay: 80ms"
  >
    {#if collected}
      <span class="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-subtle px-3 py-1 text-sm font-semibold text-primary">
        <IconCheck class="h-4 w-4 shrink-0" aria-hidden="true" />
        Parcel collected
      </span>
    {:else}
      <span class="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary-subtle px-3 py-1 text-sm font-semibold text-secondary-700">
        <IconArrowRight class="h-4 w-4 shrink-0" aria-hidden="true" />
        Heading to pickup · {etaText}
      </span>
    {/if}

    <div>
      <p class="font-semibold text-ink">{data.trip.businessName}</p>
      <p class="text-sm text-ink-secondary">
        {data.trip.pickupAddress}
        <span class="font-mono-data text-ink-tertiary">· {shortId}</span>
      </p>
    </div>

    {#if data.trip.notes}
      <p class="rounded-lg bg-bg px-3 py-2 text-sm text-ink-secondary">{data.trip.notes}</p>
    {/if}

    {#if actionError}
      <Alert>{actionError}</Alert>
    {/if}

    {#if collected}
      <p class="text-sm text-ink-secondary">
        Next stop: {data.trip.dropoffAddress}
      </p>
    {:else}
      <p class="text-sm text-ink-secondary">
        {#if metresToPickup == null}
          Waiting for your location…
        {:else if !atPickup}
          {metresToPickup} m to go. {data.trip.businessName} confirms the handover when you arrive.
        {:else}
          You're at the pickup — {data.trip.businessName} confirms the handover in their app.
        {/if}
      </p>
    {/if}

    <div class="flex items-center gap-3">
      <!-- Navigate and call, the two things a rider on the road actually needs
           from this screen. Both hand off to the phone: turn-by-turn belongs to
           the map app, and the number is the counter holding the parcel. -->
      <a
        href={directionsHref(pickupPoint)}
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-2 rounded-md border-md border-primary px-3.5 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary-subtle"
      >
        <IconNavigation class="h-4 w-4 shrink-0" aria-hidden="true" />
        Navigate
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

      {#if collected}
        <Button variant="primary" size="sm" disabled={starting} onclick={startDelivery}>
          {starting ? 'Starting…' : 'Start delivery'}
        </Button>
      {:else}
        <Button variant="neutral" size="sm" onclick={() => goto('/home')}>Back home</Button>
      {/if}
    </div>

    {#if canRelease}
      <!-- Last, and quiet: dropping a job is the rare thing on this screen, and
           it belongs below the two the rider came here to do. The request goes
           straight back out to other riders — it is not cancelled. -->
      <button
        type="button"
        class="self-start text-sm font-semibold text-ink-secondary underline-offset-2 transition-colors hover:text-danger hover:underline disabled:opacity-60"
        disabled={releasing}
        onclick={releaseTrip}
      >
        {releasing ? 'Cancelling…' : "Cancel — I can't take this job"}
      </button>
    {/if}
  </div>
</div>
