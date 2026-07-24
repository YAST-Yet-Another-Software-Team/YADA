<script context="module" lang="ts">
  export type MapMarkerRole = 'pickup' | 'dropoff' | 'rider' | 'business' | 'search';

  export type MapMarker = {
    id: string;
    lat: number;
    lng: number;
    label?: string;
    role?: MapMarkerRole;
    accent?: boolean;
    stale?: boolean;
  };
</script>

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { loadGoogleMaps } from '$lib/maps/google-maps-loader';
  import {
    KUMASI_CENTER,
    KUMASI_DEFAULT_ZOOM,
    getZonePolygonPath,
    type LatLng
  } from '$lib/geo/service-area';

  export let routeLabel = false;
  export let interactive = false;
  export let showZone = false;
  export let locationUnavailable = false;
  export let followId: string | null = null;
  export let markers: MapMarker[] = [];
  export let polylinePath: LatLng[] = [];
  export let center: LatLng | null = null;
  export let zoom: number | null = null;

  let mapElement: HTMLDivElement | null = null;
  let mapState: 'fallback' | 'loading' | 'ready' | 'error' = 'fallback';
  let map: google.maps.Map | null = null;
  let clickListener: google.maps.MapsEventListener | null = null;
  let googleMaps: typeof google.maps | null = null;
  let renderedMarkers: google.maps.Marker[] = [];
  let routePolyline: google.maps.Polyline | null = null;
  let zonePolygon: google.maps.Polygon | null = null;
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
  const dispatch = createEventDispatcher<{
    pick: { lat: number; lng: number };
    ready: { map: google.maps.Map };
  }>();

  const ROLE_COLORS: Record<MapMarkerRole, string> = {
    pickup: '#f59e0b',
    dropoff: '#ef4444',
    rider: '#0ea5e9',
    business: '#16a34a',
    search: '#a855f7'
  };

  export function getMap(): google.maps.Map | null {
    return map;
  }

  export function setPolyline(path: LatLng[]) {
    polylinePath = path;
    syncPolyline();
  }

  function markerColor(marker: MapMarker) {
    if (marker.role) return ROLE_COLORS[marker.role];
    return marker.accent ? '#ef4444' : '#f59e0b';
  }

  onMount(async () => {
    if (!googleMapsApiKey || !mapElement) {
      return;
    }

    mapState = 'loading';

    try {
      const mapsLibrary = await loadGoogleMaps(googleMapsApiKey);

      if (!mapElement) {
        return;
      }

      googleMaps = window.google.maps;

      map = new mapsLibrary.Map(mapElement, {
        center: center ?? KUMASI_CENTER,
        zoom: zoom ?? KUMASI_DEFAULT_ZOOM,
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

          dispatch('pick', {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          });
        });
      }

      if (showZone) {
        zonePolygon = new googleMaps.Polygon({
          map,
          paths: getZonePolygonPath(),
          strokeColor: '#16a34a',
          strokeOpacity: 0.7,
          strokeWeight: 2,
          fillColor: '#16a34a',
          fillOpacity: 0.08,
          clickable: false
        });
      }

      mapState = 'ready';
      syncMarkers();
      syncPolyline();
      dispatch('ready', { map });
    } catch (error) {
      console.error('Unable to load Google Maps.', error);
      mapState = 'error';
    }
  });

  function syncMarkers() {
    renderedMarkers.forEach((marker) => marker.setMap(null));
    renderedMarkers = [];

    const currentGoogleMaps = googleMaps;

    if (!map || !currentGoogleMaps) {
      return;
    }

    renderedMarkers = markers.map((marker) => {
      const color = markerColor(marker);
      return new currentGoogleMaps.Marker({
        map,
        position: { lat: marker.lat, lng: marker.lng },
        title: marker.label,
        opacity: marker.stale ? 0.45 : 1,
        icon: {
          path: currentGoogleMaps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: marker.stale ? 0.5 : 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: marker.role === 'rider' ? 12 : 10
        }
      });
    });

    if (followId) {
      const target = markers.find((m) => m.id === followId);
      if (target) {
        map.panTo({ lat: target.lat, lng: target.lng });
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
      strokeColor: '#ef4444',
      strokeOpacity: 0.9,
      strokeWeight: 4
    });
  }

  $: if (mapState === 'ready' && map && center) {
    map.panTo(center);
  }

  $: if (mapState === 'ready' && map && zoom != null) {
    map.setZoom(zoom);
  }

  $: if (mapState === 'ready') {
    markers;
    syncMarkers();
  }

  $: if (mapState === 'ready') {
    polylinePath;
    syncPolyline();
  }

  onDestroy(() => {
    clickListener?.remove();
    renderedMarkers.forEach((marker) => marker.setMap(null));
    routePolyline?.setMap(null);
    zonePolygon?.setMap(null);
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
        {#if mapState === 'loading'}
          LOADING KUMASI MAP…
        {:else if mapState === 'error'}
          GOOGLE MAPS FAILED — FALLING BACK TO MOCK MAP
        {:else}
          MAP PLACEHOLDER — set VITE_GOOGLE_MAPS_API_KEY
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

  <slot />
</div>
