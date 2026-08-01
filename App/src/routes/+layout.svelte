<script lang="ts">
  import '$lib/styles/app.css';
  import type { Snippet } from 'svelte';
  import { createSession } from '$auth/session.svelte';
  import { createMapsConfig } from '$lib/client/maps/maps-config.svelte';
  import type { LayoutServerData } from './$types';

  let { data, children }: { data: LayoutServerData; children: Snippet } = $props();

  // Providing the session here — during layout init, before any child component
  // script runs — is what lets pages read it synchronously instead of fetching
  // the session again on mount. Because it lives in context rather than at
  // module scope, each SSR render gets its own, so this runs on the server too.
  // svelte-ignore state_referenced_locally
  const session = createSession(data.user);
  // svelte-ignore state_referenced_locally
  const maps = createMapsConfig(data.googleMapsApiKey, data.googleMapsMapId);

  // And keep both in step if a later navigation reruns the layout load.
  $effect(() => {
    session.hydrate(data.user);
    maps.hydrate(data.googleMapsApiKey, data.googleMapsMapId);
  });
</script>

{@render children()}
