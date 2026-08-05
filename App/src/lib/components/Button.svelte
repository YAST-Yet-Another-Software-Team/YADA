<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  /**
   * A single emphasis ladder, loudest first:
   *
   *   primary / secondary   filled brand — the one thing to do on the screen
   *   outline               red border, no fill — anything that isn't that,
   *                         but still needs to look like a button: alternate
   *                         routes, and destructive actions alike
   *   neutral               bare ink — back, view, sign out, decline; anything
   *                         that shouldn't compete with the action beside it
   *
   * Tone is not encoded here. In a red-primary brand every cautionary treatment
   * lands on the same ramp as the brand itself, so a red-bordered "Cancel" and
   * a red-bordered "Open tracking" would differ by nothing a user could name.
   * The label carries the meaning; the variant only sets how loud it is. Where
   * a destructive action needs more than a label to be safe, the guard belongs
   * in the flow — a confirm step — not in the button's colour.
   */
  type Variant = 'primary' | 'secondary' | 'outline' | 'neutral';
  type Size = 'sm' | 'md' | 'lg';

  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    fullWidth = false,
    type = 'button',
    children,
    ...rest
  }: {
    variant?: Variant;
    size?: Size;
    disabled?: boolean;
    fullWidth?: boolean;
    type?: 'button' | 'submit' | 'reset';
    children?: Snippet;
  } & HTMLButtonAttributes = $props();

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
      'bg-transparent text-primary border-md border-primary hover:bg-primary-subtle active:bg-primary-subtle',
    neutral:
      'bg-transparent text-ink border-transparent hover:bg-neutral-100 active:bg-neutral-200'
  };
</script>

<button
  {type}
  {disabled}
  class="inline-flex items-center justify-center gap-2 rounded-md font-semibold transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 {sizeClass[
    size
  ]} {variantClass[variant]} {fullWidth ? 'w-full' : ''}"
  {...rest}
>
  {@render children?.()}
</button>
