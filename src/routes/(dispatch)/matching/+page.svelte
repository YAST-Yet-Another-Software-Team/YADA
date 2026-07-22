<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import MapBackdrop from '$lib/components/MapBackdrop.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import StatusPill from '$lib/components/ui/StatusPill.svelte';

  let timer: ReturnType<typeof setTimeout> | undefined;

  onMount(() => {
    timer = setTimeout(() => {
      goto('/tracking');
    }, 2200);
  });

  onDestroy(() => {
    if (timer) clearTimeout(timer);
  });

  function cancel() {
    if (timer) clearTimeout(timer);
    goto('/request');
  }
</script>

<svelte:head>
  <title>Finding a rider | YADA</title>
</svelte:head>

<div class="relative h-full bg-bg">
  <MapBackdrop>
    <div
      class="absolute left-1/2 top-[42%] h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
      style="box-shadow: 0 0 0 8px var(--color-primary-subtle);"
    ></div>
  </MapBackdrop>

  <div
    class="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center gap-4 rounded-t-xl bg-surface px-6 py-8 text-center shadow-lg"
  >
    <StatusPill status="searching" />
    <h1 class="text-xl font-semibold text-ink">Finding a rider near you</h1>
    <p class="text-sm text-ink-secondary">This usually takes under a minute.</p>
    <Button variant="ghost" on:click={cancel}>Cancel request</Button>
  </div>
</div>
