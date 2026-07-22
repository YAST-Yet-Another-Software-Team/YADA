<script lang="ts">
  type Tab = { value: string; label: string };

  export let tabs: Tab[] = [];
  export let active = '';

  function select(value: string) {
    active = value;
  }
</script>

<div class="flex gap-1 rounded-md bg-surface-sunken p-1" role="tablist">
  {#each tabs as tab}
    <button
      type="button"
      role="tab"
      aria-selected={active === tab.value}
      class="flex-1 rounded-sm px-3 py-2 text-sm font-semibold transition {active === tab.value
        ? 'bg-surface text-ink shadow-xs'
        : 'text-ink-secondary hover:text-ink'}"
      on:click={() => select(tab.value)}
    >
      {tab.label}
    </button>
  {/each}
</div>
