<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import StatusPill from '$lib/components/ui/StatusPill.svelte';
	import { courierTripHref, type TripStage } from '$lib/shared/trip-status';
	import { getCourierOnline } from '../courier-online.svelte';

	let {
		data
	}: {
		data: {
			activeTrip: {
				id: string;
				status: TripStage;
				businessName: string;
				pickupAddress: string;
				dropoffAddress: string;
				estimatedDistanceKm: number | null;
			} | null;
			pendingRequests: Array<{
				id: string;
				businessName: string;
				pickupAddress: string;
				dropoffAddress: string;
				requestedAt: string;
			}>;
		};
	} = $props();

	const online = getCourierOnline();

	function shortId(id: string) {
		return `#${id.slice(0, 8).toUpperCase()}`;
	}

	function requestedAtLabel(iso: string) {
		return new Date(iso).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
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

	{#if data.activeTrip}
		<!-- Shown even when offline: going offline stops new offers, it doesn't
		     hand back a parcel the courier is already carrying. -->
		<Card>
			<div class="flex flex-col gap-3">
				<div class="flex items-start justify-between gap-3">
					<div class="space-y-1">
						<p class="font-mono-data text-xs text-ink-tertiary">{shortId(data.activeTrip.id)}</p>
						<p class="font-semibold text-ink">{data.activeTrip.dropoffAddress}</p>
						<p class="text-sm text-ink-secondary">
							Pickup at {data.activeTrip.businessName} — {data.activeTrip.pickupAddress}
						</p>
						{#if data.activeTrip.estimatedDistanceKm != null}
							<p class="text-xs text-ink-tertiary">
								{data.activeTrip.estimatedDistanceKm.toFixed(1)} km
							</p>
						{/if}
					</div>
					<StatusPill status={data.activeTrip.status} />
				</div>
				<Button
					variant="primary"
					size="sm"
					onclick={() => data.activeTrip && goto(courierTripHref(data.activeTrip))}
				>
					Open active trip
				</Button>
			</div>
		</Card>
	{/if}

	{#if online.online}
		<div class="flex flex-col gap-3">
			<p class="text-eyebrow text-ink-tertiary">
				Incoming requests
			</p>

			{#if data.pendingRequests.length === 0}
				<Card>
					<p class="text-sm text-ink-secondary">
						No requests waiting. New offers appear on Home while you are online.
					</p>
				</Card>
			{:else}
				{#each data.pendingRequests as request (request.id)}
					<Card>
						<div class="space-y-1">
							<p class="font-mono-data text-xs text-ink-tertiary">{shortId(request.id)}</p>
							<p class="font-semibold text-ink">{request.dropoffAddress}</p>
							<p class="text-sm text-ink-secondary">
								Pickup at {request.businessName} — {request.pickupAddress}
							</p>
							<p class="text-xs text-ink-tertiary">{requestedAtLabel(request.requestedAt)}</p>
						</div>
					</Card>
				{/each}

				<p class="text-center text-sm text-ink-tertiary">
					Accept or decline offers from Home.
				</p>
			{/if}
		</div>
	{:else if !data.activeTrip}
		<div class="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
			<p class="font-semibold text-ink">No active orders</p>
			<p class="text-sm text-ink-secondary">Go online from Home to start receiving requests.</p>
			<Button variant="primary" onclick={() => goto('/courier/home')}>Go to Home</Button>
		</div>
	{/if}
</div>
