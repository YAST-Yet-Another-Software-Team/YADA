<script lang="ts">
  type Status = 'searching' | 'assigned' | 'en_route' | 'arrived' | 'delivered' | 'cancelled';

  export let status: Status = 'searching';

  const statusMap: Record<
    Status,
    { label: string; className: string; pulse: boolean; icon: string }
  > = {
    searching: {
      label: 'Finding rider',
      className: 'bg-neutral-100 text-neutral-700',
      pulse: true,
      icon: 'search'
    },
    assigned: {
      label: 'Rider assigned',
      className: 'bg-info-subtle text-info',
      pulse: false,
      icon: 'user'
    },
    en_route: {
      label: 'En route',
      className: 'bg-secondary-subtle text-secondary-700',
      pulse: false,
      icon: 'nav'
    },
    arrived: {
      label: 'Arrived',
      className: 'bg-warning-subtle text-warning',
      pulse: false,
      icon: 'pin'
    },
    delivered: {
      label: 'Delivered',
      className: 'bg-success-subtle text-success',
      pulse: false,
      icon: 'check'
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-danger-subtle text-danger',
      pulse: false,
      icon: 'x'
    }
  };

  $: s = statusMap[status] ?? statusMap.searching;
</script>

<span
  class="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold {s.className}"
>
  <span class="inline-flex h-3.5 w-3.5 items-center justify-center {s.pulse ? 'animate-yada-pulse' : ''}">
    {#if s.icon === 'search'}
      <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"
        ><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg
      >
    {:else if s.icon === 'user'}
      <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"
        ><path d="M19 21a7 7 0 0 0-14 0" /><circle cx="12" cy="8" r="4" /></svg
      >
    {:else if s.icon === 'nav'}
      <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"
        ><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg
      >
    {:else if s.icon === 'pin'}
      <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"
        ><path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" /><circle cx="12" cy="10" r="2.5" /></svg
      >
    {:else if s.icon === 'check'}
      <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"
        ><path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" /><path d="m9 11 3 3L22 4" /></svg
      >
    {:else}
      <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2"
        ><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
      >
    {/if}
  </span>
  {s.label}
</span>
