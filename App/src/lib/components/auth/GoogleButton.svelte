<script lang="ts">
  import { enhance } from '$app/forms';

  let {
    enabled = false,
    label = 'Continue with Google',
    role = 'business'
  }: {
    enabled?: boolean;
    label?: string;
    /** Carried along so the action can honour it once social sign-up knows roles. */
    role?: string;
  } = $props();

  let submitting = $state(false);

  const track = () => {
    submitting = true;

    return async ({ update }: { update: () => Promise<void> }) => {
      await update();
      submitting = false;
    };
  };
</script>

<form method="POST" action="?/google" use:enhance={track}>
  <input type="hidden" name="role" value={role} />
  <button
    type="submit"
    disabled={!enabled || submitting}
    class="inline-flex w-full items-center justify-center gap-3 rounded-md border border-border bg-surface px-4 py-3 text-base font-semibold text-ink transition-colors hover:bg-neutral-50 focus-visible:outline focus-visible:outline-3 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
  >
    <!-- Google's four-colour mark, inline so it needs no network fetch. -->
    <svg class="h-5 w-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17Z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46Z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7Z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07Z"
      />
    </svg>
    {submitting ? 'Opening Google…' : label}
  </button>
</form>
