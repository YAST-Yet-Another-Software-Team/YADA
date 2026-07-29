<script lang="ts">
  export let ariaLabel = 'Button';
  export let variant: 'default' | 'outline' = 'default';

  const variantClass =
    variant === 'outline'
      ? 'border-[1.5px] border-border bg-surface hover:bg-neutral-100'
      : 'border border-transparent bg-surface shadow-xs hover:bg-neutral-100';
</script>

<button
  type="button"
  aria-label={ariaLabel}
  class="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink transition duration-200 active:scale-[0.98] {variantClass}"
  on:click
>
  <slot />
</button>
