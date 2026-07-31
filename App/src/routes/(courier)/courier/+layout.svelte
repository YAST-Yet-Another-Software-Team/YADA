<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import CourierTabBar from './CourierTabBar.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { getSession } from '$lib/auth/session.svelte';
	import { createCourierOnline } from './courier-online.svelte';
	import { initials } from '$lib/shared/text';
	import { isFocusedTrip, isHome } from './tabs';

	let { children }: { children: Snippet } = $props();

	const session = getSession();

	// Provided here for the whole courier workspace, and adopted from storage
	// after mount — $effect never runs on the server, where there is none.
	const online = createCourierOnline();
	$effect(() => {
		online.hydrate();
	});

	const path = $derived(page.url.pathname);
	const focusedTrip = $derived(isFocusedTrip(path));
	const home = $derived(isHome(path));
	const avatarInitials = $derived(initials(session.user?.name, 'C'));
</script>

<div class="min-h-svh bg-neutral-200">
	<div
		class="relative mx-auto flex min-h-svh w-full max-w-[420px] flex-col overflow-hidden bg-bg shadow-lg sm:min-h-[min(100svh,852px)] sm:my-0 sm:rounded-none md:my-6 md:min-h-[min(852px,calc(100svh-3rem))] md:rounded-xl md:border md:border-border"
	>
		<header
			class="z-20 flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-2.5"
		>
			<a href="/courier/home" class="inline-flex shrink-0 items-center" aria-label="YADA home">
				<img src="/logo.svg" alt="" class="h-8 w-auto" />
			</a>
			<a
				href="/courier/profile"
				class="rounded-full outline-none ring-primary focus-visible:ring-2"
				aria-label="Open profile"
			>
				<Avatar initials={avatarInitials} size={32} status={online.online ? 'online' : null} />
			</a>
		</header>

		<div class="flex min-h-0 flex-1 flex-col {home ? 'overflow-hidden' : 'overflow-y-auto'}">
			{@render children()}
		</div>

		{#if !focusedTrip}
			<CourierTabBar />
		{/if}
	</div>
</div>
