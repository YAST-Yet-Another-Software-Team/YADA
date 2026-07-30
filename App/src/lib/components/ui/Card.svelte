<script lang="ts">
  import type { Snippet } from 'svelte';

  let { padding = 'p-4', children }: { padding?: string; children?: Snippet } = $props();
</script>

<article class="rounded-lg border border-border bg-surface shadow-xs {padding}">
  {@render children?.()}
</article>
