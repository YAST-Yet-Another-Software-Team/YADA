<script lang="ts">
  import '$lib/styles/app.css';
  import type { Snippet } from 'svelte';
  import { onNavigate } from '$app/navigation';
  import { prefersReducedMotion } from 'svelte/motion';
  import { createSession } from '$auth/session.svelte';
  import { createMapsConfig } from '$lib/client/maps/maps-config.svelte';
  import { createSoundAlerts } from '$lib/client/sound-alerts.svelte';
  import { unlockAudio } from '$lib/client/sound';
  import type { LayoutServerData } from './$types';

  let { data, children }: { data: LayoutServerData; children: Snippet } = $props();

  // Providing the session here — during layout init, before any child component
  // script runs — is what lets pages read it synchronously instead of fetching
  // the session again on mount. Because it lives in context rather than at
  // module scope, each SSR render gets its own, so this runs on the server too.
  // svelte-ignore state_referenced_locally
  const session = createSession(data.user);
  // svelte-ignore state_referenced_locally
  const maps = createMapsConfig(data.mapStyleUrl, data.routingEnabled);

  // Both workspaces ring — couriers for a new offer, businesses for the points
  // of a delivery — so the preference is provided from the root rather than
  // either group's layout.
  const alerts = createSoundAlerts();

  // And keep both in step if a later navigation reruns the layout load.
  $effect(() => {
    session.hydrate(data.user);
    maps.hydrate(data.mapStyleUrl, data.routingEnabled);
  });

  /**
   * Take the first gesture on the page as permission to make noise.
   *
   * Browsers will not play audio until someone has interacted with the document,
   * and the alerts that matter are the ones nobody asked for — a rider is not
   * clicking anything at the moment a request starts ringing them. So the
   * context is opened on whatever the first tap or keypress happens to be, and
   * the listener removes itself immediately afterwards.
   */
  $effect(() => {
    alerts.hydrate();

    const unlock = () => {
      unlockAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  });

  /**
   * Cross-page transitions, for the two public pages only.
   *
   * The browser does the work here rather than Svelte: `startViewTransition`
   * snapshots the old document, lets SvelteKit swap the page in, then animates
   * between the two snapshots. That is the only mechanism that can animate
   * *across* a navigation — a Svelte transition can't, because the outgoing
   * page's component is gone before the incoming one exists. The pairing is
   * declared in CSS (`::view-transition-*` in app.css), including the brand
   * logo, which is a shared element and so morphs from the landing header into
   * the auth card instead of cross-fading.
   *
   * Deliberately narrow: the signed-in workspace is full of maps and live
   * panels that gain nothing from being photographed mid-navigation. Widening
   * it is a matter of adding paths to this set.
   */
  const ANIMATED_PATHS = new Set(['/', '/auth']);

  onNavigate((navigation) => {
    // Progressive enhancement: unsupported browsers just navigate.
    if (!document.startViewTransition) return;
    if (prefersReducedMotion.current) return;

    const from = navigation.from?.url.pathname;
    const to = navigation.to?.url.pathname;
    if (!from || !to) return;

    // Same path means a query-string change — the auth page's own sign-in ⇄
    // sign-up toggle, which animates itself. A view transition over the top of
    // that would play both at once.
    if (from === to) return;
    if (!ANIMATED_PATHS.has(from) || !ANIMATED_PATHS.has(to)) return;

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>

{@render children()}
