<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { motion } from '$lib/client/motion';
	import Avatar from '$lib/components/Avatar.svelte';
	import Button from '$lib/components/Button.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { getSession } from '$auth/session.svelte';
	import { initials } from '$lib/shared/text';
	import { formatPhone } from '$lib/shared/phone';
	import IconAccount from '~icons/mdi/account-cog-outline';
	import IconMapMarker from '~icons/mdi/map-marker-outline';
	import IconLock from '~icons/mdi/lock-outline';
	import IconCog from '~icons/mdi/cog-outline';

	let { open = false, onclose }: { open?: boolean; onclose?: () => void } = $props();

	const session = getSession();
	const user = $derived(session.user);
	const avatarInitials = $derived(initials(user?.name, 'Y'));
	const displayName = $derived(user?.name || 'YADA user');
	const isCourier = $derived(user?.role === 'courier');
	const workspace = $derived(isCourier ? 'Courier workspace' : 'Business workspace');
	const email = $derived(user?.email || formatPhone(user?.phone) || 'No contact on file');

	/**
	 * A courier's account screens are tabs of one settings page, so linking at
	 * each of them separately would be three ways to the same screen. The
	 * business page addresses its tabs by query string, so they can be.
	 */
	const items = $derived(
		isCourier
			? [
					{
						href: '/settings/profile',
						label: 'Profile & account',
						icon: IconAccount,
						hint: 'Name, phone, password'
					},
					{ href: '/settings', label: 'Settings', icon: IconCog, hint: 'Theme, language, privacy' }
				]
			: [
					{
						href: '/profile',
						label: 'Profile & account',
						icon: IconAccount,
						hint: 'Name, photo, phone'
					},
					{
						href: '/profile?tab=location',
						label: 'Business location',
						icon: IconMapMarker,
						hint: 'Where deliveries leave from'
					},
					{
						href: '/profile?tab=password',
						label: 'Password',
						icon: IconLock,
						hint: 'Change your password'
					}
				]
	);

	/** The item nodes, in render order: the first takes focus when the menu
	 *  opens so a keyboard lands inside it rather than back at the top of the
	 *  page, and the arrow keys walk the rest. */
	let itemRefs = $state<(HTMLAnchorElement | null)[]>([]);

	$effect(() => {
		if (!open) return;
		// The nodes only exist after the block has rendered.
		void tick().then(() => itemRefs[0]?.focus());
	});

	/** ArrowUp/ArrowDown move between items, which is what `role="menu"`
	 *  promises a screen reader that lands here. */
	function moveFocus(from: number, step: number) {
		const nodes = itemRefs.filter(Boolean) as HTMLAnchorElement[];
		if (nodes.length === 0) return;

		const next = (from + step + nodes.length) % nodes.length;
		nodes[next].focus();
	}

	function onDocClick(e: MouseEvent) {
		const target = e.target as HTMLElement | null;
		if (!target?.closest('[data-profile-menu]')) {
			onclose?.();
		}
	}

	/** Escape closes it — the same expectation any menu sets. */
	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) onclose?.();
	}

	onMount(() => {
		document.addEventListener('click', onDocClick);
		document.addEventListener('keydown', onKeydown);
	});

	onDestroy(() => {
		if (typeof document !== 'undefined') {
			document.removeEventListener('click', onDocClick);
			document.removeEventListener('keydown', onKeydown);
		}
	});
</script>

{#if open}
	<div
		data-profile-menu
		class="absolute right-0 top-full z-40 mt-2 w-[17.5rem] overflow-hidden rounded-lg border border-border bg-surface shadow-md"
		role="menu"
		in:fly={motion({ y: -8, duration: 160, easing: cubicOut })}
	>
		<!-- Identity, on the sunken step so the actions below it read as the part
		     you can act on rather than one long list. -->
		<div class="flex items-center gap-3 border-b border-border bg-surface-sunken px-4 py-3.5">
			<Avatar initials={avatarInitials} src={user?.image ?? null} alt="" size={44} />
			<div class="min-w-0">
				<p class="truncate text-sm font-semibold text-ink">{displayName}</p>
				<p class="truncate text-xs text-ink-secondary">{email}</p>
				<p class="text-eyebrow mt-0.5 text-ink-tertiary">{workspace}</p>
			</div>
		</div>

		<nav class="p-1.5" aria-label="Account">
			{#each items as item, i}
				{@const Icon = item.icon}
				<a
					href={item.href}
					role="menuitem"
					bind:this={itemRefs[i]}
					onclick={() => onclose?.()}
					onkeydown={(e) => {
						if (e.key === 'ArrowDown') {
							e.preventDefault();
							moveFocus(i, 1);
						} else if (e.key === 'ArrowUp') {
							e.preventDefault();
							moveFocus(i, -1);
						}
					}}
					class="flex items-start gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-wash focus-visible:bg-wash focus-visible:outline-none"
				>
					<Icon class="mt-0.5 h-5 w-5 shrink-0 text-ink-tertiary" aria-hidden="true" />
					<span class="min-w-0">
						<span class="block text-sm font-semibold text-ink">{item.label}</span>
						<span class="block truncate text-xs text-ink-secondary">{item.hint}</span>
					</span>
				</a>
			{/each}
		</nav>

		<!-- The business workspace has no settings page, so this is the only place
		     the theme can be changed from — and the choice is global, so without
		     it a preference set on the courier side would be stuck here. -->
		<div class="border-t border-border px-4 py-3">
			<p class="text-eyebrow mb-2 text-ink-tertiary">Appearance</p>
			<ThemeToggle />
		</div>

		<!-- A real form post, not a fetch: the server action deletes the session
		     row and clears the cookie on a navigation the browser has to apply,
		     and lands on /auth. See the `signout` action. -->
		<form method="POST" action="/auth?/signout" class="border-t border-border px-4 py-3">
			<Button type="submit" variant="outline" size="sm" fullWidth>Sign out</Button>
		</form>
	</div>
{/if}
