<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import DashboardBoard from "$lib/components/DashboardBoard.svelte";
  import DashboardTable from "$lib/components/DashboardTable.svelte";
  import MapBackdrop from "$lib/components/MapBackdrop.svelte";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import Card from "$lib/components/Card.svelte";
  import StatusPill from "$lib/components/StatusPill.svelte";
  import IconPlus from "~icons/mdi/plus";
  import IconChevronRight from "~icons/mdi/chevron-right";
  import IconPackage from "~icons/mdi/package-variant-closed";
  import { isCancellableStage } from "$lib/shared/trip-status";
  import { formatCedis } from "$lib/shared/text";
  import type { DashboardTripRecord } from "$lib/utils/types";
  import { DashboardViewPreference } from "./dashboard-view.svelte";

  let {
    data,
  }: {
    data: {
      dashboard: {
        activeTrips: DashboardTripRecord[];
        historyTrips: DashboardTripRecord[];
        businessProfile: {
          name: string;
          businessName: string;
          email: string | null;
          phone: string | null;
          address: string;
          lat: number;
          lng: number;
        } | null;
      };
    };
  } = $props();

  let selected = $state<DashboardTripRecord | null>(null);
  let cancelling = $state(false);
  let panelError = $state("");

  /**
   * Withdrawing stays available until the rider reaches the counter — the same
   * rule `POST /api/trips/cancel` enforces, and the same one the tracking
   * screen applies. Once they have arrived, this panel is a view, not a
   * control: someone is standing at the shop for this delivery.
   */
  const canCancelSelected = $derived(
    selected !== null && isCancellableStage(selected.status),
  );

  // Adopted from storage after mount — $effect never runs on the server,
  // where localStorage doesn't exist.
  const view = new DashboardViewPreference();
  $effect(() => {
    view.hydrate();
  });

  const deliveredToday = $derived(
    data.dashboard.historyTrips
      .filter((t) => t.status === "delivered")
      .slice(0, 2),
  );

  function newRequest() {
    goto("/request");
  }

  function setView(next: "table" | "board") {
    view.set(next);
  }

  function selectTrip(trip: DashboardTripRecord) {
    selected = trip;
    panelError = "";
  }

  /**
   * On a phone a request opens the screen built for it rather than a panel over
   * this one: the tracking map is the whole point of tapping the row, and a
   * side sheet on a 390px screen is that screen with less room and a worse way
   * back. The desktop table keeps the panel, where it sits beside the list.
   */
  function openTrip(trip: DashboardTripRecord) {
    goto(`/tracking?trip=${encodeURIComponent(trip.rawId)}`);
  }

  function closePanel() {
    selected = null;
    panelError = "";
  }

  function trackSelected() {
    if (!selected) return;
    goto(`/tracking?trip=${encodeURIComponent(selected.rawId)}`);
  }

  async function cancelSelected() {
    if (!selected || !canCancelSelected || cancelling) return;

    cancelling = true;
    panelError = "";

    try {
      const response = await fetch("/api/trips/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: selected.rawId }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        panelError = payload?.message ?? "Could not cancel this request.";
        return;
      }

      closePanel();
      await invalidateAll();
    } catch {
      panelError = "Could not cancel this request. Check your connection.";
    } finally {
      cancelling = false;
    }
  }
</script>

<svelte:head>
  <title>Dashboard | YADA</title>
</svelte:head>

<div class="relative flex flex-1 flex-col gap-5 lg:gap-6">
  <div class="grid grid-cols-2 gap-3 px-4 pt-4 lg:grid-cols-3 lg:p-0">
    <div class="rounded-lg border border-border bg-surface p-4 shadow-xs">
      <p class="text-eyebrow text-ink-tertiary">
        <span class="lg:hidden">Active</span>
        <span class="hidden lg:inline">Active deliveries</span>
      </p>
      <p class="font-mono-data mt-2 text-2xl font-bold text-ink">
        {data.dashboard.activeTrips.length}
      </p>
    </div>
    <div
      class="hidden rounded-lg border border-border bg-surface p-4 shadow-xs lg:block"
    >
      <p class="text-eyebrow text-ink-tertiary">Avg. pickup time</p>
      <p class="font-mono-data mt-2 text-2xl font-bold text-ink">
        {data.dashboard.activeTrips.length > 0 ? "Live" : "—"}
      </p>
    </div>
    <div class="rounded-lg border border-border bg-surface p-4 shadow-xs">
      <p class="text-eyebrow text-ink-tertiary">
        <span class="lg:hidden">Today</span>
        <span class="hidden lg:inline">Delivered today</span>
      </p>
      <p class="font-mono-data mt-2 text-2xl font-bold text-ink">
        {data.dashboard.historyTrips.filter((t) => t.status === "delivered")
          .length}
      </p>
    </div>
  </div>

  <section class="flex flex-1 flex-col gap-3 px-4 lg:hidden">
    <h2 class="text-base font-semibold text-ink">Active requests</h2>

    {#if data.dashboard.activeTrips.length === 0}
      <!-- The empty dashboard is the first thing a new business sees, so it
           says what to do next rather than leaving a gap under the heading. -->
      <div
        class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center"
      >
        <IconPackage class="h-8 w-8 text-ink-tertiary" aria-hidden="true" />
        <p class="text-sm font-semibold text-ink">No deliveries running</p>
        <p class="text-sm text-ink-secondary">
          Request a rider and it will show up here until it's delivered.
        </p>
      </div>
    {:else}
      {#each data.dashboard.activeTrips as trip (trip.id)}
        <button
          type="button"
          class="w-full rounded-lg text-left transition active:scale-[0.99]"
          onclick={() => openTrip(trip)}
        >
          <Card>
            <div class="flex items-center gap-3">
              <div class="min-w-0 flex-1">
                <p class="font-mono-data text-xs text-ink-tertiary">
                  #{trip.id.replace("YD-", "")}
                </p>
                <p class="truncate text-sm font-semibold text-ink">
                  {trip.destination}
                </p>
                <p class="truncate text-sm text-ink-secondary">
                  {trip.rider ?? "Looking for a rider"}
                  {#if trip.eta}
                    <span class="font-mono-data text-primary">· {trip.eta}</span>
                  {/if}
                </p>
              </div>
              <div class="flex shrink-0 items-center gap-1">
                <StatusPill status={trip.status} />
                <IconChevronRight
                  class="h-5 w-5 text-ink-tertiary"
                  aria-hidden="true"
                />
              </div>
            </div>
          </Card>
        </button>
      {/each}
    {/if}
  </section>

  <section class="hidden flex-col gap-4 lg:flex">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-base font-semibold text-ink">Active requests</h2>

      <div class="flex items-center gap-3">
        <div
          class="hidden items-center rounded-md bg-surface-sunken p-1 lg:flex"
        >
          <button
            type="button"
            class="rounded-sm px-3 py-1.5 text-sm font-semibold transition {view.current ===
            'table'
              ? 'bg-surface text-ink shadow-xs'
              : 'text-ink-secondary hover:text-ink'}"
            onclick={() => setView("table")}
          >
            Table
          </button>
          <button
            type="button"
            class="rounded-sm px-3 py-1.5 text-sm font-semibold transition {view.current ===
            'board'
              ? 'bg-surface text-ink shadow-xs'
              : 'text-ink-secondary hover:text-ink'}"
            onclick={() => setView("board")}
          >
            Board
          </button>
        </div>

        <div class="hidden lg:block">
          <Button variant="primary" size="sm" onclick={newRequest}>
            <IconPlus class="h-4 w-4" aria-hidden="true" />
            New request
          </Button>
        </div>
      </div>
    </div>

    {#if view.current === "table"}
      <DashboardTable
        trips={data.dashboard.activeTrips}
        onselect={selectTrip}
      />
    {:else}
      <DashboardBoard
        trips={data.dashboard.activeTrips}
        {deliveredToday}
        onselect={selectTrip}
      />
    {/if}
  </section>

  <!-- Sticky rather than fixed: it sits in the column, so it can't overlap the
       last card and the list doesn't need a phantom pad at the bottom to clear
       it. The safe-area inset keeps it above a home indicator. -->
  <div
    class="sticky bottom-0 z-10 border-t border-border bg-surface px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 shadow-nav lg:hidden"
  >
    <Button variant="primary" size="lg" fullWidth onclick={newRequest}>
      <IconPlus class="h-5 w-5" aria-hidden="true" />
      New request
    </Button>
  </div>
</div>

{#if selected}
  <!-- Overlay map panel (stays on dashboard) -->
  <div
    class="fixed inset-0 z-40 flex justify-end bg-overlay"
    role="dialog"
    aria-modal="true"
  >
    <button
      type="button"
      class="absolute inset-0 cursor-default"
      aria-label="Close map panel"
      onclick={closePanel}
    ></button>
    <aside
      class="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-border bg-surface shadow-lg"
    >
      <div
        class="flex items-start justify-between gap-3 border-b border-border px-5 py-4"
      >
        <div>
          <p class="font-mono-data text-xs text-ink-tertiary">#{selected.id}</p>
          <h2 class="text-lg font-semibold text-ink">{selected.destination}</h2>
          <div class="mt-2"><StatusPill status={selected.status} /></div>
        </div>
        <button
          type="button"
          class="rounded-md px-2 py-1 text-sm font-semibold text-ink-secondary hover:bg-wash"
          onclick={closePanel}
        >
          Close
        </button>
      </div>

      <div class="relative min-h-0 flex-1">
        <MapBackdrop
          routeLabel={selected.status === "en_route"}
          center={selected.dropoffLat != null && selected.dropoffLng != null
            ? { lat: selected.dropoffLat, lng: selected.dropoffLng }
            : data.dashboard.businessProfile
              ? {
                  lat: data.dashboard.businessProfile.lat,
                  lng: data.dashboard.businessProfile.lng,
                }
              : null}
          markers={[
            ...(data.dashboard.businessProfile
              ? [
                  {
                    id: "hq",
                    lat: data.dashboard.businessProfile.lat,
                    lng: data.dashboard.businessProfile.lng,
                    label: data.dashboard.businessProfile.businessName,
                    role: "business" as const,
                    // Same signal as the tracking map: the counter radiates
                    // while its request is still looking for a rider.
                    pulse: selected.status === "searching",
                  },
                ]
              : []),
            ...(selected.pickupLat != null && selected.pickupLng != null
              ? [
                  {
                    id: "pickup",
                    lat: selected.pickupLat,
                    lng: selected.pickupLng,
                    label: "Pickup",
                    role: "pickup" as const,
                  },
                ]
              : []),
            ...(selected.dropoffLat != null && selected.dropoffLng != null
              ? [
                  {
                    id: "dropoff",
                    lat: selected.dropoffLat,
                    lng: selected.dropoffLng,
                    label: selected.destination,
                    role: "dropoff" as const,
                  },
                ]
              : []),
          ]}
        >
          {#if !selected.rider}
            <div
              class="absolute left-1/2 top-[42%] z-10 -translate-x-1/2 rounded-md bg-surface px-3 py-2 text-sm text-ink-secondary shadow-sm"
            >
              Searching for a nearby motor rider…
            </div>
          {/if}
        </MapBackdrop>
      </div>

      <div class="space-y-2 border-t border-border px-5 py-4 text-sm">
        {#if panelError}
          <Alert>{panelError}</Alert>
        {/if}
        <p class="text-ink-secondary">
          <span class="font-semibold text-ink">Rider:</span>
          {selected.rider ?? "Unassigned"}
        </p>
        {#if selected.eta}
          <p class="text-ink-secondary">
            <span class="font-semibold text-ink">ETA:</span>
            <span class="font-mono-data text-primary">{selected.eta}</span>
          </p>
        {/if}
        <p class="text-ink-secondary">
          <span class="font-semibold text-ink">Pickup:</span>
          {selected.pickup ?? data.dashboard.businessProfile?.address ?? "—"}
        </p>
        <!-- The order record. Business-side only: the rider's screens never
             carry what the parcel is worth. -->
        <p class="text-ink-secondary">
          <span class="font-semibold text-ink">Order:</span>
          {selected.orderName}
          <span class="font-mono-data">· {formatCedis(selected.orderPrice)}</span>
        </p>

        <div class="flex items-center gap-2 pt-2">
          <Button variant="primary" size="sm" onclick={trackSelected}
            >Open tracking</Button
          >
          <div class="flex-1"></div>
          {#if canCancelSelected}
            <Button
              variant="outline"
              size="sm"
              disabled={cancelling}
              onclick={cancelSelected}
            >
              {cancelling ? "Cancelling…" : "Cancel request"}
            </Button>
          {/if}
        </div>
      </div>
    </aside>
  </div>
{/if}
