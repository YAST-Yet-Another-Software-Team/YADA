<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from '$lib/components/ui/Button.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import StatusPill from '$lib/components/ui/StatusPill.svelte';
  import Tabs from '$lib/components/ui/Tabs.svelte';

  type OrderStatus = 'delivered' | 'cancelled';

  const orderHistory: Array<{ id: string; to: string; when: string; status: OrderStatus }> = [
    { id: 'YD-4521', to: '88 Elm St', when: 'Today · 2:41 PM', status: 'delivered' },
    { id: 'YD-4498', to: '12 River Rd', when: 'Today · 1:05 PM', status: 'delivered' },
    { id: 'YD-4477', to: '300 Oak Ave', when: 'Yesterday · 6:22 PM', status: 'cancelled' },
    { id: 'YD-4460', to: '9 Pine Ct', when: 'Yesterday · 12:10 PM', status: 'delivered' }
  ];

  let tab = 'history';

  $: visibleOrders =
    tab === 'active' ? [] : orderHistory;

  function requestNew() {
    goto('/request');
  }
</script>

<svelte:head>
  <title>Orders | YADA</title>
</svelte:head>

<div class="flex h-full flex-col gap-4 overflow-hidden bg-bg p-6">
  <h1 class="text-2xl font-semibold text-ink">Orders</h1>

  <Tabs
    tabs={[
      { value: 'active', label: 'Active' },
      { value: 'history', label: 'History' }
    ]}
    bind:active={tab}
  />

  <div class="flex flex-1 flex-col gap-3 overflow-y-auto">
    {#if visibleOrders.length === 0}
      <p class="py-8 text-center text-sm text-ink-secondary">No active orders right now.</p>
    {:else}
      {#each visibleOrders as order (order.id)}
        <Card>
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="font-mono-data text-sm text-ink-tertiary">#{order.id}</p>
              <p class="text-sm font-semibold text-ink">{order.to}</p>
              <p class="text-sm text-ink-secondary">{order.when}</p>
            </div>
            <StatusPill status={order.status} />
          </div>
        </Card>
      {/each}
    {/if}
  </div>

  <Button variant="primary" size="lg" fullWidth on:click={requestNew}>Request a courier</Button>
</div>
