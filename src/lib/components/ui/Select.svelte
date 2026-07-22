<script lang="ts">
  type Option = { value: string; label: string };

  export let label = '';
  export let value = '';
  export let options: Option[] = [];
  export let disabled = false;
  export let id = `select-${Math.random().toString(36).slice(2, 9)}`;
</script>

<label class="flex w-full flex-col gap-1.5" for={id}>
  {#if label}
    <span class="text-sm font-semibold text-ink">{label}</span>
  {/if}
  <select
    {id}
    {disabled}
    bind:value
    class="w-full appearance-none rounded-md border border-border bg-surface px-3 py-2.5 text-base text-ink outline-none transition focus:border-[1.5px] focus:border-primary focus:outline focus:outline-[3px] focus:outline-[color:var(--color-focus-ring)]"
  >
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</label>
