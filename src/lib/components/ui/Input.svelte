<script lang="ts">
  export let label = '';
  export let value = '';
  export let placeholder = '';
  export let type: 'text' | 'tel' | 'email' | 'password' = 'text';
  export let disabled = false;
  export let id = `input-${Math.random().toString(36).slice(2, 9)}`;
</script>

<label class="flex w-full flex-col gap-1.5" for={id}>
  {#if label}
    <span class="text-sm font-semibold text-ink">{label}</span>
  {/if}
  <div
    class="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2.5 transition focus-within:border-[1.5px] focus-within:border-primary focus-within:outline focus-within:outline-[3px] focus-within:outline-[color:var(--color-focus-ring)]"
  >
    {#if $$slots.icon}
      <span class="shrink-0 text-ink-tertiary"><slot name="icon" /></span>
    {/if}
    <input
      {id}
      {type}
      {placeholder}
      {disabled}
      bind:value
      class="w-full border-0 bg-transparent text-base text-ink outline-none placeholder:text-ink-disabled"
    />
  </div>
</label>
