<script lang="ts">
  import { goto } from '$app/navigation';
  import MapBackdrop from '$lib/components/MapBackdrop.svelte';
  import Avatar from '$lib/components/ui/Avatar.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import IconButton from '$lib/components/ui/IconButton.svelte';
  import StatusPill from '$lib/components/ui/StatusPill.svelte';

  function markDelivered() {
    goto('/history');
  }

  function cancel() {
    goto('/request');
  }

  function goBack() {
    goto('/request');
  }
</script>

<svelte:head>
  <title>Tracking | YADA</title>
</svelte:head>

<div class="relative h-full bg-bg">
  <MapBackdrop routeLabel>
    <div
      class="absolute left-[12%] top-[38%] h-3.5 w-3.5 rounded-full border-[3px] border-surface bg-primary"
    ></div>
    <div
      class="absolute right-[12%] top-[38%] h-3.5 w-3.5 rounded-full border-[3px] border-surface bg-secondary"
    ></div>
  </MapBackdrop>

  <div class="absolute left-4 top-4 z-10">
    <IconButton ariaLabel="Back" on:click={goBack}>
      <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2"
        ><path d="m15 18-6-6 6-6" /></svg
      >
    </IconButton>
  </div>

  <div
    class="absolute bottom-0 left-0 right-0 z-10 flex flex-col gap-4 rounded-t-xl bg-surface p-6 shadow-lg"
  >
    <StatusPill status="en_route" />

    <div class="flex items-center gap-3">
      <Avatar initials="KA" status="online" size={48} />
      <div class="flex-1">
        <p class="text-sm font-semibold text-ink">Kwame Asante</p>
        <p class="text-sm text-ink-secondary">Bike · Yamaha</p>
      </div>
      <p class="font-mono-data text-[22px] font-semibold leading-none text-primary">4 min</p>
    </div>

    <div class="flex items-center gap-3">
      <IconButton ariaLabel="Call courier" variant="outline">
        <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2"
          ><path
            d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z"
          /></svg
        >
      </IconButton>
      <IconButton ariaLabel="Message courier" variant="outline">
        <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2"
          ><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg
        >
      </IconButton>
      <Button variant="ghost" size="sm" on:click={cancel}>Cancel</Button>
      <div class="flex-1"></div>
      <Button variant="primary" size="sm" on:click={markDelivered}>Mark delivered</Button>
    </div>
  </div>
</div>
