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
  import type { LatLng } from '$lib/utils/types';
  import { MAP_COLORS, MAP_ROLE_COLORS } from '$lib/styles/map-colors';

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

  let mapElement = $state<HTMLDivElement | null>(null);
  let mapState = $state<'fallback' | 'loading' | 'ready' | 'error'>('fallback');
  let map = $state<google.maps.Map | null>(null);
  let clickListener: google.maps.MapsEventListener | null = null;
  let googleMaps = $state<typeof google.maps | null>(null);
  let markerApi = $state<google.maps.MarkerLibrary | null>(null);
  let renderedMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
  let renderedIcons: Record<string, unknown>[] = [];
  let routePolyline: google.maps.Polyline | null = null;
  let lastCenteredKey = '';
  const maps = getMapsConfig();

  function markerColor(marker: MapMarker) {
    if (marker.role) return MAP_ROLE_COLORS[marker.role];
    return marker.accent ? MAP_COLORS.primary : MAP_COLORS.secondary;
  }

  function centerKey(point: LatLng | null) {
    if (!point) return '';
    return `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
  }

  function panToPoint(point: LatLng, nextZoom?: number | null) {
    if (!map) return;
    map.panTo(point);
    const targetZoom = nextZoom ?? Math.max(map.getZoom() ?? KUMASI_DEFAULT_ZOOM, 16);
    map.setZoom(targetZoom);
  }

  onMount(async () => {
    if (!maps.enabled) {
      mapState = 'fallback';
      return;
    }

    if (!mapElement) {
      return;
    }

    mapState = 'loading';

    try {
      const [mapsLibrary, markerLibrary] = await Promise.all([
        loadGoogleMaps(maps.apiKey),
        loadGoogleMapsMarker(maps.apiKey)
      ]);

      if (!mapElement) {
        return;
      }

      googleMaps = window.google.maps;
      markerApi = markerLibrary;

      map = new mapsLibrary.Map(mapElement, {
        center: center ?? KUMASI_CENTER,
        zoom: zoom ?? KUMASI_DEFAULT_ZOOM,
        // AdvancedMarkerElement renders nothing without a Map ID.
        mapId: maps.mapId,
        disableDefaultUI: true,
        clickableIcons: false,
        gestureHandling: 'greedy',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      });

      if (interactive) {
        clickListener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) {
            return;
          }

          onpick?.({
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          });
        });
      }

      mapState = 'ready';
      lastCenteredKey = centerKey(center ?? KUMASI_CENTER);
      syncMarkers();
      syncPolyline();
    } catch (error) {
      console.error('Unable to load Google Maps.', error);
      mapState = 'error';
    }
  });

  /**
   * A disc for roles that aren't a dropped pin — riders and businesses. The
   * role colour fills the disc and the glyph is knocked out of it in surface
   * white, so the marker still reads as its role at a glance from the colour
   * alone, the way it did when these were plain dots.
   */
  function discContent(marker: MapMarker, color: string) {
    const icon = marker.role ? ROLE_ICONS[marker.role] : undefined;
    const diameter = (marker.role === 'rider' ? 12 : 10) * 2;
    const element = document.createElement('div');

    element.style.width = `${diameter}px`;
    element.style.height = `${diameter}px`;
    element.style.borderRadius = '50%';
    element.style.background = color;
    element.style.border = `2px solid ${MAP_COLORS.surface}`;
    element.style.boxSizing = 'content-box';

    if (icon) {
      element.style.display = 'flex';
      element.style.alignItems = 'center';
      element.style.justifyContent = 'center';
      // The icons draw with `currentColor`, so one colour on the host is enough.
      element.style.color = MAP_COLORS.surface;

      renderedIcons.push(
        mount(icon, {
          target: element,
          props: { width: diameter * 0.68, height: diameter * 0.68 }
        })
      );
    }

    return element;
  }

  function syncMarkers() {
    renderedMarkers.forEach((marker) => (marker.map = null));
    renderedMarkers = [];
    renderedIcons.forEach((icon) => void unmount(icon));
    renderedIcons = [];

    const currentMarkerApi = markerApi;

    if (!map || !currentMarkerApi) {
      return;
    }

    renderedMarkers = markers.map((marker) => {
      const color = markerColor(marker);
      const isPin = marker.role === 'search' || marker.role === 'dropoff' || marker.role === 'pickup';

      // PinElement extends HTMLElement, so it is its own content.
      const content: HTMLElement = isPin
        ? new currentMarkerApi.PinElement({
            background: color,
            borderColor: MAP_COLORS.surface,
            glyphColor: MAP_COLORS.surface,
            scale: 1.2
          })
        : discContent(marker, color);

      // AdvancedMarkerElement has no opacity option — it takes a DOM element,
      // so staleness is expressed on the element itself.
      content.style.opacity = marker.stale ? '0.45' : '1';

      return new currentMarkerApi.AdvancedMarkerElement({
        map,
        position: { lat: marker.lat, lng: marker.lng },
        title: marker.label,
        zIndex: marker.role === 'search' || marker.role === 'dropoff' ? 999 : 10,
        content
      });
    });

    if (followId) {
      const target = markers.find((m) => m.id === followId);
      if (target) {
        panToPoint({ lat: target.lat, lng: target.lng });
      }
    }
  }

  function syncPolyline() {
    if (routePolyline) {
      routePolyline.setMap(null);
      routePolyline = null;
    }

    if (!map || !googleMaps || polylinePath.length < 2) {
      return;
    }

    routePolyline = new googleMaps.Polyline({
      map,
      path: polylinePath,
      strokeColor: MAP_COLORS.primary,
      strokeOpacity: 0.9,
      strokeWeight: 4
    });
  }

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
    clickListener?.remove();
    renderedMarkers.forEach((marker) => (marker.map = null));
    renderedIcons.forEach((icon) => void unmount(icon));
    routePolyline?.setMap(null);
  });
</script>

<div class="absolute inset-0 overflow-hidden bg-neutral-100">
  <div
    bind:this={mapElement}
    class="absolute inset-0 transition-opacity duration-300"
    class:opacity-0={mapState !== 'ready'}
    style:cursor={interactive ? 'crosshair' : 'default'}
  ></div>

  {#if mapState !== 'ready'}
    <div
      class="absolute inset-0 overflow-hidden bg-neutral-100"
      style="background-image: linear-gradient(var(--neutral-200) 1px, transparent 1px), linear-gradient(90deg, var(--neutral-200) 1px, transparent 1px); background-size: 28px 28px;"
    >
      <div class="font-mono-data absolute left-4 top-4 text-xs tracking-wide text-neutral-400">
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

  {@render children?.()}
</div>
