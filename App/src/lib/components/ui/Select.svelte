<script lang="ts">
  type Option = { value: string; label: string };

  let {
    label = '',
    value = $bindable(''),
    options = [],
    id = `select-${Math.random().toString(36).slice(2, 9)}`
  }: {
    label?: string;
    value?: string;
    options?: Option[];
    id?: string;
  } = $props();
</script>

<label class="flex w-full flex-col gap-1.5" for={id}>
  {#if label}
    <span class="text-sm font-semibold text-ink">{label}</span>
  {/if}
  <select
    {id}
    bind:value
    class="w-full appearance-none rounded-md border border-border bg-surface px-3 py-2.5 text-base text-ink outline-none transition focus:border-md focus:border-primary focus:outline focus:outline-3 focus:outline-focus"
  >
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</label>
