<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { page } from '$app/stores';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import CourierTabBar from '$lib/components/courier/CourierTabBar.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { auth } from '$lib/stores/auth';
	import { courierOnline } from '$lib/stores/courier-online';

	let { children }: { children: Snippet } = $props();

	const path = $derived($page.url.pathname);
	const isFocusedTrip = $derived(path === '/courier/pickup' || path === '/courier/deliver');
	const isHome = $derived(path === '/courier/home');
	const user = $derived($auth.user);
	const initials = $derived(
		(user?.name || 'C')
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0] || '')
			.join('')
			.toUpperCase() || 'C'
	);

	onMount(() => {
		courierOnline.hydrate();
	});
</script>

<div class="min-h-svh bg-neutral-200">
	<div
		class="relative mx-auto flex min-h-svh w-full max-w-[420px] flex-col overflow-hidden bg-bg shadow-lg sm:min-h-[min(100svh,852px)] sm:my-0 sm:rounded-none md:my-6 md:min-h-[min(852px,calc(100svh-3rem))] md:rounded-xl md:border md:border-border"
	>
		<header
			class="z-20 flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-2.5"
		>
			<BrandLogo href="/courier/home" size="sm" />
			<a
				href="/courier/profile"
				class="rounded-full outline-none ring-primary focus-visible:ring-2"
				aria-label="Open profile"
			>
				<Avatar {initials} size={32} status={$courierOnline ? 'online' : null} />
			</a>
		</header>

		<div class="flex min-h-0 flex-1 flex-col {isHome ? 'overflow-hidden' : 'overflow-y-auto'}">
			{@render children()}
		</div>

		{#if !isFocusedTrip}
			<CourierTabBar />
		{/if}
	</div>
</div>
