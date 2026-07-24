<script lang="ts">
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { auth } from '$lib/stores/auth';
	import { courierOnline } from '$lib/stores/courier-online';
	import { onMount } from 'svelte';

	onMount(() => {
		courierOnline.hydrate();
	});

	$: user = $auth.user;
	$: initials = (user?.name || 'C').split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'C';
	$: profileName = user?.name || 'Courier';
	$: profileEmail = user?.email || 'No email on file';
	$: profilePhone = user?.phone || 'No phone on file';
	$: vehicle = user?.role === 'courier' ? 'Bike' : 'Vehicle';

	function signOut() {
		courierOnline.goOffline();
		void auth.signOut('/');
	}
</script>

<svelte:head>
	<title>Profile | YADA Courier</title>
</svelte:head>

<div class="flex flex-1 flex-col gap-5 bg-bg p-4">
	<div class="flex items-center gap-3">
		<Avatar initials={initials} size={56} status={$courierOnline ? 'online' : null} />
		<div>
			<h1 class="text-xl font-semibold text-ink">{profileName}</h1>
			<p class="text-sm text-ink-secondary">Courier · {vehicle}</p>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div class="rounded-lg border border-border bg-surface p-4">
			<p class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Status</p>
			<p class="font-mono-data mt-1 text-2xl font-bold text-ink">{$courierOnline ? 'Online' : 'Offline'}</p>
		</div>
		<div class="rounded-lg border border-border bg-surface p-4">
			<p class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Role</p>
			<p class="font-mono-data mt-1 text-2xl font-bold text-ink">{user?.role ?? 'courier'}</p>
		</div>
	</div>

	<section class="rounded-lg border border-border bg-surface p-4">
		<h2 class="mb-3 text-sm font-semibold text-ink">Account</h2>
		<dl class="space-y-3 text-sm">
			<div>
				<dt class="text-ink-tertiary">Phone</dt>
				<dd class="font-medium text-ink">{profilePhone}</dd>
			</div>
			<div>
				<dt class="text-ink-tertiary">Email</dt>
				<dd class="font-medium text-ink">{profileEmail}</dd>
			</div>
			<div>
				<dt class="text-ink-tertiary">Vehicle</dt>
				<dd class="font-medium text-ink">{vehicle} (fixed)</dd>
			</div>
		</dl>
	</section>

	<div class="mt-auto">
		<Button variant="ghost" fullWidth on:click={signOut}>Sign out</Button>
	</div>
</div>
