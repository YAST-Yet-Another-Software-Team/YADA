<script lang="ts">
  import { enhance } from '$app/forms';
  import { getSession } from '$auth/session.svelte';
  import IconClose from '~icons/mdi/close';

  const session = getSession();

  /**
   * Only ever shown to an email sign-up that hasn't confirmed yet. Google
   * accounts arrive verified by the provider, so this never renders for them.
   */
  const show = $derived(Boolean(session.user) && session.user?.emailVerified === false);

  const message = $derived(
    session.user?.role === 'courier'
      ? 'Confirm your email to go online.'
      : 'Confirm your email to send deliveries.'
  );

  /**
   * Dismissal lasts the tab, not the account.
   *
   * `sessionStorage` rather than `localStorage` on purpose: the banner is a
   * reminder about an unfinished setup step, and one that could be silenced
   * forever with a single tap would be. Closing it buys quiet until the next
   * visit, which is enough to read a screen it happens to be covering.
   */
  const STORAGE_KEY = 'yada.verifyBannerDismissed';

  let dismissed = $state(true);
  let sent = $state(false);

  // Starts hidden and is revealed after mount: the server cannot read
  // sessionStorage, so rendering it during SSR would flash a banner the client
  // then removes.
  $effect(() => {
    try {
      dismissed = sessionStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      // Storage disabled or unavailable — show it.
      dismissed = false;
    }
  });

  function dismiss() {
    dismissed = true;

    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Absent, disabled, or over quota. It stays hidden for this render.
    }
  }
</script>

{#if show && !dismissed}
  <div
    class="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-warning-subtle px-4 py-2 text-sm text-warning"
    role="status"
  >
    <p class="min-w-0 flex-1 font-medium">
      {sent ? 'Sent — check your inbox for the link.' : message}
    </p>

    {#if !sent}
      <!-- Posts to the /verify-email action rather than a local one, so the
           banner can hang off any layout without every route owning a copy of
           it. Without JavaScript this navigates there, which is a page that
           explains the same thing at greater length. -->
      <form
        method="POST"
        action="/verify-email?/resend"
        use:enhance={() => {
          // Deliberately not calling `update()`: the answer is always the same
          // neutral "sent", and re-running this page's load to hear it would
          // only disturb whatever the reader is in the middle of.
          return async () => {
            sent = true;
          };
        }}
      >
        <button
          type="submit"
          class="font-semibold underline underline-offset-2 hover:no-underline"
        >
          Resend
        </button>
      </form>
    {/if}

    <button
      type="button"
      class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm transition-colors hover:bg-warning/10"
      aria-label="Dismiss"
      onclick={dismiss}
    >
      <IconClose class="h-4 w-4" aria-hidden="true" />
    </button>
  </div>
{/if}
