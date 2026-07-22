<script lang="ts">
  import { page } from '$app/stores';

  const steps = [
    { href: '/auth', label: 'Auth' },
    { href: '/request', label: 'Request' },
    { href: '/matching', label: 'Match' },
    { href: '/tracking', label: 'Track' },
    { href: '/history', label: 'History' }
  ];
</script>

<div class="min-h-screen bg-neutral-200 px-4 py-6 sm:py-10">
  <div class="mx-auto mb-4 flex max-w-[390px] flex-wrap gap-2">
    {#each steps as step}
      <a
        href={step.href}
        class="rounded-md px-2.5 py-1 text-xs font-semibold transition {$page.url.pathname ===
        step.href
          ? 'bg-primary text-primary-on'
          : 'bg-surface text-ink-secondary hover:text-ink'}"
      >
        {step.label}
      </a>
    {/each}
  </div>

  <div
    class="relative mx-auto h-[min(812px,calc(100svh-5.5rem))] w-full max-w-[390px] overflow-hidden rounded-xl border border-border bg-bg shadow-lg"
  >
    <slot />
  </div>
</div>
