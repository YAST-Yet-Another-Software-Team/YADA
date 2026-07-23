<script lang="ts">
	import { goto } from '$app/navigation';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { courierOnline } from '$lib/stores/courier-online';
	import { onMount } from 'svelte';

	onMount(() => {
		courierOnline.hydrate();
	});

	const profile = {
		name: 'Kwame Asante',
		phone: '(555) 014-2201',
		email: 'kwame@email.com',
		vehicle: 'Bike',
		rating: '4.92',
		deliveries: '128'
	};

	function signOut() {
		courierOnline.goOffline();
		goto('/courier/auth');
	}
</script>

<svelte:head>
	<title>Profile | YADA Courier</title>
</svelte:head>

<div class="flex flex-1 flex-col gap-5 bg-bg p-4">
	<div class="flex items-center gap-3">
		<Avatar initials="KA" size={56} status={$courierOnline ? 'online' : null} />
		<div>
			<h1 class="text-xl font-semibold text-ink">{profile.name}</h1>
			<p class="text-sm text-ink-secondary">Courier · {profile.vehicle}</p>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div class="rounded-lg border border-border bg-surface p-4">
			<p class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Rating</p>
			<p class="font-mono-data mt-1 text-2xl font-bold text-ink">{profile.rating}</p>
		</div>
		<div class="rounded-lg border border-border bg-surface p-4">
			<p class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Trips</p>
			<p class="font-mono-data mt-1 text-2xl font-bold text-ink">{profile.deliveries}</p>
		</div>
	</div>

	<section class="rounded-lg border border-border bg-surface p-4">
		<h2 class="mb-3 text-sm font-semibold text-ink">Account</h2>
		<dl class="space-y-3 text-sm">
			<div>
				<dt class="text-ink-tertiary">Phone</dt>
				<dd class="font-medium text-ink">{profile.phone}</dd>
			</div>
			<div>
				<dt class="text-ink-tertiary">Email</dt>
				<dd class="font-medium text-ink">{profile.email}</dd>
			</div>
			<div>
				<dt class="text-ink-tertiary">Vehicle</dt>
				<dd class="font-medium text-ink">{profile.vehicle} (fixed)</dd>
			</div>
		</dl>
	</section>

	<div class="mt-auto">
		<Button variant="ghost" fullWidth on:click={signOut}>Sign out</Button>
	</div>
</div>
