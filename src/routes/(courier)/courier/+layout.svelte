<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import CourierTabBar from '$lib/components/courier/CourierTabBar.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { auth } from '$lib/stores/auth';
	import { courierOnline } from '$lib/stores/courier-online';

	$: path = $page.url.pathname;
	$: isAuth = path === '/courier/auth';
	$: isFocusedTrip =
		path === '/courier/offer' ||
		path === '/courier/offer-sheet' ||
		path === '/courier/pickup' ||
		path === '/courier/deliver';
	$: showChrome = !isAuth;
	$: showTabs = showChrome && !isFocusedTrip;
	$: isHome = path === '/courier/home';
	$: user = $auth.user;
	$: initials =
		(user?.name || 'C')
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0] || '')
			.join('')
			.toUpperCase() || 'C';

	onMount(() => {
		courierOnline.hydrate();
		void auth.syncSession();
	});
</script>

<div class="min-h-svh bg-neutral-200">
	<div
		class="relative mx-auto flex min-h-svh w-full max-w-[420px] flex-col overflow-hidden bg-bg shadow-lg sm:min-h-[min(100svh,852px)] sm:my-0 sm:rounded-none md:my-6 md:min-h-[min(852px,calc(100svh-3rem))] md:rounded-xl md:border md:border-border"
	>
		{#if showChrome}
			<header
				class="z-20 flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-2.5"
			>
				<BrandLogo href="/courier/home" size="sm" />
				<a
					href="/courier/profile"
					class="rounded-full outline-none ring-primary focus-visible:ring-2"
					aria-label="Open profile"
				>
					<Avatar initials={initials} size={32} status={$courierOnline ? 'online' : null} />
				</a>
			</header>
		{/if}

		<div class="flex min-h-0 flex-1 flex-col {isHome ? 'overflow-hidden' : 'overflow-y-auto'}">
			<slot />
		</div>

		{#if showTabs}
			<CourierTabBar />
		{/if}
	</div>
</div>
