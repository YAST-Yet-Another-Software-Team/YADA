<script module lang="ts">
  import type { Component } from 'svelte';
  import RacingHelmetIcon from '~icons/mdi/racing-helmet';
  import ShopIcon from '~icons/solar/shop-bold';

  type MapMarkerRole = 'pickup' | 'dropoff' | 'rider' | 'business' | 'search';

  type MapMarker = {
    id: string;
    lat: number;
    lng: number;
    label?: string;
    role?: MapMarkerRole;
    accent?: boolean;
    stale?: boolean;
    /**
     * Rings expanding out of this marker — "something is happening here, and
     * you are waiting on it". The one state that earns it is a business whose
     * request is still ringing riders; a marker that pulses for no reason is
     * just motion in the corner of a rider's eye.
     */
    pulse?: boolean;
  };

  /**
   * The two roles that are a *who* rather than a *where*. Pickup, dropoff and
   * search are points on a route and stay as dropped pins; a courier and a
   * business are parties, so they get a glyph that says which one you're
   * looking at without reading the tooltip.
   */
  const ROLE_ICONS: Partial<Record<MapMarkerRole, Component>> = {
    rider: RacingHelmetIcon,
    business: ShopIcon
  };
</script>

<script lang="ts">
  import { mount, onDestroy, onMount, unmount, type Snippet } from 'svelte';
  import { loadGoogleMaps, loadGoogleMapsMarker } from '$lib/client/maps/google-maps-loader';
  import { getMapsConfig } from '$lib/client/maps/maps-config.svelte';
  import { KUMASI_CENTER, KUMASI_DEFAULT_ZOOM } from '$lib/shared/geo/service-area';
  import {
    AUTO_FIT_DELAY_MS,
    boundsOf,
    containsAll,
    FIT_MAX_ZOOM,
    FIT_PADDING_PX,
    type Bounds
  } from '$lib/shared/geo/framing';
  import type { LatLng } from '$lib/utils/types';
  import { MAP_COLORS, MAP_ROLE_COLORS, MAP_SURFACE } from '$lib/styles/map-colors';
  import { resolveTheme, watchResolvedTheme, type ResolvedTheme } from '$lib/client/theme';
  import IconRecentre from '~icons/mdi/crosshairs-gps';

  let {
    routeLabel = false,
    interactive = false,
    locationUnavailable = false,
    fitIds = [],
    markers = [],
    polylinePath = $bindable([]),
    hintPath = [],
    center = null,
    zoom = null,
    children,
    onpick
  }: {
    routeLabel?: boolean;
    interactive?: boolean;
    locationUnavailable?: boolean;
    /**
     * Marker ids that must stay on screen together.
     *
     * This replaced a `followId` that centred the camera on one marker and
     * forced the zoom in to 16 on every update. A delivery has two parties, so
     * following one of them guaranteed the other was off screen — and the
     * forced zoom undid the viewer's own zoom about once a second, which read
     * as the map reloading. Framing is the honest version of what that prop
     * was reaching for.
     */
    fitIds?: string[];
    markers?: MapMarker[];
    /** The routed leg, drawn solid. */
    polylinePath?: LatLng[];
    /**
     * A straight dashed line — "and then it goes over there". Deliberately not
     * a route: it costs no Routes call, and drawing it as roads would claim a
     * precision about a journey nobody has started.
     */
    hintPath?: LatLng[];
    center?: LatLng | null;
    zoom?: number | null;
    children?: Snippet;
    onpick?: (detail: { lat: number; lng: number }) => void;
  } = $props();

  let mapElement = $state<HTMLDivElement | null>(null);
  let mapState = $state<'fallback' | 'loading' | 'ready' | 'error'>('fallback');
  let map = $state<google.maps.Map | null>(null);
  let googleMaps = $state<typeof google.maps | null>(null);
  let markerApi = $state<google.maps.MarkerLibrary | null>(null);
  let routePolyline: google.maps.Polyline | null = null;
  let hintPolyline: google.maps.Polyline | null = null;
  let lastCenteredKey = '';
  const maps = getMapsConfig();

  /** Every listener this component owns, dropped together on teardown. */
  let listeners: google.maps.MapsEventListener[] = [];

  /** The one-shot that clamps zoom after a fit; replaced on each fit. */
  let clampListener: google.maps.MapsEventListener | null = null;

  /**
   * One rendered marker, kept so the next update can move it rather than
   * rebuild it. `signature` covers everything that decides the *content* — the
   * position is excluded on purpose, because moving is the common case and the
   * whole point of holding these.
   */
  type RenderedMarker = {
    marker: google.maps.marker.AdvancedMarkerElement;
    icons: Record<string, unknown>[];
    signature: string;
  };

  let rendered = new Map<string, RenderedMarker>();

  /**
   * True while a camera move of ours is in flight.
   *
   * The fence around the feedback loop this component would otherwise have:
   * `fitBounds` fires `bounds_changed`, and `bounds_changed` is what decides
   * whether to fit. Without a way to tell our own move from the viewer's, the
   * two chase each other forever.
   */
  let programmatic = false;

  /** The viewer took the wheel; nothing moves the camera until they ask. */
  let suspended = $state(false);

  /** Armed when a framed party leaves the view, cleared when they return. */
  let refitTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * How many parties the camera was last framed around.
   *
   * A count rather than a flag, because they arrive one at a time: a trip is
   * framed on the counter alone until the rider's first fix lands. Growing
   * past this is a first frame, not drift, and gets the camera immediately.
   */
  let framedCount = 0;

  /**
   * Backstop for the fence.
   *
   * `programmatic` is cleared on the next `idle` — but a move that changes
   * nothing (fitting a camera that already fits) fires no `idle` at all, and
   * the flag would then stay up forever, swallowing every gesture after it.
   */
  let fenceTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Held rather than derived because the map is rebuilt from it, and rebuilding
   * has to happen at a moment of our choosing rather than mid-render.
   * Server-side it is never read: nothing draws until onMount.
   */
  let theme: ResolvedTheme = 'light';
  let mapsLibrary: google.maps.MapsLibrary | null = null;
  let stopThemeWatch: (() => void) | null = null;

  function markerColor(marker: MapMarker) {
    if (marker.role) return MAP_ROLE_COLORS[marker.role];
    return marker.accent ? MAP_COLORS.primary : MAP_COLORS.secondary;
  }

  /**
   * Four decimals — about 11 m.
   *
   * This was six, which is 0.11 m: finer than any GPS fix is accurate, so the
   * guard it exists to be never once held and the camera was re-aimed on every
   * jitter. A cell this size is smaller than the marker drawn in it.
   */
  function centerKey(point: LatLng | null) {
    if (!point) return '';
    return `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`;
  }

  /**
   * Run a camera move with the fence up.
   *
   * The flag is cleared on the next `idle` rather than immediately: a pan or a
   * fit settles over several frames and fires `bounds_changed` throughout, and
   * every one of those is ours.
   */
  function moveCamera(run: () => void) {
    if (!map) return;

    programmatic = true;
    if (fenceTimer) clearTimeout(fenceTimer);
    fenceTimer = setTimeout(() => {
      fenceTimer = undefined;
      programmatic = false;
    }, 1500);

    run();
  }

  function dropFence() {
    if (fenceTimer) clearTimeout(fenceTimer);
    fenceTimer = undefined;
    programmatic = false;
  }

  /** Pan, and only change zoom when a caller actually asked for one. */
  function panToPoint(point: LatLng, nextZoom?: number | null) {
    if (!map) return;

    moveCamera(() => {
      map!.panTo(point);
      if (nextZoom != null) map!.setZoom(nextZoom);
    });
  }

  /** The points that have to stay on screen together, in marker order. */
  function fitPoints(): LatLng[] {
    if (fitIds.length === 0) return [];

    return fitIds
      .map((id) => markers.find((marker) => marker.id === id))
      .filter((marker): marker is MapMarker => marker != null)
      .map((marker) => ({ lat: marker.lat, lng: marker.lng }));
  }

  function currentBounds(): Bounds | null {
    const bounds = map?.getBounds();
    if (!bounds) return null;

    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();

    return {
      south: southWest.lat(),
      west: southWest.lng(),
      north: northEast.lat(),
      east: northEast.lng()
    };
  }

  /**
   * Frame everything in `fitIds`.
   *
   * A single point is panned to rather than fitted: `fitBounds` on a
   * zero-width box zooms to the maximum the map will give, which is a
   * street-level close-up of one marker.
   */
  function frameNow() {
    const points = fitPoints();
    if (!map || points.length === 0) return;

    clearRefit();
    framedCount = points.length;

    if (points.length === 1) {
      panToPoint(points[0]);
      return;
    }

    const box = boundsOf(points);
    if (!box) return;

    moveCamera(() => {
      map!.fitBounds(
        { south: box.south, west: box.west, north: box.north, east: box.east },
        FIT_PADDING_PX
      );

      // `fitBounds` has no maxZoom, so the cap is applied once it has settled.
      // Two parties on the same street would otherwise fill the screen with
      // the gap between them.
      //
      // One listener, replaced rather than accumulated: fits happen for the
      // life of a trip, and a `once` listener that never fires — because the
      // fit changed nothing — would otherwise pile up.
      clampListener?.remove();
      clampListener = google.maps.event.addListenerOnce(map!, 'idle', () => {
        clampListener = null;

        if ((map?.getZoom() ?? 0) > FIT_MAX_ZOOM) {
          moveCamera(() => map?.setZoom(FIT_MAX_ZOOM));
        }
      });
    });
  }

  function clearRefit() {
    if (refitTimer) clearTimeout(refitTimer);
    refitTimer = undefined;
  }

  /**
   * Decide whether the camera owes anyone a move.
   *
   * Called after every settle and every marker update. Going off screen arms
   * the grace period rather than moving straight away — a rider clipping the
   * edge at a junction is not worth chasing, and one that has genuinely left
   * is still there five seconds later.
   */
  function reviewFraming() {
    const points = fitPoints();

    if (!map || points.length === 0) {
      clearRefit();
      return;
    }

    // The viewer's choice outranks everything below, including a party
    // arriving: they moved the camera deliberately and asked for nothing else.
    if (suspended) {
      clearRefit();
      return;
    }

    // A party the camera has never framed is not drift — the screen has never
    // shown this set together, so there is nothing to be patient about.
    if (points.length > framedCount) {
      frameNow();
      return;
    }

    if (containsAll(currentBounds(), points)) {
      clearRefit();
      return;
    }

    if (refitTimer) return;
    refitTimer = setTimeout(() => {
      refitTimer = undefined;
      if (!suspended) frameNow();
    }, AUTO_FIT_DELAY_MS);
  }

  /** The viewer moved the map themselves. */
  function suspendFraming() {
    if (fitIds.length === 0) return;

    suspended = true;
    clearRefit();
  }

  function recentre() {
    suspended = false;
    frameNow();
  }

  /**
   * Build the map at the current theme.
   *
   * Separate from onMount because `colorScheme` is a construction-time option —
   * the Maps SDK offers no setter for it — so following a theme change means
   * building a second map, not restyling the first. Everything the map owns
   * (markers, the route line, the click listener) is therefore re-established
   * here rather than once at mount.
   */
  function buildMap() {
    if (!mapsLibrary || !mapElement) {
      return;
    }

    map = new mapsLibrary.Map(mapElement, {
      center: center ?? KUMASI_CENTER,
      zoom: zoom ?? KUMASI_DEFAULT_ZOOM,
      // AdvancedMarkerElement renders nothing without a Map ID.
      mapId: maps.mapId,
      // Google's own dark cartography. Passed explicitly rather than as
      // FOLLOW_SYSTEM: that reads the OS only, which would ignore a user who
      // picked a theme in settings against their system setting.
      colorScheme: theme === 'dark' ? 'DARK' : 'LIGHT',
      disableDefaultUI: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });

    if (interactive) {
      listeners.push(
        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) {
            return;
          }

          onpick?.({
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          });
        })
      );
    }

    // The camera's own events, and the fence around them. `idle` is the settle:
    // it ends our move, and it is the only moment `getBounds()` is worth
    // reading. A drag or a zoom that arrives while the fence is down came from
    // the viewer, and their choice outranks any framing of ours.
    listeners.push(
      map.addListener('idle', () => {
        dropFence();
        reviewFraming();
      }),
      map.addListener('dragstart', () => {
        if (!programmatic) suspendFraming();
      }),
      map.addListener('zoom_changed', () => {
        if (!programmatic) suspendFraming();
      })
    );

    mapState = 'ready';
    lastCenteredKey = centerKey(center ?? KUMASI_CENTER);
    syncMarkers();
    syncPolylines();
    reviewFraming();
  }

  /**
   * Release everything attached to the current map.
   *
   * The Maps SDK has no `destroy()`; dropping every reference we hold and
   * letting the next `new Map()` take over the container is the documented
   * shape of this. Markers and the polyline must be detached explicitly or they
   * stay bound to the discarded instance and leak.
   */
  function teardownMap() {
    listeners.forEach((listener) => listener.remove());
    listeners = [];
    clampListener?.remove();
    clampListener = null;
    clearRefit();
    rendered.forEach((entry) => {
      entry.marker.map = null;
      entry.icons.forEach((icon) => void unmount(icon));
    });
    rendered = new Map();
    routePolyline?.setMap(null);
    routePolyline = null;
    hintPolyline?.setMap(null);
    hintPolyline = null;
    // A rebuilt map has framed nothing yet, and the viewer's suspension went
    // with the camera it applied to.
    framedCount = 0;
    suspended = false;
    dropFence();
    map = null;
  }

  onMount(async () => {
    if (!maps.enabled) {
      mapState = 'fallback';
      return;
    }

    if (!mapElement) {
      return;
    }

    theme = resolveTheme();
    mapState = 'loading';

    try {
      const [mapsLibraryResult, markerLibrary] = await Promise.all([
        loadGoogleMaps(maps.apiKey),
        loadGoogleMapsMarker(maps.apiKey)
      ]);

      if (!mapElement) {
        return;
      }

      googleMaps = window.google.maps;
      markerApi = markerLibrary;
      mapsLibrary = mapsLibraryResult;

      buildMap();

      stopThemeWatch = watchResolvedTheme((next) => {
        theme = next;

        if (mapState !== 'ready') {
          return;
        }

        teardownMap();
        buildMap();
      });
    } catch (error) {
      console.error('Unable to load Google Maps.', error);
      mapState = 'error';
    }
  });

  /**
   * A disc for roles that aren't a dropped pin — riders and businesses. The
   * role colour fills the disc and the glyph is knocked out of it in the
   * surface colour, so the marker still reads as its role at a glance from the
   * colour alone, the way it did when these were plain dots. The knockout
   * follows the theme: white against Google's light basemap, near-black against
   * its dark one, so the ring reads as separation either way instead of glare.
   */
  /**
   * Everything about a marker that decides what it *looks* like.
   *
   * Position is deliberately absent: a moving rider is the common case, and
   * the whole reason these are held is so movement is an assignment rather
   * than a teardown.
   */
  function markerSignature(marker: MapMarker) {
    return [
      marker.role ?? '',
      marker.label ?? '',
      marker.accent ? 'accent' : '',
      marker.stale ? 'stale' : '',
      marker.pulse ? 'pulse' : '',
      theme
    ].join('|');
  }

  function discContent(marker: MapMarker, color: string, icons: Record<string, unknown>[]) {
    const icon = marker.role ? ROLE_ICONS[marker.role] : undefined;
    const diameter = (marker.role === 'rider' ? 12 : 10) * 2;
    const element = document.createElement('div');

    element.style.width = `${diameter}px`;
    element.style.height = `${diameter}px`;
    element.style.borderRadius = '50%';
    element.style.background = color;
    element.style.border = `2px solid ${MAP_SURFACE[theme]}`;
    element.style.boxSizing = 'content-box';

    if (icon) {
      element.style.display = 'flex';
      element.style.alignItems = 'center';
      element.style.justifyContent = 'center';
      // The icons draw with `currentColor`, so one colour on the host is enough.
      element.style.color = MAP_SURFACE[theme];

      icons.push(
        mount(icon, {
          target: element,
          props: { width: diameter * 0.68, height: diameter * 0.68 }
        })
      );
    }

    if (!marker.pulse) return element;

    // Marker content is built imperatively, outside the template, so component
    // CSS can't reach it — the rings are animated through the Web Animations
    // API instead of a keyframes rule. Two of them, half a cycle apart, so the
    // pulse reads as continuous rather than as a blink.
    const host = document.createElement('div');
    host.style.position = 'relative';
    host.style.display = 'flex';
    host.style.alignItems = 'center';
    host.style.justifyContent = 'center';

    for (const delay of [0, 1200]) {
      const ring = document.createElement('div');
      ring.style.position = 'absolute';
      ring.style.width = `${diameter}px`;
      ring.style.height = `${diameter}px`;
      ring.style.borderRadius = '50%';
      ring.style.border = `2px solid ${color}`;
      ring.style.pointerEvents = 'none';
      ring.animate(
        [
          { transform: 'scale(1)', opacity: 0.75 },
          { transform: 'scale(3.4)', opacity: 0 }
        ],
        { duration: 2400, iterations: Infinity, delay, easing: 'ease-out' }
      );
      host.appendChild(ring);
    }

    host.appendChild(element);
    return host;
  }

  /** Build one marker's DOM and the Svelte roots that live inside it. */
  function buildMarker(marker: MapMarker, api: google.maps.MarkerLibrary): RenderedMarker {
    const color = markerColor(marker);
    const isPin = marker.role === 'search' || marker.role === 'dropoff' || marker.role === 'pickup';
    const icons: Record<string, unknown>[] = [];

    // PinElement extends HTMLElement, so it is its own content.
    const content: HTMLElement = isPin
      ? new api.PinElement({
          background: color,
          borderColor: MAP_SURFACE[theme],
          glyphColor: MAP_SURFACE[theme],
          scale: 1.2
        })
      : discContent(marker, color, icons);

    // AdvancedMarkerElement has no opacity option — it takes a DOM element,
    // so staleness is expressed on the element itself.
    content.style.opacity = marker.stale ? '0.45' : '1';

    return {
      marker: new api.AdvancedMarkerElement({
        map,
        position: { lat: marker.lat, lng: marker.lng },
        title: marker.label,
        zIndex: marker.role === 'search' || marker.role === 'dropoff' ? 999 : 10,
        content
      }),
      icons,
      signature: markerSignature(marker)
    };
  }

  /**
   * Bring the rendered markers in line with the incoming set, keyed by `id`.
   *
   * This used to detach every marker and rebuild all of them on every update —
   * including unmounting and remounting a Svelte root per glyph — which, with a
   * rider fix arriving about once a second, meant the markers were blinking
   * continuously. Moving one is now an assignment; only a marker whose
   * *appearance* changed is rebuilt.
   */
  function syncMarkers() {
    const currentMarkerApi = markerApi;

    if (!map || !currentMarkerApi) {
      return;
    }

    const seen = new Set<string>();

    for (const marker of markers) {
      seen.add(marker.id);

      const existing = rendered.get(marker.id);

      if (existing && existing.signature === markerSignature(marker)) {
        existing.marker.position = { lat: marker.lat, lng: marker.lng };
        continue;
      }

      if (existing) {
        existing.marker.map = null;
        existing.icons.forEach((icon) => void unmount(icon));
      }

      rendered.set(marker.id, buildMarker(marker, currentMarkerApi));
    }

    for (const [id, entry] of rendered) {
      if (seen.has(id)) continue;

      entry.marker.map = null;
      entry.icons.forEach((icon) => void unmount(icon));
      rendered.delete(id);
    }

    // A marker that moved may have taken a framed party off screen with it.
    reviewFraming();
  }

  /** Cheap identity for a path: nothing but its ends and its length move. */
  function pathKey(path: LatLng[]) {
    if (path.length === 0) return '';
    const first = path[0];
    const last = path[path.length - 1];
    return `${path.length}:${centerKey(first)}:${centerKey(last)}`;
  }

  let routeKey = '';
  let hintKey = '';

  function syncPolylines() {
    if (!map || !googleMaps) return;

    const nextRouteKey = pathKey(polylinePath);
    const nextHintKey = pathKey(hintPath);

    if (nextRouteKey !== routeKey) {
      routeKey = nextRouteKey;
      routePolyline?.setMap(null);
      routePolyline = null;

      if (polylinePath.length >= 2) {
        routePolyline = new googleMaps.Polyline({
          map,
          path: polylinePath,
          strokeColor: MAP_COLORS.primary,
          strokeOpacity: 0.9,
          strokeWeight: 4,
          zIndex: 20
        });
      }
    }

    if (nextHintKey !== hintKey) {
      hintKey = nextHintKey;
      hintPolyline?.setMap(null);
      hintPolyline = null;

      if (hintPath.length >= 2) {
        // Dashes are the SDK's way of saying "this is not a route": a
        // transparent stroke with a repeating dash symbol along it. Drawn
        // under the routed leg, because it is context rather than the thing
        // being followed.
        hintPolyline = new googleMaps.Polyline({
          map,
          path: hintPath,
          strokeOpacity: 0,
          zIndex: 10,
          icons: [
            {
              icon: {
                path: 'M 0,-1 0,1',
                strokeColor: MAP_COLORS.secondary,
                strokeOpacity: 0.9,
                strokeWeight: 3,
                scale: 3
              },
              offset: '0',
              repeat: '14px'
            }
          ]
        });
      }
    }
  }

  /**
   * Follow `center`, but only where nothing better owns the camera.
   *
   * With `fitIds` set the framing decides where to look, and a centre that
   * moves with every fix would fight it. The pickers, which have no framing,
   * still get their pan when a search result lands.
   */
  $effect(() => {
    if (mapState === 'ready' && map && center && fitIds.length === 0) {
      const key = centerKey(center);
      if (key && key !== lastCenteredKey) {
        lastCenteredKey = key;
        panToPoint(center, zoom);
      }
    }
  });

  $effect(() => {
    if (mapState === 'ready' && map && zoom != null && fitIds.length === 0) {
      moveCamera(() => map!.setZoom(zoom!));
    }
  });

  $effect(() => {
    if (mapState === 'ready') {
      markers;
      syncMarkers();
    }
  });

  $effect(() => {
    if (mapState === 'ready') {
      polylinePath;
      hintPath;
      syncPolylines();
    }
  });

  onDestroy(() => {
    stopThemeWatch?.();
    stopThemeWatch = null;
    teardownMap();
  });
</script>

<div class="absolute inset-0 overflow-hidden bg-surface-sunken">
  <div
    bind:this={mapElement}
    class="absolute inset-0 transition-opacity duration-300"
    class:opacity-0={mapState !== 'ready'}
    style:cursor={interactive ? 'crosshair' : 'default'}
  ></div>

  {#if mapState !== 'ready'}
    <div
      class="absolute inset-0 overflow-hidden bg-surface-sunken"
      style="background-image: linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px); background-size: 28px 28px;"
    >
      <div class="font-mono-data absolute left-4 top-4 text-xs tracking-wide text-ink-tertiary">
        {#if !maps.enabled}
          MAP PLACEHOLDER — set GOOGLE_MAPS_API_KEY
        {:else if mapState === 'loading'}
          LOADING KUMASI MAP…
        {:else if mapState === 'error'}
          GOOGLE MAPS FAILED — FALLING BACK TO MOCK MAP
        {:else}
          MAPS TEMPORARILY DISABLED
        {/if}
      </div>
      {#if routeLabel}
        <div
          class="absolute left-[12%] right-[12%] top-[38%] border-t-[3px] border-dashed border-secondary"
        ></div>
      {/if}
      {#if interactive}
        <div
          class="absolute bottom-4 left-4 rounded-md bg-surface/95 px-3 py-2 text-xs font-semibold text-ink shadow-sm"
        >
          Click on the map to choose a location
        </div>
      {/if}
    </div>
  {/if}

  {#if locationUnavailable && mapState === 'ready'}
    <div
      class="absolute left-4 top-4 z-10 rounded-md bg-surface/95 px-3 py-2 text-xs font-semibold text-ink-secondary shadow-sm"
    >
      Location unavailable — showing last known position
    </div>
  {/if}

  <!-- Only after the viewer has moved the map themselves. Until then the
       camera frames both parties on its own and a button offering to do what
       is already happening would be noise. -->
  {#if suspended && mapState === 'ready' && fitIds.length > 0}
    <button
      type="button"
      class="absolute bottom-4 right-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-surface/95 px-3.5 py-2 text-sm font-semibold text-ink shadow-md backdrop-blur-sm transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-3 focus-visible:outline-focus"
      onclick={recentre}
    >
      <IconRecentre class="h-4 w-4 shrink-0" aria-hidden="true" />
      Recentre
    </button>
  {/if}

  {@render children?.()}
</div>
