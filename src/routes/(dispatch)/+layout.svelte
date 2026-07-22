<script lang="ts">
	import { page } from '$app/stores';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import BusinessTopNav from '$lib/components/business/BusinessTopNav.svelte';
	import ProfileMenu from '$lib/components/business/ProfileMenu.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';

	let profileOpen = false;

	$: path = $page.url.pathname;
	$: isAuth = path === '/auth';

	function toggleProfile(e: MouseEvent) {
		e.stopPropagation();
		profileOpen = !profileOpen;
	}
</script>

{#if isAuth}
	<div class="min-h-svh bg-bg">
		<slot />
	</div>
{:else}
	<div class="min-h-svh bg-bg">
		<!-- Mobile top bar -->
		<header
			class="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 lg:hidden"
		>
			<BrandLogo href="/dashboard" size="sm" />
			<nav class="flex flex-1 items-center justify-end gap-3 text-sm font-semibold">
				<a href="/dashboard" class={path === '/dashboard' ? 'text-primary' : 'text-ink-secondary'}
					>Home</a
				>
				<a
					href="/request"
					class={path === '/request' || path === '/matching' || path === '/tracking'
						? 'text-primary'
						: 'text-ink-secondary'}>Request</a
				>
				<a href="/map" class={path === '/map' ? 'text-primary' : 'text-ink-secondary'}>Map</a>
				<a href="/history" class={path === '/history' ? 'text-primary' : 'text-ink-secondary'}
					>History</a
				>
				<div class="relative" data-profile-menu>
					<button
						type="button"
						class="rounded-full"
						aria-label="Open business profile"
						on:click={toggleProfile}
					>
						<Avatar initials="JM" size={28} />
					</button>
					<ProfileMenu open={profileOpen} on:close={() => (profileOpen = false)} />
				</div>
			</nav>
		</header>

		<!-- Desktop website chrome -->
		<div class="hidden lg:block">
			<BusinessTopNav />
		</div>

		<main class="mx-auto w-full max-w-7xl lg:px-6 lg:py-6">
			<div class="min-h-[calc(100svh-3.25rem)] lg:min-h-[calc(100svh-58px-3rem)]">
				<slot />
			</div>
		</main>
	</div>
{/if}
