<script lang="ts">
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { getSession } from '$auth/session.svelte';
	import { getCourierOnline } from '../courier-online.svelte';
	import { initials } from '$lib/shared/text';

	const session = getSession();
	const online = getCourierOnline();

	const user = $derived(session.user);
	const avatarInitials = $derived(initials(user?.name, 'C'));
	const profileName = $derived(user?.name || 'Courier');
	const profileEmail = $derived(user?.email || 'No email on file');
	const profilePhone = $derived(user?.phone || 'No phone on file');
	const vehicle = $derived(user?.role === 'courier' ? 'Bike' : 'Vehicle');

	function signOut() {
		online.goOffline();
		void session.signOut('/');
	}
</script>

<svelte:head>
	<title>Profile | YADA Courier</title>
</svelte:head>

<div class="flex flex-1 flex-col gap-5 bg-bg p-4">
	<div class="flex items-start justify-between gap-3">
		<div class="flex items-center gap-3">
			<Avatar initials={avatarInitials} size={56} status={online.online ? 'online' : null} />
			<div>
				<h1 class="text-xl font-semibold text-ink">{profileName}</h1>
				<p class="text-sm text-ink-secondary">Courier · {vehicle}</p>
			</div>
		</div>
		<a
			href="/courier/profile/edit"
			class="shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:bg-neutral-50"
		>
			Edit
		</a>
	</div>

	<div class="grid grid-cols-2 gap-3">
		<div class="rounded-lg border border-border bg-surface p-4">
			<p class="text-eyebrow text-ink-tertiary">Status</p>
			<p class="font-mono-data mt-1 text-2xl font-bold text-ink">{online.online ? 'Online' : 'Offline'}</p>
		</div>
		<div class="rounded-lg border border-border bg-surface p-4">
			<p class="text-eyebrow text-ink-tertiary">Role</p>
			<p class="font-mono-data mt-1 text-2xl font-bold text-ink">{user?.role ?? 'courier'}</p>
		</div>
	</div>

	<section class="rounded-lg border border-border bg-surface p-4">
		<div class="mb-3 flex items-center justify-between gap-2">
			<h2 class="text-sm font-semibold text-ink">Account</h2>
			<a href="/courier/profile/edit" class="text-sm font-semibold text-primary hover:underline">
				Edit profile
			</a>
		</div>
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
		<Button variant="ghost" fullWidth onclick={signOut}>Sign out</Button>
	</div>
</div>
