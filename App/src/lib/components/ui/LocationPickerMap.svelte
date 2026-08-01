<script module lang="ts">
  import {
    forwardGeocode,
    reverseGeocode as lookupAddress
  } from '$lib/client/maps/geocoding';
  import { GeoError, geoErrorMessage } from '$lib/shared/geo/errors';
  import {
    createClientGeocodeCache,
    forwardCacheKey,
    reverseCacheKey
  } from '$lib/shared/geo/geocode-cache';
  import { TtlCache } from '$lib/shared/ttl-cache';
  import type { CachedGeocode, LatLng } from '$lib/utils/types';

  /**
   * Module scope, not instance scope: the caches have to outlive a single visit
   * to a picker, or navigating away and back re-bills every lookup against the
   * Maps quota. Pickers are the only thing in the app that geocodes.
   */
  const geocodeCache = createClientGeocodeCache();
  const searchCache = new TtlCache<CachedGeocode[]>({ persistKey: 'yada:address-search-v1' });

  /**
   * The API key is a parameter because module scope cannot read component
   * context — the same reason `computeDrivingRoute` takes one.
   */
  async function reverseGeocode(apiKey: string, point: LatLng): Promise<CachedGeocode | null> {
    const key = reverseCacheKey(point.lat, point.lng);
    const cached = geocodeCache.get(key);
    if (cached) return cached;

    const entry = await lookupAddress(apiKey, point);
    geocodeCache.set(key, entry);

    return entry;
  }

  async function searchAddress(apiKey: string, query: string): Promise<CachedGeocode[]> {
    const key = forwardCacheKey(query);
    const cached = searchCache.get(key);
    if (cached) return cached;

    const results = await forwardGeocode(apiKey, query);
    if (results.length > 0) searchCache.set(key, results);

    return results;
  }
</script>

<script lang="ts">
  /**
   * Pick a point: type an address, or tap the map.
   *
   * Both, deliberately. Typing is how you get near the right place quickly;
   * tapping is how you say which side of the road, which gate, which block —
   * things an address string around KNUST doesn't distinguish. Whichever route
   * is taken, the output is the same: a coordinate, plus whatever Google calls
   * it, which is what a delivery actually needs.
   *
   * Renders the map pane and its search bar, filling its positioned parent. The
   * settled address is bound out rather than shown here, because the callers put
   * it in very different places — a form field on sign-up, a sidebar on /request.
   */
  import MapBackdrop from '$lib/components/MapBackdrop.svelte';
  import { getMapsConfig } from '$lib/client/maps/maps-config.svelte';
  import { getCurrentDeviceLocation } from '$lib/shared/geo/device-location';
  import { containsPoint } from '$lib/shared/geo/service-area';

  type PickerMarker = {
    id: string;
    lat: number;
    lng: number;
    label?: string;
    role?: 'pickup' | 'dropoff' | 'rider' | 'business' | 'search';
  };

  let {
    point = $bindable<LatLng | null>(null),
    address = $bindable(''),
    error = $bindable(''),
    resolving = $bindable(false),
    markerLabel = 'Location',
    markerRole = 'dropoff',
    extraMarkers = [],
    initialCenter = null,
    searchPlaceholder = 'Search an address, or tap the map',
    showLocateButton = false,
    locateLabel = 'Use my current location'
  }: {
    point?: LatLng | null;
    address?: string;
    error?: string;
    resolving?: boolean;
    markerLabel?: string;
    markerRole?: 'pickup' | 'dropoff' | 'business';
    extraMarkers?: PickerMarker[];
    initialCenter?: LatLng | null;
    searchPlaceholder?: string;
    showLocateButton?: boolean;
    locateLabel?: string;
  } = $props();

  const maps = getMapsConfig();

  // The caller's centre is a starting position, not a binding: once the map is
  // up, where it looks is the user's business (they pan it) and ours (we pan to
  // a searched or located point).
  // svelte-ignore state_referenced_locally
  let center = $state<LatLng | null>(initialCenter);
  // svelte-ignore state_referenced_locally
  let zoom = $state<number | null>(initialCenter ? 16 : null);
  let query = $state('');
  let searching = $state(false);
  let locating = $state(false);
  let matches = $state<CachedGeocode[]>([]);
  let searched = $state(false);

  /**
   * Adopt a point. Out-of-zone picks are rejected outright rather than pinned
   * and then refused at submit — the map is the input, so it has to be the
   * thing that says no.
   */
  async function choose(next: LatLng, options?: { label?: string; recenter?: boolean }) {
    if (!containsPoint(next)) {
      error = geoErrorMessage('out_of_zone');
      return;
    }

    error = '';
    point = next;

    if (options?.recenter) {
      center = next;
      zoom = 17;
    }

    // A searched address already carries its own label; only a tap has to ask
    // what is there.
    if (options?.label) {
      address = options.label;
      return;
    }

    if (!maps.enabled) {
      // No key, no geocoding: the coordinate still stands on its own.
      address = `${next.lat.toFixed(5)}, ${next.lng.toFixed(5)}`;
      return;
    }

    resolving = true;
    try {
      const resolved = await reverseGeocode(maps.apiKey, next);
      address = resolved?.address ?? `${next.lat.toFixed(5)}, ${next.lng.toFixed(5)}`;
    } catch (cause) {
      // A missing label doesn't invalidate the pin, so keep the point and say so.
      address = `${next.lat.toFixed(5)}, ${next.lng.toFixed(5)}`;
      error = cause instanceof GeoError ? cause.message : geoErrorMessage('unavailable');
    } finally {
      resolving = false;
    }
  }

  async function runSearch() {
    const text = query.trim();
    if (!text || searching) return;

    if (!maps.enabled) {
      error = 'Address search needs Google Maps. Tap the map to place the pin instead.';
      return;
    }

    searching = true;
    error = '';
    matches = [];

    try {
      const results = await searchAddress(maps.apiKey, text);
      // Out-of-zone matches are dropped here rather than offered and then
      // refused on selection.
      const inZone = results.filter((result) => containsPoint({ lat: result.lat, lng: result.lng }));
      searched = true;

      if (inZone.length === 0) {
        error =
          results.length > 0
            ? geoErrorMessage('out_of_zone')
            : 'No match for that address. Try a landmark, or tap the map.';
        return;
      }

      // One clear match applies itself; several are offered, because choosing
      // the wrong "Hall" is exactly the mistake this bar exists to avoid.
      if (inZone.length === 1) {
        await applyMatch(inZone[0]);
        return;
      }

      matches = inZone;
    } catch (cause) {
      error = cause instanceof GeoError ? cause.message : geoErrorMessage('unavailable');
    } finally {
      searching = false;
    }
  }

  async function applyMatch(match: CachedGeocode) {
    matches = [];
    query = match.address;
    await choose({ lat: match.lat, lng: match.lng }, { label: match.address, recenter: true });
  }

  async function locate() {
    if (locating) return;
    locating = true;
    error = '';

    try {
      const location = await getCurrentDeviceLocation();
      if (!location) {
        error = 'We could not read your location. Search or tap the map instead.';
        return;
      }
      await choose(location, { recenter: true });
    } finally {
      locating = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void runSearch();
    } else if (event.key === 'Escape') {
      matches = [];
    }
  }

  const markers = $derived([
    ...extraMarkers,
    ...(point
      ? [{ id: 'picked', lat: point.lat, lng: point.lng, label: markerLabel, role: markerRole }]
      : [])
  ]);
</script>

<MapBackdrop
  interactive
  {center}
  {zoom}
  {markers}
  onpick={(detail) => void choose({ lat: detail.lat, lng: detail.lng })}
/>

<!-- Over the map, where a search bar belongs, so both callers get it without
     having to find room for it in their own layout. -->
<div class="absolute inset-x-3 top-3 z-10">
  <div
    class="flex items-center gap-2 rounded-md border border-border bg-surface/95 px-3 py-2 shadow-sm backdrop-blur-sm focus-within:border-primary"
  >
    <svg
      viewBox="0 0 24 24"
      class="h-4 w-4 shrink-0 text-ink-tertiary"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
    <input
      type="search"
      class="w-full border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-disabled"
      placeholder={searchPlaceholder}
      autocomplete="off"
      aria-label={searchPlaceholder}
      bind:value={query}
      onkeydown={handleKeydown}
    />
    <button
      type="button"
      class="shrink-0 rounded-sm px-2 py-1 text-xs font-semibold text-primary disabled:opacity-50"
      disabled={searching || !query.trim()}
      onclick={runSearch}
    >
      {searching ? 'Searching…' : 'Search'}
    </button>
  </div>

  {#if matches.length > 0}
    <ul
      class="mt-1 max-h-52 overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg"
      role="listbox"
      aria-label="Address matches"
    >
      {#each matches as match (match.placeId ?? `${match.lat},${match.lng}`)}
        <li role="option" aria-selected="false">
          <button
            type="button"
            class="w-full px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-primary-subtle"
            onclick={() => applyMatch(match)}
          >
            {match.address}
          </button>
        </li>
      {/each}
    </ul>
  {:else if searched && !searching && point}
    <p class="mt-1 rounded-md bg-surface/95 px-3 py-1.5 text-xs text-ink-secondary shadow-sm">
      Not quite right? Tap the map to move the pin.
    </p>
  {/if}
</div>

{#if showLocateButton}
  <button
    type="button"
    class="absolute bottom-3 right-3 z-10 rounded-md border border-border bg-surface/95 px-3 py-2 text-xs font-semibold text-ink shadow-sm transition-colors hover:bg-surface disabled:opacity-60"
    disabled={locating}
    onclick={locate}
  >
    {locating ? 'Locating…' : locateLabel}
  </button>
{/if}
