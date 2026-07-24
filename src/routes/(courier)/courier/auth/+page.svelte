<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		goto('/', { replaceState: true });
	});
</script>

<svelte:head>
	<title>Sign in | YADA</title>
</svelte:head>

<p class="p-6 text-sm text-ink-secondary">Taking you to sign in…</p>
