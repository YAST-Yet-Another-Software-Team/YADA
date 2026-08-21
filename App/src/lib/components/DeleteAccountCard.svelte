<script lang="ts">
  import Alert from './Alert.svelte';
  import Button from './Button.svelte';
  import Input from './Input.svelte';
  import IconWarning from '~icons/mdi/alert-outline';

  /**
   * Closing your own account, from a settings screen.
   *
   * Shared by both workspaces because closing an account is not a workspace
   * action — the courier reaches it from Settings, the business from Profile,
   * and both hit the same `DELETE /api/account`, which takes no id and so can
   * only ever reach the caller's own row.
   *
   * Two steps rather than a confirm dialog. A dialog is dismissed by reflex; a
   * field you have to type your own address into is not, and it is the mistake
   * actually worth catching — the wrong session left open on a shared phone.
   */
  let { email }: { email: string | null } = $props();

  /** Matches the server's fallback for a row with no address on file. */
  const CONFIRM_FALLBACK = 'DELETE';

  const expected = $derived(email ?? CONFIRM_FALLBACK);

  let open = $state(false);
  let confirm = $state('');
  let pending = $state(false);
  let error = $state('');

  const matches = $derived(confirm.trim().toLowerCase() === expected.toLowerCase());

  function reset() {
    open = false;
    confirm = '';
    error = '';
  }

  async function submit() {
    if (!matches || pending) return;

    pending = true;
    error = '';

    try {
      const response = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirm: confirm.trim() })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        error = payload?.message ?? 'We could not close your account. Try again.';
        return;
      }

      // A full navigation rather than `goto`: the session store, the courier's
      // online flag and every cached load live in this document, and the point
      // is to leave none of them behind.
      window.location.assign('/auth');
    } catch {
      error = 'We lost contact with the server. Check your connection.';
    } finally {
      pending = false;
    }
  }
</script>

<section class="rounded-lg border border-danger/30 bg-surface p-4 shadow-sm">
  <div class="flex items-start gap-3">
    <span class="mt-0.5 shrink-0 text-danger" aria-hidden="true">
      <IconWarning class="h-5 w-5" />
    </span>
    <div class="min-w-0 flex-1">
      <h2 class="text-base font-semibold text-ink">Delete account</h2>
      <p class="mt-1 text-sm text-ink-secondary">
        Closes your account and signs you out everywhere.
      </p>
      <p class="mt-2 text-xs text-ink-tertiary">
        Past deliveries stay on record so the other side of each one keeps their history and
        their ratings.
      </p>

      {#if !open}
        <button
          type="button"
          class="mt-3 rounded-md border-md border-danger px-3.5 py-2 text-sm font-semibold text-danger transition duration-200 hover:bg-danger-subtle active:scale-[0.98]"
          onclick={() => (open = true)}
        >
          Delete account
        </button>
      {:else}
        <div class="mt-4 border-t border-border pt-4">
          <p class="text-sm font-medium text-ink">
            {#if email}
              Type <span class="font-semibold">{email}</span> to confirm.
            {:else}
              Type <span class="font-semibold">{CONFIRM_FALLBACK}</span> to confirm.
            {/if}
          </p>

          <div class="mt-2">
            <Input
              bind:value={confirm}
              type={email ? 'email' : 'text'}
              placeholder={expected}
              autocomplete="off"
              autocapitalize="none"
              spellcheck={false}
              disabled={pending}
              aria-label="Confirm account deletion"
            />
          </div>

          {#if error}
            <div class="mt-3">
              <Alert variant="danger">{error}</Alert>
            </div>
          {/if}

          <div class="mt-4 flex gap-2">
            <button
              type="button"
              class="flex-1 rounded-md bg-danger px-[18px] py-[11px] text-base font-semibold text-white transition duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!matches || pending}
              onclick={submit}
            >
              {pending ? 'Closing…' : 'Delete my account'}
            </button>
            <Button variant="neutral" disabled={pending} onclick={reset}>Cancel</Button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</section>
