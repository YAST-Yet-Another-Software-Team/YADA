<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		goto('/courier/home', { replaceState: true });
	});
</script>

<svelte:head>
	<title>Redirecting…</title>
</svelte:head>

<p class="p-6 text-sm text-ink-secondary">Redirecting to Home…</p>
