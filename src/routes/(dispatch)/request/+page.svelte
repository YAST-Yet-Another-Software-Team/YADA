<script lang="ts">
	import { goto } from '$app/navigation';
	import MapBackdrop from '$lib/components/MapBackdrop.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';

	let pickup = '221 Baker St — Kitchen';
	let dropoff = '';
	let vehicle = 'bike';

	const vehicleOptions = [
		{ value: 'bike', label: 'Bike — fastest for nearby drops' },
		{ value: 'car', label: 'Car — larger orders' }
	];

	function findRider() {
		if (!dropoff.trim()) return;
		goto('/matching');
	}
</script>

<svelte:head>
	<title>New request | YADA</title>
</svelte:head>

<div class="flex h-full min-h-[calc(100svh-3.25rem)] flex-col lg:min-h-[calc(100svh-58px-3rem)]">
	<!-- Mobile header -->
	<div class="flex items-center gap-3 border-b border-border px-4 py-3 lg:hidden">
		<a href="/dashboard" class="text-ink" aria-label="Back">
			<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2"
				><path d="m15 18-6-6 6-6" /></svg
			>
		</a>
		<h1 class="text-lg font-semibold text-ink">New request</h1>
	</div>

	<div class="flex flex-1 flex-col lg:flex-row lg:gap-0 lg:overflow-hidden lg:rounded-lg lg:border lg:border-border lg:bg-surface">
		<!-- Form -->
		<div class="flex flex-1 flex-col gap-4 p-4 lg:max-w-xl lg:gap-5 lg:p-8">
			<h1 class="hidden text-xl font-semibold text-ink lg:block">New delivery request</h1>

			<Input label="Pickup (defaults to your location)" bind:value={pickup}>
				<svelte:fragment slot="icon">
					<svg
						viewBox="0 0 24 24"
						class="h-4 w-4 text-primary"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /></svg
					>
				</svelte:fragment>
			</Input>

			<Input label="Dropoff" placeholder="Customer address" bind:value={dropoff}>
				<svelte:fragment slot="icon">
					<svg
						viewBox="0 0 24 24"
						class="h-4 w-4 text-secondary"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						><path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" /><circle
							cx="12"
							cy="10"
							r="2.5"
						/></svg
					>
				</svelte:fragment>
			</Input>

			<Select label="Vehicle" options={vehicleOptions} bind:value={vehicle} />

			<!-- Mobile map preview -->
			<div class="relative h-[130px] overflow-hidden rounded-lg border border-border lg:hidden">
				<MapBackdrop />
			</div>

			<div class="mt-auto pt-2">
				<Button
					variant="primary"
					size="lg"
					fullWidth
					disabled={!dropoff.trim()}
					on:click={findRider}
				>
					Find a rider
				</Button>
			</div>
		</div>

		<!-- Desktop side panel -->
		<aside
			class="relative hidden w-[320px] shrink-0 flex-col gap-3 border-l border-border bg-surface p-5 lg:flex"
		>
			<h2 class="font-semibold text-ink">Route preview</h2>
			<div class="relative h-[220px] overflow-hidden rounded-md border border-border">
				<MapBackdrop routeLabel />
			</div>
			<p class="text-sm text-ink-secondary">Est. distance: 1.4 mi</p>
			<p class="text-sm text-ink-secondary">Est. time: 5–8 min</p>
		</aside>
	</div>
</div>
