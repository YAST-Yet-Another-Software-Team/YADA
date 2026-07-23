<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import StatusPill from '$lib/components/ui/StatusPill.svelte';

	const trips = [
		{
			id: 'YD-4521',
			to: '88 Elm St',
			when: 'Today · 2:41 PM',
			status: 'delivered' as const,
			distance: '1.4 mi'
		},
		{
			id: 'YD-4498',
			to: '12 River Rd',
			when: 'Today · 1:05 PM',
			status: 'delivered' as const,
			distance: '2.1 mi'
		},
		{
			id: 'YD-4477',
			to: '300 Oak Ave',
			when: 'Yesterday · 6:22 PM',
			status: 'cancelled' as const,
			distance: '0.9 mi'
		},
		{
			id: 'YD-4460',
			to: '9 Pine Ct',
			when: 'Yesterday · 12:10 PM',
			status: 'delivered' as const,
			distance: '1.8 mi'
		}
	];
</script>

<svelte:head>
	<title>Trips | YADA Courier</title>
</svelte:head>

<div class="flex flex-1 flex-col gap-4 bg-bg p-4">
	<div>
		<h1 class="text-xl font-semibold text-ink">Trips</h1>
		<p class="mt-1 text-sm text-ink-secondary">Your delivery history</p>
	</div>

	<div class="flex flex-col gap-3">
		{#each trips as trip (trip.id)}
			<Card>
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="font-mono-data text-sm text-ink-tertiary">#{trip.id}</p>
						<p class="text-sm font-semibold text-ink">{trip.to}</p>
						<p class="text-sm text-ink-secondary">{trip.when}</p>
						<p class="font-mono-data mt-1 text-xs text-ink-tertiary">{trip.distance}</p>
					</div>
					<StatusPill status={trip.status} />
				</div>
			</Card>
		{/each}
	</div>
</div>
