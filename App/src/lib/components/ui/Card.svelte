<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children?: Snippet } = $props();
</script>

<article class="rounded-lg border border-border bg-surface p-4 shadow-xs">
  {@render children?.()}
</article>
