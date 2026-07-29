<script lang="ts">
  type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  type Size = 'sm' | 'md' | 'lg';

  export let variant: Variant = 'primary';
  export let size: Size = 'md';
  export let disabled = false;
  export let fullWidth = false;
  export let type: 'button' | 'submit' | 'reset' = 'button';

  const sizeClass: Record<Size, string> = {
    sm: 'px-3.5 py-2 text-sm',
    md: 'px-[18px] py-[11px] text-base',
    lg: 'px-6 py-3.5 text-lg'
  };

  const variantClass: Record<Variant, string> = {
    primary:
      'bg-primary text-primary-on hover:bg-primary-hover active:bg-primary-active border-transparent',
    secondary:
      'bg-secondary text-secondary-on hover:bg-secondary-hover active:bg-secondary-active border-transparent',
    outline:
      'bg-transparent text-primary border-[1.5px] border-primary hover:bg-primary-subtle active:bg-primary-subtle',
    ghost: 'bg-transparent text-ink border-transparent hover:bg-neutral-100 active:bg-neutral-200',
    danger: 'bg-danger text-primary-on hover:bg-primary-700 active:bg-primary-800 border-transparent'
  };
</script>

<button
  {type}
  {disabled}
  class="inline-flex items-center justify-center gap-2 rounded-md font-semibold transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 {sizeClass[
    size
  ]} {variantClass[variant]} {fullWidth ? 'w-full' : ''}"
  on:click
>
  <slot />
</button>
