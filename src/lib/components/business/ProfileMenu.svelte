<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	const dispatch = createEventDispatcher<{ close: void }>();

	export let open = false;

	const profile = {
		name: 'Jordan Mensah',
		businessName: 'Favorie Kitchen',
		email: 'jordan@favorie.com',
		phone: '+233 24 555 0142',
		address: '221 Baker St — Kitchen'
	};

	function onDocClick(e: MouseEvent) {
		const target = e.target as HTMLElement | null;
		if (!target?.closest('[data-profile-menu]')) {
			dispatch('close');
		}
	}

	function signOut(e: MouseEvent) {
		e.stopPropagation();
		dispatch('close');
		goto('/auth');
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
			<Avatar initials="JM" size={40} />
			<div>
				<p class="text-sm font-semibold text-ink">{profile.name}</p>
				<p class="text-xs text-ink-secondary">{profile.businessName}</p>
			</div>
		</div>
		<dl class="mb-4 space-y-2.5 text-sm">
			<div>
				<dt class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Email</dt>
				<dd class="text-ink">{profile.email}</dd>
			</div>
			<div>
				<dt class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Phone</dt>
				<dd class="text-ink">{profile.phone}</dd>
			</div>
			<div>
				<dt class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">Address</dt>
				<dd class="text-ink">{profile.address}</dd>
			</div>
		</dl>
		<div class="border-t border-border pt-3">
			<Button variant="ghost" size="sm" fullWidth on:click={signOut}>Sign out</Button>
		</div>
	</div>
{/if}
