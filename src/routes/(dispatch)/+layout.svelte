<script lang="ts">
	import { page } from '$app/stores';
	import BusinessTopNav from '$lib/components/business/BusinessTopNav.svelte';

	$: path = $page.url.pathname;
	$: isAuth = path === '/auth';
	$: showDesktopNav = !isAuth;
</script>

{#if isAuth}
	<div class="min-h-svh bg-bg">
		<slot />
	</div>
{:else}
	<div class="min-h-svh bg-bg">
		<!-- Mobile top bar -->
		<header class="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
			<a href="/dashboard" class="font-display text-lg font-bold text-primary">YADA</a>
			<nav class="flex items-center gap-3 text-sm font-semibold">
				<a
					href="/dashboard"
					class={path === '/dashboard' ? 'text-primary' : 'text-ink-secondary'}>Home</a
				>
				<a
					href="/request"
					class={path === '/request' || path === '/matching' || path === '/tracking'
						? 'text-primary'
						: 'text-ink-secondary'}>Request</a
				>
				<a href="/history" class={path === '/history' ? 'text-primary' : 'text-ink-secondary'}
					>History</a
				>
			</nav>
		</header>

		<!-- Desktop website chrome -->
		{#if showDesktopNav}
			<div class="hidden lg:block">
				<BusinessTopNav />
			</div>
		{/if}

		<main class="mx-auto w-full max-w-7xl lg:px-6 lg:py-6">
			<div class="min-h-[calc(100svh-3.25rem)] lg:min-h-[calc(100svh-58px-3rem)]">
				<slot />
			</div>
		</main>
	</div>
{/if}
