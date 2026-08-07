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
  /**
   * The map pane, on MapLibre GL JS with OpenStreetMap tiles.
   *
   * The props contract is deliberately identical to the Google implementation
   * this replaces — a dozen call sites depend on it, and preserving it is what
   * made the swap a single-file change. `polylinePath` stays `$bindable` for the
   * same reason, even though nothing here writes back to it.
   *
   * MapLibre differs from the Google SDK in two ways that shape the code below.
   * It is a module import rather than a script the page loads at runtime, so
   * there is no loader and no API key — but it must be imported dynamically,
   * because it touches `window` at module scope and would break SSR. And it has
   * no marker/polyline objects with a `map` property: markers are DOM elements
   * attached to the map, and a line is a GeoJSON source with a layer over it,
   * which is why the route is updated by calling `setData` rather than by
   * tearing down and rebuilding.
   */
  import { mount, onDestroy, onMount, unmount, type Snippet } from 'svelte';
  import type { GeoJSONSource, LngLatLike, Map as MapLibreMap, Marker } from 'maplibre-gl';
  import { getMapsConfig } from '$lib/client/maps/maps-config.svelte';
  import { KUMASI_CENTER, KUMASI_DEFAULT_ZOOM } from '$lib/shared/geo/service-area';
  import type { LatLng } from '$lib/utils/types';
  import { MAP_COLORS, MAP_ROLE_COLORS, MAP_SURFACE } from '$lib/styles/map-colors';

  let {
    routeLabel = false,
    interactive = false,
    locationUnavailable = false,
    followId = null,
    markers = [],
    polylinePath = $bindable([]),
    center = null,
    zoom = null,
    children,
    onpick
  }: {
    routeLabel?: boolean;
    interactive?: boolean;
    locationUnavailable?: boolean;
    followId?: string | null;
    markers?: MapMarker[];
    polylinePath?: LatLng[];
    center?: LatLng | null;
    zoom?: number | null;
    children?: Snippet;
    onpick?: (detail: { lat: number; lng: number }) => void;
  } = $props();

  const ROUTE_SOURCE = 'yada-route';
  const ROUTE_LAYER = 'yada-route-line';

  let mapElement = $state<HTMLDivElement | null>(null);
  let mapState = $state<'fallback' | 'loading' | 'ready' | 'error'>('fallback');
  let map: MapLibreMap | null = null;
  let renderedMarkers: Marker[] = [];
  /** Icon components mounted into marker elements, held so they can be torn down. */
  let renderedIcons: Record<string, unknown>[] = [];
  let lastCenteredKey = '';
  const maps = getMapsConfig();

  /**
   * The knockout colour for marker rings and glyphs.
   *
   * Under the Google build this followed the app theme, because the basemap did
   * too — `colorScheme` handed a dark app dark cartography, and a white ring
   * against it was glare. The OSM style is a single URL with a single palette
   * and stays light whichever theme the app is in, so the ring that separates a
   * marker from the streets under it stays light with it.
   */
  const MARKER_KNOCKOUT = MAP_SURFACE.light;

  function markerColor(marker: MapMarker) {
    if (marker.role) return MAP_ROLE_COLORS[marker.role];
    return marker.accent ? MAP_COLORS.primary : MAP_COLORS.secondary;
  }

  function centerKey(point: LatLng | null) {
    if (!point) return '';
    return `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
  }

  /** MapLibre speaks [lng, lat]; the rest of the app speaks {lat, lng}. */
  function toLngLat(point: LatLng): LngLatLike {
    return [point.lng, point.lat];
  }

  function panToPoint(point: LatLng, nextZoom?: number | null) {
    if (!map) return;
    map.easeTo({
      center: toLngLat(point),
      zoom: nextZoom ?? Math.max(map.getZoom(), 16),
      duration: 400
    });
  }

  /**
   * A teardrop for a dropped pin, a glyph disc for everything else — the same
   * visual split the Google build drew with PinElement and a styled div.
   *
   * The disc carries the role's icon knocked out in surface white, so a courier
   * and a business are told apart by shape as well as by colour. MapLibre takes
   * a DOM element it does not own, which is what makes mounting a Svelte
   * component into it work here the same way it did under the Google SDK.
   */
  function markerElement(marker: MapMarker) {
    const color = markerColor(marker);
    const isPin = marker.role === 'search' || marker.role === 'dropoff' || marker.role === 'pickup';
    const element = document.createElement('div');
    let content: HTMLElement = element;

    if (isPin) {
      element.innerHTML = `
        <svg width="26" height="34" viewBox="0 0 26 34" aria-hidden="true">
          <path d="M13 33C13 33 25 20.5 25 13A12 12 0 1 0 1 13c0 7.5 12 20 12 20Z"
                fill="${color}" stroke="${MARKER_KNOCKOUT}" stroke-width="2"/>
          <circle cx="13" cy="13" r="4.5" fill="${MARKER_KNOCKOUT}"/>
        </svg>`;
      element.style.transform = 'translateY(-6px)';
    } else {
      const icon = marker.role ? ROLE_ICONS[marker.role] : undefined;
      const diameter = (marker.role === 'rider' ? 12 : 10) * 2;

      element.style.width = `${diameter}px`;
      element.style.height = `${diameter}px`;
      element.style.borderRadius = '50%';
      element.style.background = color;
      element.style.border = `2px solid ${MARKER_KNOCKOUT}`;
      element.style.boxSizing = 'content-box';

      if (icon) {
        element.style.display = 'flex';
        element.style.alignItems = 'center';
        element.style.justifyContent = 'center';
        // The icons draw with `currentColor`, so one colour on the host is enough.
        element.style.color = MARKER_KNOCKOUT;

        renderedIcons.push(
          mount(icon, {
            target: element,
            props: { width: diameter * 0.68, height: diameter * 0.68 }
          })
        );
      }

      if (marker.pulse) {
        content = pulseHost(element, diameter, color);
      }
    }

    // Staleness is expressed on the element, as it was before.
    content.style.opacity = marker.stale ? '0.45' : '1';
    if (marker.label) content.title = marker.label;

    return content;
  }

  /**
   * Wrap a disc in expanding rings.
   *
   * Marker content is built imperatively, outside the template, so component
   * CSS can't reach it — the rings are animated through the Web Animations API
   * instead of a keyframes rule. Two of them, half a cycle apart, so the pulse
   * reads as continuous rather than as a blink. Only discs get this: the one
   * marker that earns rings is the business still ringing riders, and a pin is
   * a place rather than a party waiting on something.
   */
  function pulseHost(element: HTMLElement, diameter: number, color: string) {
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

  function syncMarkers() {
    renderedMarkers.forEach((marker) => marker.remove());
    renderedMarkers = [];
    renderedIcons.forEach((icon) => void unmount(icon));
    renderedIcons = [];

    const instance = map;
    if (!instance) return;

    renderedMarkers = markers.map((marker) =>
      new MarkerCtor({ element: markerElement(marker), anchor: 'center' })
        .setLngLat(toLngLat(marker))
        .addTo(instance)
    );

    if (followId) {
      const target = markers.find((m) => m.id === followId);
      if (target) {
        panToPoint({ lat: target.lat, lng: target.lng });
      }
    }
  }

  /**
   * Update the route line in place.
   *
   * The source and layer are created once, when the style loads, and only their
   * data changes afterwards — removing and re-adding a layer on every fix makes
   * the line flicker, and mid-trip this runs whenever the rider leaves it.
   */
  function syncPolyline() {
    const instance = map;
    if (!instance || !instance.isStyleLoaded()) return;

    const source = instance.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined;
    if (!source) return;

    source.setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: polylinePath.length > 1 ? polylinePath.map((p) => [p.lng, p.lat]) : []
      }
    });
  }

  // Held at module-instance scope because `syncMarkers` needs the constructor and
  // the dynamic import that supplies it resolves inside onMount.
  let MarkerCtor: typeof Marker;

  onMount(async () => {
    if (!maps.enabled || !mapElement) {
      mapState = 'fallback';
      return;
    }

    mapState = 'loading';

    try {
      // Dynamic: maplibre-gl reads `window` at module scope, so a static import
      // would break SSR for every page that shows a map.
      //
      // The worker URL is handed over explicitly. Left alone, MapLibre finds its
      // tile-parsing worker with `new URL('./maplibre-gl-worker.mjs',
      // import.meta.url)` — a template literal no bundler can trace, so the file
      // is never emitted and the built chunk asks for a worker that sits nowhere
      // near it. `?worker&url` makes Vite bundle it properly (it imports the
      // 480kB shared chunk, so copying the file alone is not enough) and hand
      // back the URL of what it emitted.
      const [maplibre, workerUrl] = await Promise.all([
        import('maplibre-gl'),
        import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url')
      ]);
      await import('maplibre-gl/dist/maplibre-gl.css');

      if (!mapElement) return;

      maplibre.setWorkerUrl(workerUrl.default);
      MarkerCtor = maplibre.Marker;

      map = new maplibre.Map({
        container: mapElement,
        style: maps.styleUrl,
        center: toLngLat(center ?? KUMASI_CENTER),
        zoom: zoom ?? KUMASI_DEFAULT_ZOOM,
        attributionControl: { compact: true },
        // The Google build set `disableDefaultUI`; these are the equivalents.
        dragRotate: false,
        pitchWithRotate: false,
        touchZoomRotate: true
      });

      map.touchZoomRotate.disableRotation();

      if (interactive) {
        map.on('click', (event) => {
          onpick?.({ lat: event.lngLat.lat, lng: event.lngLat.lng });
        });
        map.getCanvas().style.cursor = 'crosshair';
      }

      await new Promise<void>((resolve, reject) => {
        map?.once('load', () => resolve());
        map?.once('error', (event) => reject(event.error ?? new Error('Map failed to load.')));
      });

      // Create the route source and layer once; syncPolyline only sets data.
      map.addSource(ROUTE_SOURCE, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
      map.addLayer({
        id: ROUTE_LAYER,
        type: 'line',
        source: ROUTE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': MAP_COLORS.primary,
          'line-width': 4,
          'line-opacity': 0.9
        }
      });

      mapState = 'ready';
      lastCenteredKey = centerKey(center ?? KUMASI_CENTER);
      syncMarkers();
      syncPolyline();
    } catch (error) {
      console.error('Unable to load the map.', error);
      mapState = 'error';
    }
  });

  $effect(() => {
    if (mapState === 'ready' && map && center) {
      const key = centerKey(center);
      if (key && key !== lastCenteredKey) {
        lastCenteredKey = key;
        panToPoint(center, zoom);
      }
    }
  });

  $effect(() => {
    if (mapState === 'ready' && map && zoom != null) {
      map.setZoom(zoom);
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
      syncPolyline();
    }
  });

  onDestroy(() => {
    renderedMarkers.forEach((marker) => marker.remove());
    renderedMarkers = [];
    renderedIcons.forEach((icon) => void unmount(icon));
    renderedIcons = [];
    map?.remove();
    map = null;
  });
</script>

<div class="absolute inset-0 overflow-hidden bg-surface-sunken">
  <div
    bind:this={mapElement}
    class="absolute inset-0 transition-opacity duration-300"
    class:opacity-0={mapState !== 'ready'}
  ></div>

  {#if mapState !== 'ready'}
    <div
      class="absolute inset-0 overflow-hidden bg-surface-sunken"
      style="background-image: linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px); background-size: 28px 28px;"
    >
      <div class="font-mono-data absolute left-4 top-4 text-xs tracking-wide text-ink-tertiary">
        {#if !maps.enabled}
          MAP PLACEHOLDER — set MAP_STYLE_URL
        {:else if mapState === 'loading'}
          LOADING KUMASI MAP…
        {:else if mapState === 'error'}
          MAP TILES FAILED — FALLING BACK TO MOCK MAP
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

  {@render children?.()}
</div>
