<script lang="ts">
	import { goto } from '$app/navigation';
	import MapBackdrop from '$lib/components/MapBackdrop.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';

	function markDelivered() {
		goto('/courier/complete');
	}
</script>

<svelte:head>
	<title>Delivering | YADA Courier</title>
</svelte:head>

<div class="relative flex h-full min-h-[inherit] flex-1 flex-col bg-bg">
	<div class="relative min-h-[45%] flex-1">
		<MapBackdrop routeLabel>
			<div
				class="absolute left-[12%] top-[38%] h-3.5 w-3.5 rounded-full border-[3px] border-surface bg-primary"
			></div>
			<div
				class="absolute right-[12%] top-[38%] h-3.5 w-3.5 rounded-full border-[3px] border-surface bg-secondary"
			></div>
		</MapBackdrop>
	</div>

	<div
		class="z-10 flex flex-col gap-4 rounded-t-xl border-t border-border bg-surface p-5 shadow-lg"
	>
		<span
			class="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-subtle px-3 py-1 text-sm font-semibold text-primary"
		>
			→ Delivering
		</span>

		<div>
			<p class="font-semibold text-ink">88 Elm St</p>
			<p class="text-sm text-ink-secondary">Note: leave at door</p>
		</div>

		<div class="flex items-center gap-3">
			<IconButton ariaLabel="Call customer" variant="outline">
				<svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2"
					><path
						d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z"
					/></svg
				>
			</IconButton>
			<IconButton ariaLabel="Message customer" variant="outline">
				<svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2"
					><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg
				>
			</IconButton>
			<div class="flex-1"></div>
			<Button variant="primary" size="sm" on:click={markDelivered}>Mark delivered</Button>
		</div>
	</div>
</div>
