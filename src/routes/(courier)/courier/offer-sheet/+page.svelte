<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import MapBackdrop from '$lib/components/MapBackdrop.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { KUMASI_CENTER } from '$lib/geo/service-area';

	let seconds = 12;
	let timer: ReturnType<typeof setInterval> | undefined;

	const pickup = { lat: 6.6785, lng: -1.5645 };
	const dropoff = { lat: 6.6745, lng: -1.5716 };

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
		sessionStorage.setItem(
			'yada:active-trip',
			JSON.stringify({
				id: sessionStorage.getItem('yada:courier-trip-id') ?? `offer-${Date.now()}`,
				pickupAddress: 'Ayeduase Kitchen',
				dropoffAddress: 'KNUST Commercial Area',
				pickupLat: pickup.lat,
				pickupLng: pickup.lng,
				dropoffLat: dropoff.lat,
				dropoffLng: dropoff.lng
			})
		);
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
	<div class="relative min-h-[50%] flex-1 opacity-80">
		<MapBackdrop
			routeLabel
			center={KUMASI_CENTER}
			markers={[
				{ id: 'pickup', lat: pickup.lat, lng: pickup.lng, label: 'Pickup', role: 'pickup' },
				{ id: 'dropoff', lat: dropoff.lat, lng: dropoff.lng, label: 'Dropoff', role: 'dropoff' }
			]}
			polylinePath={[pickup, dropoff]}
		/>
	</div>

	<div class="z-10 flex flex-col gap-4 rounded-t-xl border-t border-border bg-surface p-5 shadow-lg">
		<div class="flex items-center justify-between gap-3">
			<h1 class="text-lg font-bold text-ink">New request</h1>
			<span
				class="font-mono-data flex h-[26px] min-w-[26px] items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-on"
			>
				{countdown}
			</span>
		</div>

		<div>
			<p class="font-semibold text-ink">Ayeduase Kitchen → KNUST</p>
			<p class="text-sm text-ink-secondary">Pickup at Ayeduase Gate · ~6 min drive</p>
		</div>

		<div class="flex items-center gap-3">
			<IconButton ariaLabel="Decline" variant="outline" on:click={decline}>
				<svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="2"
					><path d="M18 6 6 18M6 6l12 12" /></svg
				>
			</IconButton>
			<div class="flex-1"></div>
			<Button variant="primary" size="sm" on:click={accept}>Accept</Button>
		</div>
	</div>
</div>
