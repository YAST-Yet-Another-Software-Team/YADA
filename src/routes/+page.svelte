<script lang="ts">
  const pillars = [
    {
      title: 'Request a courier',
      description: 'Set pickup and drop-off, see ETA, and send the request from one screen.'
    },
    {
      title: 'Match a rider',
      description: 'Nearby available couriers get the offer. You see who accepted and when they arrive.'
    },
    {
      title: 'Track the trip',
      description: 'Follow live status from accepted through delivered — no phone chain required.'
    }
  ];

  const lifecycle = [
    'requested',
    'accepted',
    'courier arriving',
    'arrived',
    'in progress',
    'completed / cancelled'
  ];
</script>

<svelte:head>
  <title>YADA | Motor courier dispatch</title>
  <meta
    name="description"
    content="YADA helps Favorie request, match, and track motor couriers — locate and track only, no payments."
  />
</svelte:head>

<main class="min-h-screen bg-bg">
  <section class="mx-auto flex min-h-[100svh] max-w-3xl flex-col justify-center px-6 py-16 sm:px-8">
    <p
      class="font-display text-[clamp(2.75rem,8vw,4.5rem)] font-extrabold leading-none tracking-tight text-primary"
    >
      YADA
    </p>

    <h1 class="mt-4 max-w-xl text-balance text-2xl font-semibold leading-snug text-ink sm:text-3xl">
      Find a rider to deliver your order.
    </h1>

    <p class="mt-4 max-w-lg text-lg leading-normal text-ink-secondary">
      Motor courier dispatch for Favorie — request, match, and track riders. No payment info needed.
    </p>

    <div class="mt-8 flex flex-wrap gap-3">
      <a
        href="/auth"
        class="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-on transition duration-200 hover:bg-primary-hover active:scale-[0.98] active:bg-primary-active"
      >
        Open business dispatch
      </a>
      <a
        href="#how-it-works"
        class="inline-flex items-center justify-center rounded-md border border-border bg-surface px-5 py-3 text-sm font-semibold text-ink transition duration-200 hover:border-border-strong hover:bg-primary-subtle"
      >
        See how it works
      </a>
    </div>
  </section>

  <section id="how-it-works" class="border-t border-border bg-surface">
    <div class="mx-auto max-w-3xl px-6 py-16 sm:px-8">
      <p class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-tertiary">How it works</p>
      <h2 class="mt-2 text-2xl font-semibold text-ink">Three steps, one dispatch flow</h2>

      <ol class="mt-10 space-y-8">
        {#each pillars as pillar, i}
          <li class="flex gap-4">
            <span
              class="font-mono-data flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-sm font-semibold text-primary"
            >
              {i + 1}
            </span>
            <div>
              <h3 class="text-lg font-semibold text-ink">{pillar.title}</h3>
              <p class="mt-1 text-base leading-normal text-ink-secondary">{pillar.description}</p>
            </div>
          </li>
        {/each}
      </ol>
    </div>
  </section>

  <section id="lifecycle" class="border-t border-border bg-bg">
    <div class="mx-auto max-w-3xl px-6 py-16 sm:px-8">
      <p class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-tertiary">Lifecycle</p>
      <h2 class="mt-2 text-2xl font-semibold text-ink">Trip state machine</h2>
      <p class="mt-3 max-w-xl text-base leading-normal text-ink-secondary">
        Every delivery moves through a fixed set of states so business and courier stay aligned.
      </p>

      <div class="mt-8 flex flex-wrap gap-2">
        {#each lifecycle as state}
          <span
            class="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-ink-secondary"
          >
            {state}
          </span>
        {/each}
      </div>
    </div>
  </section>
</main>
