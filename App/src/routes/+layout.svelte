<script lang="ts">
  import '$lib/styles/app.css';
  import type { Snippet } from 'svelte';
  import { browser } from '$app/environment';
  import { auth, type AuthUser } from '$lib/stores/auth';

  let { data, children }: { data: { user: AuthUser | null }; children: Snippet } = $props();

  // Hydrating here — during layout init, before any child component script runs —
  // is what lets pages read $auth.user immediately instead of fetching the session
  // again on mount. Browser-only: the store is module-scoped, so writing to it
  // during SSR would share one request's user with every other in-flight render.
  // svelte-ignore state_referenced_locally
  if (browser) auth.hydrate(data.user);

  // And keep it in step if a later navigation reruns the layout load.
  $effect(() => {
    auth.hydrate(data.user);
  });
</script>

{@render children()}
