<script lang="ts">
  import type { Snippet } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { page } from "$app/state";
  import ProfileMenu from "$lib/components/ProfileMenu.svelte";
  import Avatar from "$lib/components/Avatar.svelte";
  import { getSession } from "$auth/session.svelte";
  import { initials } from "$lib/shared/text";
  import IconMenu from "~icons/mdi/menu";
  import IconChevronLeft from "~icons/mdi/chevron-left";
  import IconDashboard from "~icons/mdi/view-dashboard-outline";
  import IconPlus from "~icons/mdi/plus";
  import IconHistory from "~icons/mdi/history";

  let { children }: { children: Snippet } = $props();

  const session = getSession();
  const avatarInitials = $derived(initials(session.user?.name, "Y"));

  /**
   * Single source of truth for the business workspace nav. `title` is what the
   * mobile bar puts beside the menu button — the phone shows one screen at a
   * time, so the screen says its own name rather than the tab strip implying it.
   */
  const links = [
    {
      href: "/dashboard",
      label: "Dashboard",
      title: "Dashboard",
      icon: IconDashboard,
      match: ["/dashboard"],
    },
    {
      href: "/request",
      label: "Request",
      title: "New request",
      icon: IconPlus,
      match: ["/request", "/tracking"],
    },
    {
      href: "/history",
      label: "History",
      title: "Orders",
      icon: IconHistory,
      match: ["/history"],
    },
  ];

  let profileOpen = $state(false);
  let navOpen = $state(false);

  const path = $derived(page.url.pathname);

  /** Prefix match, so a nested route like /tracking/:id still lights its tab. */
  function isActive(match: string[]) {
    return match.some((m) => path === m || path.startsWith(`${m}/`));
  }

  /**
   * Screens where the page *is* the content, rather than sitting on the
   * workspace canvas: the request and tracking maps want every pixel under the
   * header, so the padded, width-capped, bordered card that suits a dashboard
   * only crops them.
   */
  const fullBleed = $derived(path === "/request" || path === "/tracking");

  /**
   * Tracking is a map the whole way to the edges on a phone: the sheet over it
   * carries the status, and the page draws its own floating back button. A title
   * bar above it would only cost 56px of map to repeat what the sheet says.
   */
  const mobileChromeless = $derived(path === "/tracking");

  /**
   * A phone screen reached *from* somewhere goes back rather than sideways —
   * /request and /profile are steps out of the dashboard, not peers of it, so
   * they get an arrow where the other screens get the menu.
   */
  const mobileBack = $derived(
    path === "/request" || path === "/profile" ? "/dashboard" : null,
  );

  /**
   * Screens outside the tab strip still have to name themselves in the bar —
   * without this the account page would sit under a heading of "YADA".
   */
  const asideTitles: Record<string, string> = { "/profile": "Account" };

  const mobileTitle = $derived(
    asideTitles[path] ?? links.find((link) => isActive(link.match))?.title ?? "YADA",
  );

  function toggleProfile(e: MouseEvent) {
    e.stopPropagation();
    profileOpen = !profileOpen;
  }
</script>

<!-- A flex column, so a full-bleed page can claim the height left by the header
     without anyone having to hardcode what that header measures. -->
<div class="flex min-h-svh flex-col bg-bg">
  <!-- Mobile chrome: one bar — menu (or back), the screen's name, the account.
       Navigation lives in the drawer behind the menu button, which keeps the
       three destinations legible at any label length and leaves the bar itself
       free for the title. -->
  {#if !mobileChromeless}
    <header
      class="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-2 lg:hidden"
    >
      {#if mobileBack}
        <a
          href={mobileBack}
          class="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink transition-colors hover:bg-wash"
          aria-label="Back to dashboard"
        >
          <IconChevronLeft class="h-6 w-6" aria-hidden="true" />
        </a>
      {:else}
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink transition-colors hover:bg-wash"
          aria-label="Open menu"
          aria-expanded={navOpen}
          onclick={() => (navOpen = true)}
        >
          <IconMenu class="h-6 w-6" aria-hidden="true" />
        </button>
      {/if}

      <h1 class="min-w-0 flex-1 truncate text-lg font-semibold text-ink">
        {mobileTitle}
      </h1>

      <div class="relative pr-2" data-profile-menu style:display={page.url.pathname === "/request" || page.url.pathname === "/profile"? 'none' : 'block'}>
        <button
          type="button"
          class="rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-focus"
          aria-label="Open business profile"
          aria-expanded={profileOpen}
          onclick={toggleProfile}
        >
          <Avatar
            initials={avatarInitials}
            src={session.user?.image ?? null}
            alt=""
            size={32}
          />
        </button>
        <ProfileMenu open={profileOpen} onclose={() => (profileOpen = false)} />
      </div>
    </header>
  {/if}

  <!-- Desktop chrome -->
  <header class="sticky top-0 z-20 hidden bg-surface lg:block">
    <div
      class="mx-auto flex h-[58px] items-stretch justify-between gap-4 border-b border-border px-6"
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
      </nav>

      <div class="relative flex items-center gap-3" data-profile-menu>
        <button
          type="button"
          class="rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-focus"
          aria-label="Open business profile"
          aria-expanded={profileOpen}
          onclick={toggleProfile}
          style:display={page.url.pathname === "/profile"? 'none' : 'block'}
        >
          <Avatar
            initials={avatarInitials}
            src={session.user?.image ?? null}
            alt=""
            size={34}
          />
        </button>
        <ProfileMenu open={profileOpen} onclose={() => (profileOpen = false)} />
      </div>
    </div>
  </header>

  {#if fullBleed}
    <main class="flex min-h-0 w-full flex-1 flex-col">
      {@render children()}
    </main>
  {:else}
    <main class="mx-auto flex w-full max-w-7xl flex-1 flex-col lg:px-6 lg:py-6">
      {@render children()}
    </main>
  {/if}
</div>

<!-- The drawer. Phone-only: on desktop the same three destinations are already
     across the top bar, where there is room for them. -->
{#if navOpen}
  <div class="fixed inset-0 z-40 lg:hidden">
    <button
      type="button"
      class="absolute inset-0 cursor-default bg-overlay"
      aria-label="Close menu"
      onclick={() => (navOpen = false)}
      transition:fade={{ duration: 150 }}
    ></button>

    <nav
      class="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col gap-1 border-r border-border bg-surface p-3 shadow-lg"
      aria-label="Business"
      transition:fly={{ x: -288, duration: 200 }}
    >
      <div class="flex items-center px-2 pb-4 pt-2">
        <img src="/logo.svg" alt="YADA" class="h-8 w-auto" />
      </div>

      {#each links as link}
        {@const active = isActive(link.match)}
        {@const Icon = link.icon}
        <a
          href={link.href}
          aria-current={active ? "page" : undefined}
          onclick={() => (navOpen = false)}
          class="flex items-center gap-3 rounded-md px-3 py-3 text-base transition-colors {active
            ? 'bg-primary-subtle font-bold text-primary'
            : 'font-medium text-ink-secondary hover:bg-wash'}"
        >
          <Icon class="h-5 w-5 shrink-0" aria-hidden="true" />
          {link.label}
        </a>
      {/each}
    </nav>
  </div>
{/if}
