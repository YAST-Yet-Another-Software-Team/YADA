<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	let seconds = 12;
	let timer: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		timer = setInterval(() => {
			seconds = Math.max(0, seconds - 1);
		}, 1000);
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});

	$: countdown = `0:${seconds.toString().padStart(2, '0')}`;

	function accept() {
		if (timer) clearInterval(timer);
		goto('/courier/pickup');
	}

	function decline() {
		if (timer) clearInterval(timer);
		goto('/courier/waiting');
	}
</script>

<svelte:head>
	<title>New request | YADA Courier</title>
</svelte:head>

<div class="flex h-full min-h-[inherit] flex-1 flex-col bg-bg px-5 py-6">
	<div class="mb-5 flex items-center justify-between gap-3">
		<h1 class="text-lg font-bold text-ink">New delivery request</h1>
		<span
			class="font-mono-data rounded-full bg-primary-subtle px-3 py-1 text-sm font-semibold text-primary"
		>
			{countdown}
		</span>
	</div>

	<div class="flex flex-col gap-3">
		<Card>
			<p class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
				Pickup · 0.4 mi
			</p>
			<p class="mt-1 font-semibold text-ink">YADA Kitchen — 221 Baker St</p>
		</Card>
		<Card>
			<p class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
				Dropoff · 1.4 mi
			</p>
			<p class="mt-1 font-semibold text-ink">88 Elm St</p>
		</Card>
	</div>

	<div class="mt-auto flex gap-3 pt-8">
		<div class="flex-1">
			<Button variant="ghost" size="lg" fullWidth on:click={decline}>Decline</Button>
		</div>
		<div class="flex-[2]">
			<Button variant="primary" size="lg" fullWidth on:click={accept}>Accept</Button>
		</div>
	</div>
</div>
