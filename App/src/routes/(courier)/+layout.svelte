<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import VerifyEmailBanner from '$lib/components/VerifyEmailBanner.svelte';
	import { getSoundAlerts } from '$lib/client/sound-alerts.svelte';
	import type { CourierOffer } from '$lib/utils/types';
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

	/**
	 * The bell for a request that has started ringing this rider.
	 *
	 * Watched here rather than on Home and Orders, which both render the same
	 * `pendingRequests`: per-screen detection would ring again every time the
	 * rider switched tabs while an offer was still open. The layout outlives both,
	 * so the memory of what has been announced does too.
	 *
	 * `page.data` merges the active page's load data, which is how a layout can
	 * see a page-level payload at all — the tracking screen reads `page.data` the
	 * same way.
	 */
	const alerts = getSoundAlerts();
	const pendingRequests = $derived(
		page.data.pendingRequests as CourierOffer[] | undefined
	);

	$effect(() => {
		// Only Home and Orders load offers; Trips and Settings leave this
		// undefined. That is not the same as "no offers are ringing", and reading
		// it as such would forget everything already announced — so stepping into
		// Settings and back would ring again for an offer still on screen.
		if (!pendingRequests) return;

		// `offer.id` is the delivery request's own id and is stable across polls.
		// `expiresInSeconds` is not — the server recomputes it on every response,
		// so it cannot tell a new offer from one already on screen.
		alerts.announceOffers(pendingRequests.map((offer) => offer.id));
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
	<!-- The shell rises once, on first load. It is the layout, so it survives
	     navigation between courier screens and does not replay — the pages
	     inside carry their own entrances for that. -->
	<div
		class="rise relative flex h-svh w-full max-w-[420px] flex-col overflow-hidden bg-bg shadow-lg md:my-6 md:h-[min(852px,calc(100svh-3rem))] md:rounded-xl md:border md:border-border"
	>
		<!-- A title bar on the list screens, matching the business phone view: the
		     name of the screen you are on, nothing else. It is deliberately absent
		     on Home, where the map runs to the top edge and the lit tab already
		     says where you are — the wordmark that used to sit there bought a
		     rider nothing. -->
		{#if headerTitle}
			<header
				class="fade-in z-20 flex h-14 shrink-0 items-center border-b border-border bg-surface px-4"
			>
				<h1 class="min-w-0 truncate text-lg font-semibold text-ink">{headerTitle}</h1>
			</header>
		{/if}

		<!-- `shrink-0`, above the scroller: inside it the banner would scroll away
		     from a rider who is about to tap Go online and be refused. -->
		<VerifyEmailBanner />

		<div class="flex min-h-0 flex-1 flex-col {home ? 'overflow-hidden' : 'overflow-y-auto'}">
			{@render children()}
		</div>

		{#if !focusedTrip}
			<CourierTabBar />
		{/if}
	</div>
</div>
