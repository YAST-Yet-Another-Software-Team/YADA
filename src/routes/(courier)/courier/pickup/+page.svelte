<script lang="ts">
	import { goto } from '$app/navigation';
	import MapBackdrop from '$lib/components/MapBackdrop.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	function confirmPickup() {
		goto('/courier/deliver');
	}
</script>

<svelte:head>
	<title>Heading to pickup | YADA Courier</title>
</svelte:head>

<div class="relative flex h-full min-h-[inherit] flex-1 flex-col bg-bg">
	<div class="relative min-h-[45%] flex-1">
		<MapBackdrop routeLabel>
			<div
				class="absolute left-[12%] top-[38%] h-3.5 w-3.5 rounded-full border-[3px] border-surface bg-primary"
			></div>
			<div
				class="absolute right-[12%] top-[38%] flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-secondary text-[10px] font-bold text-secondary-on"
			>
				HQ
			</div>
		</MapBackdrop>
	</div>

	<div
		class="z-10 flex flex-col gap-4 rounded-t-xl border-t border-border bg-surface p-5 shadow-lg"
	>
		<span
			class="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary-subtle px-3 py-1 text-sm font-semibold text-secondary-700"
		>
			→ Heading to pickup
		</span>

		<div>
			<p class="font-semibold text-ink">Favorie</p>
			<p class="text-sm text-ink-secondary">221 Baker St · Order #4521</p>
		</div>

		<div class="flex items-center gap-3">
			<Button variant="ghost" size="sm">Navigate</Button>
			<div class="flex-1"></div>
			<Button variant="primary" size="sm" on:click={confirmPickup}>Confirm pickup</Button>
		</div>
	</div>
</div>
