<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { courierOnline } from '$lib/stores/courier-online';
	import { onMount } from 'svelte';

	onMount(() => {
		courierOnline.hydrate();
	});

	function openActive() {
		goto('/courier/pickup');
	}
</script>

<svelte:head>
	<title>Orders | YADA Courier</title>
</svelte:head>

<div class="flex flex-1 flex-col gap-4 bg-bg p-4">
	<div>
		<h1 class="text-xl font-semibold text-ink">Orders</h1>
		<p class="mt-1 text-sm text-ink-secondary">Active and incoming deliveries</p>
	</div>

	{#if $courierOnline}
		<Card>
			<div class="flex flex-col gap-3">
				<p class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
					Demo active order
				</p>
				<p class="font-semibold text-ink">#4521 · 88 Elm St</p>
				<p class="text-sm text-ink-secondary">Pickup at YADA Kitchen — 221 Baker St</p>
				<Button variant="primary" size="sm" on:click={openActive}>Open active trip</Button>
			</div>
		</Card>
		<p class="text-center text-sm text-ink-tertiary">
			New offers appear on Home while you are online.
		</p>
	{:else}
		<div class="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
			<p class="font-semibold text-ink">No active orders</p>
			<p class="text-sm text-ink-secondary">Go online from Home to start receiving requests.</p>
			<Button variant="primary" on:click={() => goto('/courier/home')}>Go to Home</Button>
		</div>
	{/if}
</div>
