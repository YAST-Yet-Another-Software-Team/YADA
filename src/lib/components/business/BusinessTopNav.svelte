<script lang="ts">
	import { page } from '$app/stores';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import ProfileMenu from '$lib/components/business/ProfileMenu.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';

	const links = [
		{ href: '/dashboard', label: 'Dashboard', match: ['/dashboard'] },
		{ href: '/request', label: 'Requests', match: ['/request', '/matching', '/tracking'] },
		{ href: '/map', label: 'Map', match: ['/map'] },
		{ href: '/history', label: 'History', match: ['/history'] }
	];

	let profileOpen = false;

	$: path = $page.url.pathname;

	function isActive(match: string[]) {
		return match.some((m) => path === m || path.startsWith(m + '/'));
	}

	function toggleProfile(e: MouseEvent) {
		e.stopPropagation();
		profileOpen = !profileOpen;
	}
</script>

<header class="sticky top-0 z-20 border-b border-border bg-surface">
	<div class="mx-auto flex h-[58px] max-w-7xl items-stretch justify-between gap-4 px-6">
		<div class="flex items-center">
			<BrandLogo href="/dashboard" size="sm" />
		</div>

		<nav class="hidden items-stretch gap-1 md:flex" aria-label="Business">
			{#each links as link}
				<a
					href={link.href}
					class="-mb-px flex items-center border-b-[3px] px-3 text-[15px] transition {isActive(
						link.match
					)
						? 'border-primary font-bold text-ink'
						: 'border-transparent font-medium text-ink-secondary hover:text-ink'}"
				>
					{link.label}
				</a>
			{/each}
			<span
				class="-mb-px flex cursor-not-allowed items-center border-b-[3px] border-transparent px-3 text-[15px] text-ink-disabled"
				title="Coming soon"
			>
				Team
			</span>
		</nav>

		<div class="relative flex items-center gap-3" data-profile-menu>
			<slot name="actions" />
			<button
				type="button"
				class="rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
				aria-label="Open business profile"
				aria-expanded={profileOpen}
				on:click={toggleProfile}
			>
				<Avatar initials="JM" size={34} />
			</button>
			<ProfileMenu open={profileOpen} on:close={() => (profileOpen = false)} />
		</div>
	</div>
</header>
