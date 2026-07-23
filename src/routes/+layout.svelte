<script lang="ts">
  import '$lib/styles/app.css';
  import { onMount } from 'svelte';
  import { auth } from '$lib/stores/auth';

  onMount(() => {
    void auth.syncSession();
  });
</script>

<slot />