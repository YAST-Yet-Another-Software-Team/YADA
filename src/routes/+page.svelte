<script lang="ts">
  const metrics = [
    { label: 'Request to first offer', value: '< 5s' },
    { label: 'Location freshness', value: '< 3s' },
    { label: 'Trip states', value: '6-stage lifecycle' }
  ];

  const pillars = [
    {
      title: 'Business dispatch',
      description:
        'Request a courier, see ETA before confirmation, and track the trip in one browser-based workspace.'
    },
    {
      title: 'Courier workflow',
      description:
        'Accept offers, navigate to pickup and drop-off, and keep live location updates flowing in near real time.'
    },
    {
      title: 'Operational control',
      description:
        'Keep the trip lifecycle, telemetry, ratings, and support surfaces separated enough to scale cleanly.'
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
  <title>YADA | Motor courier request platform</title>
  <meta
    name="description"
    content="YADA streamlines motor courier requests, courier matching, live tracking, and trip management for Favorie."
  />
</svelte:head>

<main class="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
  <section class="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/85 shadow-glow backdrop-blur">
    <div class="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
      <div class="relative overflow-hidden px-6 py-8 sm:px-10 sm:py-12 lg:px-12 lg:py-16">
        <div class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(255,159,58,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_26%)]"></div>
        <div class="inline-flex items-center gap-2 rounded-full border border-sand-200 bg-sand-50 px-3 py-1 text-sm font-medium text-sand-800">
          <span class="h-2 w-2 rounded-full bg-accent-500"></span>
          Favorie courier operations
        </div>

        <h1 class="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl text-balance">
          Motor courier dispatch built for speed, clarity, and live delivery control.
        </h1>

        <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
          YADA turns phone calls and text threads into a single platform for requesting couriers,
          matching the right rider, tracking progress, and capturing the trip record from first offer
          through completion.
        </p>

        <div class="mt-8 flex flex-wrap gap-3">
          <a
            href="/"
            class="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Open dispatch flow
          </a>
          <a
            href="#structure"
            class="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          >
            View project structure
          </a>
        </div>

        <div class="mt-10 grid gap-4 sm:grid-cols-3">
          {#each metrics as metric}
            <article class="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.06)]">
              <p class="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">{metric.label}</p>
              <p class="mt-3 text-2xl font-semibold text-slate-950">{metric.value}</p>
            </article>
          {/each}
        </div>
      </div>

      <div class="border-t border-slate-200/80 bg-slate-950 px-6 py-8 text-white sm:px-10 sm:py-12 lg:border-l lg:border-t-0 lg:px-12 lg:py-16">
        <p class="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">System frame</p>
        <h2 class="mt-4 text-2xl font-semibold text-white">What the first commit sets up</h2>

        <div class="mt-8 space-y-4">
          {#each pillars as pillar}
            <article class="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h3 class="text-lg font-semibold text-white">{pillar.title}</h3>
              <p class="mt-2 text-sm leading-7 text-slate-300">{pillar.description}</p>
            </article>
          {/each}
        </div>

        <div id="structure" class="mt-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 to-white/3 p-5">
          <p class="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">Lifecycle</p>
          <div class="mt-4 flex flex-wrap gap-2">
            {#each lifecycle as state}
              <span class="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-sm text-slate-200">{state}</span>
            {/each}
          </div>
          <p class="mt-5 text-sm leading-7 text-slate-300">
            The application is organized around a trip state machine, geospatial matching, realtime courier updates,
            and server-side data boundaries for auth, database access, and socket coordination.
          </p>
        </div>
      </div>
    </div>
  </section>
</main>