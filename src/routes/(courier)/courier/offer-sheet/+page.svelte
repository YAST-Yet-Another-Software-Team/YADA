<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import MapBackdrop from '$lib/components/MapBackdrop.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';

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

	$: countdown = seconds.toString().padStart(2, '0');

	function accept() {
		if (timer) clearInterval(timer);
		goto('/courier/pickup');
	}

	function decline() {
		if (timer) clearInterval(timer);
		goto('/courier/home');
	}
</script>

<svelte:head>
	<title>New request | YADA Courier</title>
</svelte:head>

<div class="relative flex h-full min-h-[inherit] flex-1 flex-col bg-bg">
	<!-- Dimmed live map underneath -->
	<div class="relative min-h-[50%] flex-1 opacity-50">
		<MapBackdrop routeLabel>
			<div
				class="absolute left-[18%] top-[42%] h-3.5 w-3.5 rounded-full border-[3px] border-surface bg-primary"
			></div>
			<div
				class="absolute right-[18%] top-[36%] flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-secondary text-[10px] font-bold text-secondary-on"
			>
				HQ
			</div>
		</MapBackdrop>
	</div>

	<!-- Offer slides up as bottom sheet -->
	<div
		class="z-10 flex flex-col gap-4 rounded-t-xl border-t border-border bg-surface p-5 shadow-lg"
	>
		<div class="flex items-center justify-between gap-3">
			<h1 class="text-lg font-bold text-ink">New request</h1>
			<span
				class="font-mono-data flex h-[26px] min-w-[26px] items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-on"
			>
				0:{countdown}
			</span>
		</div>

		<p class="text-sm leading-normal text-ink-secondary">
			Pickup: YADA Kitchen (0.4 mi) → Dropoff: 88 Elm St (1.4 mi)
		</p>

		<div class="flex items-center gap-3">
			<IconButton ariaLabel="Decline request" variant="outline" on:click={decline}>
				<svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2"
					><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
				>
			</IconButton>
			<div class="flex-1">
				<Button variant="primary" size="lg" fullWidth on:click={accept}>Accept</Button>
			</div>
		</div>
	</div>
</div>
