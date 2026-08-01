<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import CourierTabBar from './CourierTabBar.svelte';
	import { createCourierOnline } from './courier-online.svelte';
	import { isFocusedTrip, isHome } from './tabs';

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
</script>

<div class="min-h-svh bg-neutral-200">
	<div
		class="relative mx-auto flex min-h-svh w-full max-w-[420px] flex-col overflow-hidden bg-bg shadow-lg sm:min-h-[min(100svh,852px)] sm:my-0 sm:rounded-none md:my-6 md:min-h-[min(852px,calc(100svh-3rem))] md:rounded-xl md:border md:border-border"
	>
		<!-- Wordmark only: profile moved into the tab bar, where a thumb can reach
		     it. See `./tabs`. -->
		<header
			class="z-20 flex shrink-0 items-center border-b border-border bg-surface px-4 py-2.5"
		>
			<a href="/home" class="inline-flex shrink-0 items-center" aria-label="YADA home">
				<img src="/logo.svg" alt="" class="h-8 w-auto" />
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
