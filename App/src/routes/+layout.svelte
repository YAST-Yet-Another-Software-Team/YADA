<script lang="ts">
  import '$lib/styles/app.css';
  import type { Snippet } from 'svelte';
  import { createSession } from '$auth/session.svelte';
  import type { AuthUser } from '$lib/utils/types';

  let { data, children }: { data: { user: AuthUser | null }; children: Snippet } = $props();

  // Providing the session here — during layout init, before any child component
  // script runs — is what lets pages read it synchronously instead of fetching
  // the session again on mount. Because it lives in context rather than at
  // module scope, each SSR render gets its own, so this runs on the server too.
  // svelte-ignore state_referenced_locally
  const session = createSession(data.user);

  // And keep it in step if a later navigation reruns the layout load.
  $effect(() => {
    session.hydrate(data.user);
  });
</script>

{@render children()}
