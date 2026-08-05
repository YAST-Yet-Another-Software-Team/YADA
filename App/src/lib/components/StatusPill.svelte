<script lang="ts">
  import type { Component } from 'svelte';

  import IconSearch from '~icons/mdi/magnify';
  import IconUser from '~icons/mdi/account-outline';
  import IconNav from '~icons/mdi/navigation-variant-outline';
  import IconPin from '~icons/mdi/map-marker-outline';
  import IconCheck from '~icons/mdi/check-circle-outline';
  import IconCancelled from '~icons/mdi/close-circle-outline';

  type Status = 'searching' | 'assigned' | 'en_route' | 'arrived' | 'delivered' | 'cancelled';

  // The icon is the component itself rather than a name to switch on: a string
  // would need a lookup in the markup that can silently fall through to the
  // wrong glyph when a status is added and the branch is forgotten.
  const statusMap: Record<
    Status,
    { label: string; className: string; pulse: boolean; icon: Component }
  > = {
    searching: {
      label: 'Finding rider',
      className: 'bg-surface-sunken text-ink-secondary',
      pulse: true,
      icon: IconSearch
    },
    assigned: {
      label: 'Rider assigned',
      className: 'bg-info-subtle text-info',
      pulse: false,
      icon: IconUser
    },
    en_route: {
      label: 'En route',
      className: 'bg-secondary-subtle text-secondary-700',
      pulse: false,
      icon: IconNav
    },
    arrived: {
      label: 'Arrived',
      className: 'bg-warning-subtle text-warning',
      pulse: false,
      icon: IconPin
    },
    delivered: {
      label: 'Delivered',
      className: 'bg-success-subtle text-success',
      pulse: false,
      icon: IconCheck
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-danger-subtle text-danger',
      pulse: false,
      icon: IconCancelled
    }
  };

  let { status = 'searching' }: { status?: Status } = $props();

  const s = $derived(statusMap[status] ?? statusMap.searching);
  const Icon = $derived(s.icon);
</script>

<span
  class="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold {s.className}"
>
  <span class="inline-flex h-3.5 w-3.5 items-center justify-center {s.pulse ? 'animate-yada-pulse' : ''}">
    <Icon class="h-3.5 w-3.5" aria-hidden="true" />
  </span>
  {s.label}
</span>
