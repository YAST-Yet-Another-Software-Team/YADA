<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { courierOnline } from '$lib/stores/courier-online';

	let timer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		courierOnline.hydrate();
	});

	onDestroy(() => {
		if (timer) clearTimeout(timer);
	});

	function goOnline() {
		courierOnline.goOnline();
	}

	function goOffline() {
		if (timer) clearTimeout(timer);
		courierOnline.goOffline();
	}

	function simulateSheet() {
		if (!$courierOnline) return;
		if (timer) clearTimeout(timer);
		goto('/courier/offer-sheet');
	}

	function simulateFull() {
		if (!$courierOnline) return;
		if (timer) clearTimeout(timer);
		goto('/courier/offer');
	}

	function openOrders() {
		goto('/courier/orders');
	}

	function openTrips() {
		goto('/courier/trips');
	}

	function openProfile() {
		goto('/courier/profile');
	}
</script>

<svelte:head>
	<title>Home | YADA Courier</title>
</svelte:head>

<div class="flex flex-1 flex-col bg-bg">
	<div class="flex items-center justify-between px-4 py-3">
		<p class="text-sm font-semibold text-ink">Kwame A.</p>
		{#if $courierOnline}
			<span
				class="inline-flex items-center gap-1.5 rounded-full bg-primary-subtle px-3 py-1 text-xs font-semibold text-primary"
			>
				<span class="h-2 w-2 rounded-full bg-primary animate-yada-pulse"></span>
				Online
			</span>
		{:else}
			<span
				class="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-ink-tertiary"
			>
				<span class="h-2 w-2 rounded-full bg-neutral-400"></span>
				Offline
			</span>
		{/if}
	</div>

	{#if !$courierOnline}
			<div class="flex flex-1 flex-col justify-between gap-6 px-4 py-4">
				<Card>
					<div class="flex items-start gap-4">
						<div
							class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-primary-subtle text-primary"
						>
							<svg
								viewBox="0 0 24 24"
								class="h-7 w-7"
								fill="none"
								stroke="currentColor"
								stroke-width="1.7"
							>
								<path d="M5 17h14" />
								<path d="M7 17V9l5-4 5 4v8" />
								<circle cx="8.5" cy="17" r="1.5" />
								<circle cx="15.5" cy="17" r="1.5" />
							</svg>
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Status</p>
							<h1 class="mt-1 text-lg font-bold text-ink">You’re offline</h1>
							<p class="mt-2 text-sm leading-6 text-ink-secondary">
								Go online when you’re ready to receive nearby delivery requests.
							</p>
						</div>
					</div>
				</Card>

				<div class="grid gap-3 sm:grid-cols-3">
					<Button variant="outline" size="sm" fullWidth on:click={openOrders}>Orders</Button>
					<Button variant="outline" size="sm" fullWidth on:click={openTrips}>Trips</Button>
					<Button variant="outline" size="sm" fullWidth on:click={openProfile}>Profile</Button>
				</div>

				<div class="mt-auto flex flex-col gap-3">
					<p class="text-sm text-ink-secondary">
						Once you’re online, request offers will appear here and in the orders tab.
					</p>
					<Button variant="primary" size="lg" fullWidth on:click={goOnline}>Go online</Button>
				</div>
			</div>
	{:else}
		<div class="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
			<div
				class="flex h-[120px] w-[120px] items-center justify-center rounded-full border-2 border-dashed border-neutral-300"
			>
				<div
					class="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-neutral-200"
				>
					<div
						class="flex h-11 w-11 items-center justify-center rounded-full bg-primary-subtle text-primary animate-yada-pulse"
					>
						<svg
							viewBox="0 0 24 24"
							class="h-5 w-5"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<circle cx="12" cy="12" r="3" />
							<circle cx="12" cy="12" r="8" />
						</svg>
					</div>
				</div>
			</div>

			<h1 class="text-lg font-bold text-ink">Waiting for a delivery request…</h1>
			<p class="max-w-xs text-sm text-ink-secondary">
				Stay nearby — businesses call riders based on distance
			</p>

			<button
				type="button"
				class="mt-2 text-sm font-semibold text-primary underline-offset-2 hover:underline"
				on:click={simulateSheet}
			>
				Simulate request
			</button>
			<button
				type="button"
				class="text-xs font-medium text-ink-tertiary underline-offset-2 hover:text-ink-secondary hover:underline"
				on:click={simulateFull}
			>
				Try full-screen offer
			</button>
		</div>

		<div class="border-t border-border px-6 py-4">
			<p class="mb-3 text-sm text-ink-secondary">Today: 3 deliveries</p>
			<Button variant="ghost" fullWidth on:click={goOffline}>Go offline</Button>
		</div>
	{/if}
</div>
