<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';

  let {
    label = '',
    value = $bindable(''),
    placeholder = '',
    type = 'text',
    disabled = false,
    id = `input-${Math.random().toString(36).slice(2, 9)}`,
    inputRef = $bindable(null),
    autocomplete = undefined,
    icon,
    ...rest
  }: {
    label?: string;
    value?: string;
    placeholder?: string;
    type?: 'text' | 'tel' | 'email' | 'password';
    disabled?: boolean;
    id?: string;
    inputRef?: HTMLInputElement | null;
    autocomplete?: HTMLInputAttributes['autocomplete'];
    icon?: Snippet;
  } & HTMLInputAttributes = $props();
</script>

<label class="flex w-full flex-col gap-1.5" for={id}>
  {#if label}
    <span class="text-sm font-semibold text-ink">{label}</span>
  {/if}
  <div
    class="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2.5 transition focus-within:border-md focus-within:border-primary focus-within:outline focus-within:outline-3 focus-within:outline-focus"
  >
    {#if icon}
      <span class="shrink-0 text-ink-tertiary">{@render icon()}</span>
    {/if}
    <input
      {id}
      {type}
      {placeholder}
      {disabled}
      {autocomplete}
      bind:this={inputRef}
      bind:value
      {...rest}
      class="w-full border-0 bg-transparent text-base text-ink outline-none placeholder:text-ink-disabled"
    />
  </div>
</label>
