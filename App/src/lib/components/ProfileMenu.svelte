<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Button from '$lib/components/Button.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { getSession } from '$auth/session.svelte';
	import { initials } from '$lib/shared/text';

	let { open = false, onclose }: { open?: boolean; onclose?: () => void } = $props();

	const session = getSession();
	const user = $derived(session.user);
	const avatarInitials = $derived(initials(user?.name, 'Y'));
	const displayName = $derived(user?.name || 'YADA user');
	const businessName = $derived(user?.role === 'courier' ? 'Courier workspace' : 'Business workspace');
	const email = $derived(user?.email || 'No email on file');
	const phone = $derived(user?.phone || 'No phone on file');

	function onDocClick(e: MouseEvent) {
		const target = e.target as HTMLElement | null;
		if (!target?.closest('[data-profile-menu]')) {
			onclose?.();
		}
	}

	onMount(() => {
		document.addEventListener('click', onDocClick);
	});

	onDestroy(() => {
		if (typeof document !== 'undefined') {
			document.removeEventListener('click', onDocClick);
		}
	});
</script>

{#if open}
	<div
		data-profile-menu
		class="absolute right-0 top-full z-40 mt-2 w-72 rounded-lg border border-border bg-surface p-4 shadow-md"
		role="menu"
	>
		<div class="mb-3 flex items-center gap-3 border-b border-border pb-3">
			<Avatar initials={avatarInitials} size={40} />
			<div>
				<p class="text-sm font-semibold text-ink">{displayName}</p>
				<p class="text-xs text-ink-secondary">{businessName}</p>
			</div>
		</div>
		<dl class="mb-4 space-y-2.5 text-sm">
			<div>
				<dt class="text-eyebrow text-ink-tertiary">Email</dt>
				<dd class="text-ink">{email}</dd>
			</div>
			<div>
				<dt class="text-eyebrow text-ink-tertiary">Phone</dt>
				<dd class="text-ink">{phone}</dd>
			</div>
			<div>
				<dt class="text-eyebrow text-ink-tertiary">Role</dt>
				<dd class="text-ink">{user?.role ?? 'business'}</dd>
			</div>
		</dl>
		<!-- The business workspace has no settings page, so this is the only place
		     the theme can be changed from — and the choice is global, so without
		     it a preference set on the courier side would be stuck here. -->
		<div class="mb-4 border-t border-border pt-3">
			<p class="text-eyebrow mb-2 text-ink-tertiary">Appearance</p>
			<ThemeToggle />
		</div>
		<!-- A real form post, not a fetch: the server action deletes the session
		     row and clears the cookie on a navigation the browser has to apply,
		     and lands on /auth. See the `signout` action. -->
		<form method="POST" action="/auth?/signout" class="border-t border-border pt-3">
			<Button type="submit" variant="outline" size="sm" fullWidth>Sign out</Button>
		</form>
	</div>
{/if}
