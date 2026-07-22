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
		<header class="border-b border-border bg-surface lg:hidden">
			<div class="flex items-center justify-between gap-3 px-4 pt-3">
				<BrandLogo href="/dashboard" size="sm" />
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
			</div>
			<nav class="flex items-stretch gap-1 overflow-x-auto px-2" aria-label="Business">
				{#each [
					{ href: '/dashboard', label: 'Home', active: path === '/dashboard' },
					{
						href: '/request',
						label: 'Request',
						active: path === '/request' || path === '/matching' || path === '/tracking'
					},
					{ href: '/map', label: 'Map', active: path === '/map' },
					{ href: '/history', label: 'History', active: path === '/history' }
				] as link}
					<a
						href={link.href}
						aria-current={link.active ? 'page' : undefined}
						class="relative flex shrink-0 items-center px-3 py-2.5 text-sm transition-colors {link.active
							? 'font-bold text-ink'
							: 'font-semibold text-ink-secondary'}"
					>
						{link.label}
						<span
							class="pointer-events-none absolute inset-x-1 bottom-0 h-[3px] rounded-t-sm {link.active
								? 'bg-primary'
								: 'bg-transparent'}"
							aria-hidden="true"
						></span>
					</a>
				{/each}
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
