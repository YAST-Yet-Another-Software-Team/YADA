<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  let {
    ariaLabel = 'Button',
    variant = 'default',
    children,
    ...rest
  }: {
    ariaLabel?: string;
    variant?: 'default' | 'outline';
    children?: Snippet;
  } & HTMLButtonAttributes = $props();

  const variantClass = $derived(
    variant === 'outline'
      ? 'border-md border-border bg-surface hover:bg-neutral-100'
      : 'border border-transparent bg-surface shadow-xs hover:bg-neutral-100'
  );
</script>

<button
  type="button"
  aria-label={ariaLabel}
  class="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink transition duration-200 active:scale-[0.98] {variantClass}"
  {...rest}
>
  {@render children?.()}
</button>
