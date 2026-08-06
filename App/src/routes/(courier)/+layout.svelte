<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import CourierTabBar from './CourierTabBar.svelte';
	import { createCourierOnline } from './courier-online.svelte';
	import { headerTitleFor, isFocusedTrip, isHome } from './tabs';

	let { children }: { children: Snippet } = $props();

	// Provided here for the whole courier workspace, and adopted from storage
	// after mount — $effect never runs on the server, where there is none.
	const online = createCourierOnline();
	$effect(() => {
		online.hydrate();
	});

	const path = $derived(page.url.pathname);
	const focusedTrip = $derived(isFocusedTrip(path));
	const home = $derived(isHome(path));
	const headerTitle = $derived(headerTitleFor(path));
</script>

<div class="flex min-h-svh justify-center bg-shell">
	<!-- A fixed height, not a minimum. With `min-h` the column simply grew past
	     the viewport whenever a screen ran long, so the page itself scrolled and
	     carried the tab bar off the bottom with it. Pinning the height makes the
	     content area below the only scroller, which is what keeps the bar on
	     screen — a phone's navigation should not be something you scroll to. -->
	<div
		class="relative flex h-svh w-full max-w-[420px] flex-col overflow-hidden bg-bg shadow-lg md:my-6 md:h-[min(852px,calc(100svh-3rem))] md:rounded-xl md:border md:border-border"
	>
		<!-- A title bar on the list screens, matching the business phone view: the
		     name of the screen you are on, nothing else. It is deliberately absent
		     on Home, where the map runs to the top edge and the lit tab already
		     says where you are — the wordmark that used to sit there bought a
		     rider nothing. -->
		{#if headerTitle}
			<header
				class="z-20 flex h-14 shrink-0 items-center border-b border-border bg-surface px-4"
			>
				<h1 class="min-w-0 truncate text-lg font-semibold text-ink">{headerTitle}</h1>
			</header>
		{/if}

		<div class="flex min-h-0 flex-1 flex-col {home ? 'overflow-hidden' : 'overflow-y-auto'}">
			{@render children()}
		</div>

		{#if !focusedTrip}
			<CourierTabBar />
		{/if}
	</div>
</div>
