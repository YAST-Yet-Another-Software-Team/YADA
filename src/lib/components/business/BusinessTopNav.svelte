<script lang="ts">
	import { page } from '$app/stores';
	import Avatar from '$lib/components/ui/Avatar.svelte';

	const links = [
		{ href: '/dashboard', label: 'Dashboard', match: ['/dashboard'] },
		{ href: '/request', label: 'Requests', match: ['/request', '/matching', '/tracking'] },
		{ href: '/history', label: 'History', match: ['/history'] }
	];

	$: path = $page.url.pathname;

	function isActive(match: string[]) {
		return match.some((m) => path === m || path.startsWith(m + '/'));
	}
</script>

<header class="sticky top-0 z-20 border-b border-border bg-surface">
	<div class="mx-auto flex h-[58px] max-w-7xl items-center justify-between gap-4 px-6">
		<a href="/dashboard" class="font-display text-xl font-bold text-primary">YADA</a>

		<nav class="hidden items-center gap-6 md:flex" aria-label="Business">
			{#each links as link}
				<a
					href={link.href}
					class="border-b-[3px] pb-0.5 text-[15px] transition {isActive(link.match)
						? 'border-primary font-bold text-ink'
						: 'border-transparent text-ink-secondary hover:text-ink'}"
				>
					{link.label}
				</a>
			{/each}
			<span
				class="cursor-not-allowed border-b-[3px] border-transparent pb-0.5 text-[15px] text-ink-disabled"
				title="Coming soon"
			>
				Team
			</span>
		</nav>

		<div class="flex items-center gap-3">
			<slot name="actions" />
			<Avatar initials="JM" size={34} />
		</div>
	</div>
</header>
