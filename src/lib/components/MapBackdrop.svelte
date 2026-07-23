<script lang="ts">
  import { onMount } from 'svelte';
  import { loadGoogleMaps } from '$lib/maps/google-maps-loader';

  export let routeLabel = false;

  let mapElement: HTMLDivElement | null = null;
  let mapState: 'fallback' | 'loading' | 'ready' | 'error' = 'fallback';
  const googleMapsApiKey = import.meta.env.PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  onMount(async () => {
    if (!googleMapsApiKey || !mapElement) {
      return;
    }

    mapState = 'loading';

    try {
      const { Map } = await loadGoogleMaps(googleMapsApiKey);

      if (!mapElement) {
        return;
      }

      new Map(mapElement, {
        center: { lat: 5.6037, lng: -0.187 },
        zoom: 13,
        disableDefaultUI: true,
        clickableIcons: false,
        gestureHandling: 'greedy',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      });

      mapState = 'ready';
    } catch (error) {
      console.error('Unable to load Google Maps.', error);
      mapState = 'error';
    }
  });
</script>

<div
  class="absolute inset-0 overflow-hidden bg-neutral-100"
>
  <div
    bind:this={mapElement}
    class="absolute inset-0 transition-opacity duration-300"
    class:opacity-0={mapState !== 'ready'}
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
    </div>
  {/if}
  <slot />
</div>
