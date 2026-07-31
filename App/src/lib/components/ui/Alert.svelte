<script lang="ts">
  import type { Snippet } from 'svelte';

  type Variant = 'danger' | 'warning' | 'success' | 'info';

  let { variant = 'danger', children }: { variant?: Variant; children?: Snippet } = $props();

  const variantClass: Record<Variant, string> = {
    danger: 'bg-danger-subtle text-danger',
    warning: 'bg-warning-subtle text-warning',
    success: 'bg-success-subtle text-success',
    info: 'bg-info-subtle text-info'
  };

  /** Danger interrupts; the rest are announced only when the reader is idle. */
  const role = $derived(variant === 'danger' ? 'alert' : 'status');
</script>

<p {role} class="rounded-md px-3 py-2 text-left text-sm font-medium {variantClass[variant]}">
  {@render children?.()}
</p>
