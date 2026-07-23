<script lang="ts">
	import { page } from '$app/stores';

	const tabs = [
		{
			href: '/courier/home',
			label: 'Home',
			match: ['/courier/home'],
			icon: 'home'
		},
		{
			href: '/courier/orders',
			label: 'Orders',
			match: ['/courier/orders', '/courier/offer', '/courier/offer-sheet', '/courier/pickup', '/courier/deliver'],
			icon: 'orders'
		},
		{
			href: '/courier/trips',
			label: 'Trips',
			match: ['/courier/trips', '/courier/complete'],
			icon: 'trips'
		},
		{
			href: '/courier/profile',
			label: 'Profile',
			match: ['/courier/profile'],
			icon: 'profile'
		}
	];

	$: path = $page.url.pathname;

	function isActive(match: string[]) {
		return match.some((m) => path === m || path.startsWith(`${m}/`));
	}
</script>

<nav
	class="z-20 flex shrink-0 items-stretch border-t border-border bg-surface"
	aria-label="Courier"
>
	{#each tabs as tab}
		{@const active = isActive(tab.match)}
		<a
			href={tab.href}
			aria-current={active ? 'page' : undefined}
			class="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition-colors {active
				? 'text-primary'
				: 'text-ink-tertiary hover:text-ink-secondary'}"
		>
			<span class="inline-flex h-6 w-6 items-center justify-center">
				{#if tab.icon === 'home'}
					<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2"
						><path d="m3 10 9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg
					>
				{:else if tab.icon === 'orders'}
					<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2"
						><path d="M6 2h12l2 7H4L6 2Z" /><path d="M4 9v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" /><path
							d="M10 14h4"
						/></svg
					>
				{:else if tab.icon === 'trips'}
					<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2"
						><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg
					>
				{:else}
					<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2"
						><path d="M19 21a7 7 0 0 0-14 0" /><circle cx="12" cy="8" r="4" /></svg
					>
				{/if}
			</span>
			{tab.label}
		</a>
	{/each}
</nav>
