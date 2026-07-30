<script lang="ts">
  import '$lib/styles/app.css';
  import { onMount, type Snippet } from 'svelte';
  import { auth } from '$lib/stores/auth';

  let { children }: { children: Snippet } = $props();

  onMount(() => {
    void auth.syncSession();
  });
</script>

{@render children()}