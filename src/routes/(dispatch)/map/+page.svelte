<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import MapBackdrop from '$lib/components/MapBackdrop.svelte';
	import AddressAutocomplete from '$lib/components/ui/AddressAutocomplete.svelte';
	import { KUMASI_CENTER } from '$lib/geo/service-area';
	import { computeDrivingRoute } from '$lib/maps/routing';
	import {
		joinDispatchRiders,
		leaveDispatchRiders,
		onRiderLocation,
		type RiderLocationEvent
	} from '$lib/realtime/client';
	import { LOCATION_STALE_MS } from '$lib/realtime/courier-location';

	export let data: {
		businessProfile: {
			businessName: string;
			address: string;
			lat: number;
			lng: number;
		} | null;
		availableRiders: Array<{
			id: string;
			userId: string;
			name: string;
			vehicle: string;
			distanceKm: number;
			lat: number;
			lng: number;
			lastLocationAt: string | null;
			stale: boolean;
		}>;
	};

	let searchedLocation: { lat: number; lng: number; address: string } | null = null;
	let mapCenter: { lat: number; lng: number } | null =
		data.businessProfile != null
			? { lat: data.businessProfile.lat, lng: data.businessProfile.lng }
			: KUMASI_CENTER;
	let searchValue = '';
	let liveRiders = [...data.availableRiders];
	let etaByRider: Record<string, string> = {};
	let unsub: (() => void) | null = null;
	const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

	let mapZoom: number | null = null;

	function handleSearchSelect(
		event: CustomEvent<{ address: string; lat: number; lng: number; inZone?: boolean }>
	) {
		if (event.detail.inZone === false) return;

		searchedLocation = {
			address: event.detail.address,
			lat: event.detail.lat,
			lng: event.detail.lng
		};
		mapCenter = { lat: event.detail.lat, lng: event.detail.lng };
		mapZoom = 17;
	}

	async function refreshEta(rider: { id: string; lat: number; lng: number }) {
		if (!googleMapsApiKey || !data.businessProfile) {
			etaByRider = { ...etaByRider, [rider.id]: `~${rider.lat ? '' : ''}` };
			return;
		}
		try {
			const route = await computeDrivingRoute(
				googleMapsApiKey,
				{ lat: data.businessProfile.lat, lng: data.businessProfile.lng },
				{ lat: rider.lat, lng: rider.lng }
			);
			etaByRider = { ...etaByRider, [rider.id]: route.durationText };
		} catch {
			etaByRider = { ...etaByRider, [rider.id]: `${rider.lat ? 'approx' : ''}` };
		}
	}

	function applyLiveLocation(payload: RiderLocationEvent) {
		const stale =
			Date.now() - new Date(payload.recordedAt).getTime() > LOCATION_STALE_MS;
		liveRiders = liveRiders.map((rider) => {
			if (payload.courierId && rider.userId !== payload.courierId) return rider;
			return {
				...rider,
				lat: payload.lat,
				lng: payload.lng,
				lastLocationAt: payload.recordedAt,
				stale
			};
		});
		const updated = liveRiders.find((r) => r.userId === payload.courierId);
		if (updated) void refreshEta(updated);
	}

	onMount(() => {
		joinDispatchRiders();
		unsub = onRiderLocation(applyLiveLocation);
		for (const rider of liveRiders) {
			void refreshEta(rider);
		}
	});

	onDestroy(() => {
		unsub?.();
		leaveDispatchRiders();
	});

	$: markers = [
		...(data.businessProfile
			? [
					{
						id: 'hq',
						lat: data.businessProfile.lat,
						lng: data.businessProfile.lng,
						label: data.businessProfile.businessName,
						role: 'business' as const
					}
				]
			: []),
		...liveRiders.map((rider) => ({
			id: rider.id,
			lat: rider.lat,
			lng: rider.lng,
			label: `${rider.name} · ${etaByRider[rider.id] ?? `${rider.distanceKm} km`}`,
			role: 'rider' as const,
			stale: rider.stale
		})),
		...(searchedLocation
			? [
					{
						id: 'searched',
						lat: searchedLocation.lat,
						lng: searchedLocation.lng,
						label: searchedLocation.address,
						role: 'search' as const
					}
				]
			: [])
	];
</script>

<svelte:head>
	<title>Map | YADA</title>
</svelte:head>

<div
	class="flex h-full min-h-[calc(100svh-3.25rem)] flex-col gap-4 p-4 lg:min-h-[calc(100svh-58px-3rem)] lg:p-0"
>
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold text-ink">Area map</h1>
			<p class="mt-1 text-sm text-ink-secondary">
				Ayeduase kitchen and nearby motor riders (KNUST delivery zone)
			</p>
		</div>
		<p class="font-mono-data text-sm text-ink-tertiary">
			{liveRiders.length} riders online
		</p>
	</div>

	<div
		class="relative min-h-[420px] flex-1 overflow-visible rounded-lg border border-border bg-surface lg:min-h-[calc(100svh-58px-8rem)]"
	>
		<div class="absolute left-4 right-4 top-4 z-40 max-w-md sm:left-6">
			<div class="rounded-md bg-surface/95 shadow-lg backdrop-blur-sm">
				<AddressAutocomplete
					placeholder="Search KNUST / Ayeduase address..."
					bind:value={searchValue}
					on:select={handleSearchSelect}
				/>
			</div>
		</div>

		<div class="absolute inset-0 overflow-hidden rounded-lg">
			<MapBackdrop
				center={mapCenter}
				zoom={mapZoom}
				markers={markers}
				locationUnavailable={liveRiders.some((r) => r.stale)}
			/>
		</div>
	</div>

	<aside class="rounded-lg border border-border bg-surface p-4 lg:hidden">
		<h2 class="mb-3 text-sm font-semibold text-ink">Nearby riders</h2>
		<ul class="space-y-2">
			{#each liveRiders as rider (rider.id)}
				<li class="flex items-center justify-between text-sm">
					<span class="font-medium text-ink">{rider.name}</span>
					<span class="text-ink-secondary">
						{etaByRider[rider.id] ?? `${rider.distanceKm} km`}
						{#if rider.stale}
							· last known
						{/if}
					</span>
				</li>
			{/each}
		</ul>
	</aside>
</div>
