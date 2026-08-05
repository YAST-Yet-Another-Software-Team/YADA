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
  import { describePoint, isPlusCode, searchLandmarks } from '$lib/shared/geo/landmarks';
  import { TtlCache } from '$lib/shared/ttl-cache';
  import type { CachedGeocode, LatLng } from '$lib/utils/types';

  /**
   * Module scope, not instance scope: the caches have to outlive a single visit
   * to a picker, or navigating away and back re-bills every lookup against the
   * Maps quota. Pickers are the only thing in the app that geocodes.
   */
  const geocodeCache = createClientGeocodeCache();
  const searchCache = new TtlCache<CachedGeocode[]>({ persistKey: 'yada:address-search-v1' });

  /** Shown only when a point is outside the table and the geocoder can't help. */
  const UNNAMED_POINT = 'Pinned location';

  /**
   * What to call a point on the map.
   *
   * Never its coordinates. The chain is cheapest-first and each step is a
   * lookup the next one doesn't have to pay for:
   *
   *   1. the landmark table — free, curated, and the name people here use;
   *   2. the cache — free, and holds a month of previously named cells;
   *   3. the Geocoding API — billed once, then cached;
   *   4. "Near <landmark>" — for a point the geocoder couldn't name, or named
   *      with a Plus Code, which is coordinates in another costume;
   *   5. a plain "Pinned location", which at least reads as a thing.
   *
   * The key is a parameter because module scope cannot read component context —
   * the same reason `computeDrivingRoute` takes one.
   */
  async function nameForPoint(apiKey: string, point: LatLng, mapsEnabled: boolean) {
    const known = describePoint(point);
    if (known && !known.startsWith('Near ')) return { address: known, failed: false };

    const key = reverseCacheKey(point.lat, point.lng);
    const cached = geocodeCache.get(key);
    if (cached) return { address: cached.address, failed: false };

    if (!mapsEnabled) return { address: known ?? UNNAMED_POINT, failed: false };

    try {
      const entry = await lookupAddress(apiKey, point);

      // Prefer a landmark we know over a Plus Code we don't. Either way the
      // label that gets shown is the label that gets cached, so the next tap in
      // this cell agrees with this one without another call.
      const address = isPlusCode(entry.address) ? (known ?? entry.address) : entry.address;
      geocodeCache.set(key, { ...entry, address });

      return { address, failed: false };
    } catch (error) {
      return { address: known ?? UNNAMED_POINT, failed: true, error };
    }
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
  import { onDestroy } from 'svelte';
  import MapBackdrop from '$lib/components/MapBackdrop.svelte';
  import { getMapsConfig } from '$lib/client/maps/maps-config.svelte';
  import {
    fetchPlaceSuggestions,
    resolveSuggestion,
    type PlaceSuggestion
  } from '$lib/client/maps/places';
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
   * A row in the suggestion list: either a Places prediction, which costs a
   * lookup to resolve, or a landmark from the table, which is already a
   * coordinate and a name and so costs nothing at all.
   */
  type PickerSuggestion =
    | ({ kind: 'place' } & PlaceSuggestion)
    | {
        kind: 'landmark';
        id: string;
        mainText: string;
        secondaryText: string;
        lat: number;
        lng: number;
      };

  /** Predictions for what's being typed, and where the arrow keys are in them. */
  let suggestions = $state<PickerSuggestion[]>([]);
  let highlighted = $state(-1);
  let suggesting = $state(false);
  let suggestTimer: ReturnType<typeof setTimeout> | null = null;
  /** Rising id, so a slow response for an old query can't overwrite a newer one. */
  let suggestRequest = 0;

  /** Long enough that a prediction has something to go on, short enough to feel live. */
  const MIN_QUERY_LENGTH = 2;
  const SUGGEST_DEBOUNCE_MS = 200;

  /** Ties the input to its listbox for `aria-controls` / `aria-activedescendant`. */
  const pickerId = `location-picker-${Math.random().toString(36).slice(2, 9)}`;

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

    resolving = true;
    try {
      const named = await nameForPoint(maps.apiKey, next, maps.enabled);
      address = named.address;

      // A pin that couldn't be named is still a valid pin — it keeps whatever
      // the table could say about it — but the failure is worth surfacing.
      if (named.failed) {
        error =
          named.error instanceof GeoError ? named.error.message : geoErrorMessage('unavailable');
      }
    } finally {
      resolving = false;
    }
  }

  /**
   * Ask for predictions, debounced.
   *
   * Failures are swallowed to an empty list rather than raised: predictions are
   * an accelerator, and the bar still resolves what was typed on Enter, so a
   * Places outage should cost the shortcut and nothing else.
   */
  function landmarkSuggestions(text: string): PickerSuggestion[] {
    return searchLandmarks(text).map((landmark) => ({
      kind: 'landmark' as const,
      id: `landmark:${landmark.id}`,
      mainText: landmark.name,
      secondaryText: landmark.area,
      lat: landmark.lat,
      lng: landmark.lng
    }));
  }

  function scheduleSuggestions(text: string) {
    if (suggestTimer) clearTimeout(suggestTimer);

    if (text.trim().length < MIN_QUERY_LENGTH) {
      suggestions = [];
      highlighted = -1;
      return;
    }

    // The table answers instantly and for nothing, so it answers first — before
    // the debounce, before the network. For the places most deliveries go to,
    // the prediction that follows is never needed.
    const local = landmarkSuggestions(text);
    suggestions = local;
    highlighted = -1;

    if (!maps.enabled) return;

    suggestTimer = setTimeout(async () => {
      const request = ++suggestRequest;
      suggesting = true;

      try {
        const results = await fetchPlaceSuggestions(maps.apiKey, text);
        if (request !== suggestRequest) return;

        // Local names keep the top of the list; predictions fill in behind them,
        // minus anything the table already covers.
        const known = new Set(local.map((item) => item.mainText.toLowerCase()));
        suggestions = [
          ...local,
          ...results
            .filter((result) => !known.has(result.mainText.toLowerCase()))
            .map((result) => ({ kind: 'place' as const, ...result }))
        ];
        highlighted = -1;
        matches = [];
      } catch {
        if (request === suggestRequest) suggestions = local;
      } finally {
        if (request === suggestRequest) suggesting = false;
      }
    }, SUGGEST_DEBOUNCE_MS);
  }

  function handleInput(event: Event) {
    query = (event.target as HTMLInputElement).value;
    error = '';
    searched = false;
    scheduleSuggestions(query);
  }

  function dismissSuggestions() {
    if (suggestTimer) clearTimeout(suggestTimer);
    // Bump the id so a request already in flight lands on the floor.
    suggestRequest++;
    suggestions = [];
    highlighted = -1;
    suggesting = false;
  }

  /** Take a suggestion: resolve it to a coordinate if it isn't one already, then pin it. */
  async function applySuggestion(suggestion: PickerSuggestion) {
    dismissSuggestions();

    if (suggestion.kind === 'landmark') {
      // Already a name and a coordinate. Nothing to look up, nothing to bill.
      const label = `${suggestion.mainText}, ${suggestion.secondaryText}`;
      query = label;
      await choose({ lat: suggestion.lat, lng: suggestion.lng }, { label, recenter: true });
      return;
    }

    searching = true;
    error = '';

    try {
      const place = await resolveSuggestion(suggestion);

      // A prediction that resolves to a Plus Code gets the same treatment a
      // tapped pin does — the table's name for it, if the table knows one.
      const label = isPlusCode(place.address)
        ? (describePoint({ lat: place.lat, lng: place.lng }) ?? place.address)
        : place.address;

      query = label;
      await choose({ lat: place.lat, lng: place.lng }, { label, recenter: true });
    } catch (cause) {
      error = cause instanceof GeoError ? cause.message : geoErrorMessage('unavailable');
    } finally {
      searching = false;
    }
  }

  /**
   * Resolve whatever is in the bar without a prediction to go on — pressing
   * Enter on a full address, or searching when Places has nothing to offer.
   */
  async function runSearch() {
    const text = query.trim();
    if (!text || searching) return;

    if (!maps.enabled) {
      // The landmark table already offered whatever it had as you typed.
      error = 'No match here without Google Maps. Pick a nearby landmark, or tap the map.';
      return;
    }

    dismissSuggestions();
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

    // Same rule as everywhere else: a Plus Code is not a name.
    const label = isPlusCode(match.address)
      ? (describePoint({ lat: match.lat, lng: match.lng }) ?? match.address)
      : match.address;

    query = label;
    await choose({ lat: match.lat, lng: match.lng }, { label, recenter: true });
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
    if (event.key === 'ArrowDown' && suggestions.length > 0) {
      event.preventDefault();
      highlighted = (highlighted + 1) % suggestions.length;
      return;
    }

    if (event.key === 'ArrowUp' && suggestions.length > 0) {
      event.preventDefault();
      highlighted = (highlighted - 1 + suggestions.length) % suggestions.length;
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      // Enter takes the highlighted prediction, or the first one if the list is
      // showing but nothing is highlighted — which is what pressing Enter in a
      // maps search bar is understood to mean. With no predictions at all it
      // falls through to geocoding the raw text.
      const choice = suggestions[highlighted] ?? suggestions[0];
      if (choice) {
        void applySuggestion(choice);
        return;
      }

      void runSearch();
      return;
    }

    if (event.key === 'Escape') {
      dismissSuggestions();
      matches = [];
    }
  }

  onDestroy(() => {
    if (suggestTimer) clearTimeout(suggestTimer);
  });

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
      role="combobox"
      aria-expanded={suggestions.length > 0}
      aria-controls="{pickerId}-suggestions"
      aria-activedescendant={highlighted >= 0 ? `${pickerId}-suggestion-${highlighted}` : undefined}
      aria-label={searchPlaceholder}
      value={query}
      oninput={handleInput}
      onkeydown={handleKeydown}
    />
    {#if suggesting}
      <span class="shrink-0 text-xs text-ink-tertiary">…</span>
    {/if}
    <button
      type="button"
      class="shrink-0 rounded-sm px-2 py-1 text-xs font-semibold text-primary disabled:opacity-50"
      disabled={searching || !query.trim()}
      onclick={runSearch}
    >
      {searching ? 'Searching…' : 'Search'}
    </button>
  </div>

  {#if suggestions.length > 0}
    <!-- Predictions while typing, the way a map's search bar behaves. Choosing
         one drops the pin; the map stays available for the last few metres. -->
    <ul
      id="{pickerId}-suggestions"
      class="mt-1 max-h-56 overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg"
      role="listbox"
      aria-label="Address suggestions"
    >
      {#each suggestions as suggestion, index (suggestion.id)}
        <li
          id="{pickerId}-suggestion-{index}"
          role="option"
          aria-selected={index === highlighted}
        >
          <button
            type="button"
            class="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors {index ===
            highlighted
              ? 'bg-primary-subtle'
              : 'hover:bg-primary-subtle'}"
            onmouseenter={() => (highlighted = index)}
            onmousedown={(event) => {
              // Ahead of blur, so the list is still there when the click lands.
              event.preventDefault();
              void applySuggestion(suggestion);
            }}
          >
            <svg
              viewBox="0 0 24 24"
              class="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-tertiary"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" />
              <circle cx="12" cy="10" r="2" />
            </svg>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-ink">{suggestion.mainText}</span>
              {#if suggestion.secondaryText}
                <span class="block truncate text-xs text-ink-secondary">
                  {suggestion.secondaryText}
                </span>
              {/if}
            </span>
          </button>
        </li>
      {/each}
    </ul>
  {:else if matches.length > 0}
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
            onmousedown={(event) => {
              event.preventDefault();
              void applyMatch(match);
            }}
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
