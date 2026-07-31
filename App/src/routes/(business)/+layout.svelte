<script lang="ts">
  import type { Snippet } from "svelte";
  import { page } from "$app/state";
  import ProfileMenu from "$lib/components/business/ProfileMenu.svelte";
  import Avatar from "$lib/components/ui/Avatar.svelte";
  import { getSession } from "$lib/auth/session.svelte";
  import { initials } from "$lib/shared/text";

  let { children }: { children: Snippet } = $props();

  const session = getSession();
  const avatarInitials = $derived(initials(session.user?.name, "Y"));

  /**
   * Single source of truth for the business workspace nav. `short` is used in
   * the mobile bar, which scrolls horizontally and can't afford long labels.
   */
  const links = [
    {
      href: "/dashboard",
      label: "Dashboard",
      short: "Home",
      match: ["/dashboard"],
    },
    {
      href: "/request",
      label: "Request",
      short: "Request",
      match: ["/request", "/matching", "/tracking"],
    },
    { href: "/map", label: "Map", short: "Map", match: ["/map"] },
    {
      href: "/history",
      label: "History",
      short: "History",
      match: ["/history"],
    },
  ];

  let profileOpen = $state(false);

  const path = $derived(page.url.pathname);

  /** Prefix match, so a nested route like /tracking/:id still lights its tab. */
  function isActive(match: string[]) {
    return match.some((m) => path === m || path.startsWith(`${m}/`));
  }

  function toggleProfile(e: MouseEvent) {
    e.stopPropagation();
    profileOpen = !profileOpen;
  }
</script>

<div class="min-h-svh bg-bg">
  <!-- Mobile chrome -->
  <header class="border-b border-border bg-surface lg:hidden">
    <div class="flex items-center justify-between gap-3 px-4 pt-3">
      <a
        href="/dashboard"
        class="inline-flex shrink-0 items-center"
        aria-label="YADA home"
      >
        <img src="/logo.svg" alt="" class="h-8 w-auto" />
      </a>
      <div class="relative" data-profile-menu>
        <button
          type="button"
          class="rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-focus"
          aria-label="Open business profile"
          aria-expanded={profileOpen}
          onclick={toggleProfile}
        >
          <Avatar initials={avatarInitials} size={28} />
        </button>
        <ProfileMenu open={profileOpen} onclose={() => (profileOpen = false)} />
      </div>
    </div>
    <nav
      class="flex items-stretch gap-1 overflow-x-auto px-2"
      aria-label="Business"
    >
      {#each links as link}
        {@const active = isActive(link.match)}
        <a
          href={link.href}
          aria-current={active ? "page" : undefined}
          class="relative flex shrink-0 items-center px-3 py-2.5 text-sm transition-colors {active
            ? 'font-bold text-ink'
            : 'font-semibold text-ink-secondary'}"
        >
          {link.short}
          <span
            class="pointer-events-none absolute inset-x-1 bottom-0 h-[3px] rounded-t-sm {active
              ? 'bg-primary'
              : 'bg-transparent'}"
            aria-hidden="true"
          ></span>
        </a>
      {/each}
    </nav>
  </header>

  <!-- Desktop chrome -->
  <header class="sticky top-0 z-20 hidden bg-surface lg:block">
    <div
      class="mx-auto flex h-[58px] max-w-7xl items-stretch justify-between gap-4 border-b border-border px-6"
    >
      <div class="flex items-center">
        <a
          href="/dashboard"
          class="inline-flex shrink-0 items-center"
          aria-label="YADA home"
        >
          <img src="/logo.svg" alt="" class="h-8 w-auto" />
        </a>
      </div>

      <nav class="flex h-full items-stretch gap-1" aria-label="Business">
        {#each links as link}
          {@const active = isActive(link.match)}
          <a
            href={link.href}
            aria-current={active ? "page" : undefined}
            class="relative flex h-full items-center px-3 text-base transition-colors {active
              ? 'font-bold text-ink'
              : 'font-medium text-ink-secondary hover:text-ink'}"
          >
            {link.label}
            <span
              class="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] rounded-t-sm bg-primary transition-opacity duration-200 {active
                ? 'opacity-100'
                : 'opacity-0'}"
              aria-hidden="true"
            ></span>
          </a>
        {/each}
        <span
          class="relative flex h-full cursor-not-allowed items-center px-3 text-base text-ink-disabled"
          title="Coming soon"
        >
          Team
        </span>
      </nav>

      <div class="relative flex items-center gap-3" data-profile-menu>
        <button
          type="button"
          class="rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-focus"
          aria-label="Open business profile"
          aria-expanded={profileOpen}
          onclick={toggleProfile}
        >
          <Avatar initials={avatarInitials} size={34} />
        </button>
        <ProfileMenu open={profileOpen} onclose={() => (profileOpen = false)} />
      </div>
    </div>
  </header>

  <main class="mx-auto w-full max-w-7xl lg:px-6 lg:py-6">
    <div class="min-h-[calc(100svh-3.25rem)] lg:min-h-[calc(100svh-58px-3rem)]">
      {@render children()}
    </div>
  </main>
</div>
