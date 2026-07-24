<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import MapBackdrop from '$lib/components/MapBackdrop.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import StatusPill from '$lib/components/ui/StatusPill.svelte';
	import { KUMASI_CENTER } from '$lib/geo/service-area';

	let timer: ReturnType<typeof setTimeout> | undefined;
	let center = KUMASI_CENTER;
	let markers: Array<{ id: string; lat: number; lng: number; label?: string; role?: 'pickup' | 'dropoff' }> =
		[];

	onMount(() => {
		const tripId = $page.url.searchParams.get('trip');
		const raw = sessionStorage.getItem('yada:active-trip');
		if (raw) {
			try {
				const trip = JSON.parse(raw) as {
					pickupLat: number;
					pickupLng: number;
					dropoffLat: number;
					dropoffLng: number;
				};
				center = { lat: trip.pickupLat, lng: trip.pickupLng };
				markers = [
					{
						id: 'pickup',
						lat: trip.pickupLat,
						lng: trip.pickupLng,
						label: 'Pickup',
						role: 'pickup'
					},
					{
						id: 'dropoff',
						lat: trip.dropoffLat,
						lng: trip.dropoffLng,
						label: 'Dropoff',
						role: 'dropoff'
					}
				];
			} catch {
				// ignore
			}
		}

		timer = setTimeout(() => {
			goto(tripId ? `/tracking?trip=${encodeURIComponent(tripId)}` : '/tracking');
		}, 2200);
	});

	onDestroy(() => {
		if (timer) clearTimeout(timer);
	});

	function cancel() {
		if (timer) clearTimeout(timer);
		goto('/request');
	}
</script>

<svelte:head>
	<title>Finding a rider | YADA</title>
</svelte:head>

<div
	class="relative flex min-h-[calc(100svh-3.25rem)] flex-col lg:min-h-[calc(100svh-58px-3rem)] lg:overflow-hidden lg:rounded-lg lg:border lg:border-border"
>
	<div class="relative min-h-[45svh] flex-1 lg:min-h-0">
		<MapBackdrop showZone {center} {markers} />
	</div>

	<aside
		class="z-10 flex flex-col gap-4 rounded-t-xl border-t border-border bg-surface p-6 shadow-lg lg:mx-auto lg:mb-8 lg:w-full lg:max-w-md lg:rounded-xl lg:border"
	>
		<StatusPill status="searching" />
		<p class="text-sm text-ink-secondary">Matching a nearby motor rider in KNUST / Ayeduase…</p>
		<Button variant="ghost" size="sm" on:click={cancel}>Cancel</Button>
	</aside>
</div>
