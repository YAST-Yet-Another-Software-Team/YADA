<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { loadGoogleMaps } from '$lib/maps/google-maps-loader';

  export let routeLabel = false;
  export let interactive = false;
  export let markers: Array<{
    id: string;
    lat: number;
    lng: number;
    label?: string;
    accent?: boolean;
  }> = [];

  let mapElement: HTMLDivElement | null = null;
  let mapState: 'fallback' | 'loading' | 'ready' | 'error' = 'fallback';
  let map: google.maps.Map | null = null;
  let clickListener: google.maps.MapsEventListener | null = null;
  let googleMaps: typeof google.maps | null = null;
  let renderedMarkers: google.maps.Marker[] = [];
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
  const fallbackCenter = { lat: 5.6037, lng: -0.187 };
  const dispatch = createEventDispatcher<{
    pick: { lat: number; lng: number };
  }>();

  function getUserLocation(): Promise<{ lat: number; lng: number } | null> {
    if (!navigator.geolocation) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 6000,
          maximumAge: 60_000
        }
      );
    });
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
        center: fallbackCenter,
        zoom: 13,
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

      void getUserLocation().then((location) => {
        if (!location) {
          return;
        }

        map?.panTo(location);
        map?.setZoom(15);
      });

      mapState = 'ready';
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
      const accentColor = marker.accent ? '#ef4444' : '#f59e0b';
      return new currentGoogleMaps.Marker({
        map,
        position: { lat: marker.lat, lng: marker.lng },
        title: marker.label,
        icon: {
          path: currentGoogleMaps.SymbolPath.CIRCLE,
          fillColor: accentColor,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 10
        }
      });
    });
  }

  export let center: { lat: number; lng: number } | null = null;

  $: if (mapState === 'ready' && map && center) {
    map.panTo(center);
  }

  $: if (mapState === 'ready') {
    syncMarkers();
  }

  onDestroy(() => {
    clickListener?.remove();
    renderedMarkers.forEach((marker) => marker.setMap(null));
  });
</script>

<div
  class="absolute inset-0 overflow-hidden bg-neutral-100"
>
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
      <div
        class="font-mono-data absolute left-4 top-4 text-xs tracking-wide text-neutral-400"
      >
        {#if mapState === 'loading'}
          LOADING GOOGLE MAPS…
        {:else if mapState === 'error'}
          GOOGLE MAPS FAILED — FALLING BACK TO MOCK MAP
        {:else}
          MAP PLACEHOLDER — production wires a real map provider here
        {/if}
      </div>
      {#if routeLabel}
        <div
          class="absolute left-[12%] right-[12%] top-[38%] border-t-[3px] border-dashed border-secondary"
        ></div>
      {/if}
      {#if interactive}
        <div class="absolute bottom-4 left-4 rounded-md bg-surface/95 px-3 py-2 text-xs font-semibold text-ink shadow-sm">
          Click on the map to choose a location
        </div>
      {/if}
    </div>
  {/if}
  <slot />
</div>
