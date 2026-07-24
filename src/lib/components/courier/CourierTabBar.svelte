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
			match: [
				'/courier/orders',
				'/courier/offer',
				'/courier/offer-sheet',
				'/courier/pickup',
				'/courier/deliver'
			],
			icon: 'orders'
		},
		{
			href: '/courier/trips',
			label: 'Trips',
			match: ['/courier/trips', '/courier/complete'],
			icon: 'trips'
		},
		{
			href: '/courier/settings',
			label: 'Settings',
			match: ['/courier/settings'],
			icon: 'settings'
		}
	];

	$: path = $page.url.pathname;

	function isActive(match: string[]) {
		return match.some((m) => path === m || path.startsWith(`${m}/`));
	}
</script>

<nav
	class="z-20 shrink-0 border-t border-border bg-surface px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]"
	aria-label="Courier"
>
	<div class="mx-auto flex max-w-md items-stretch">
		{#each tabs as tab}
			{@const active = isActive(tab.match)}
			<a
				href={tab.href}
				aria-current={active ? 'page' : undefined}
				class="group relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-semibold transition-colors {active
					? 'text-primary'
					: 'text-ink-tertiary hover:text-ink-secondary'}"
			>
				<span
					class="flex h-8 w-11 items-center justify-center rounded-full transition-all duration-200 ease-out {active
						? 'scale-100 bg-primary-subtle'
						: 'scale-90 bg-transparent group-active:scale-95 group-active:bg-neutral-100'}"
				>
					<span
						class="inline-flex h-5 w-5 items-center justify-center transition-transform duration-200 {active
							? '-translate-y-px'
							: ''}"
					>
						{#if tab.icon === 'home'}
							<svg
								viewBox="0 0 24 24"
								class="h-5 w-5"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><path d="m3 10 9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg
							>
						{:else if tab.icon === 'orders'}
							<svg
								viewBox="0 0 24 24"
								class="h-5 w-5"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><path d="M6 2h12l2 7H4L6 2Z" /><path
									d="M4 9v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9"
								/><path d="M10 14h4" /></svg
							>
						{:else if tab.icon === 'trips'}
							<svg
								viewBox="0 0 24 24"
								class="h-5 w-5"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg
							>
						{:else}
							<svg
								viewBox="0 0 24 24"
								class="h-5 w-5"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><circle cx="12" cy="12" r="3" /><path
									d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
								/></svg
							>
						{/if}
					</span>
				</span>
				<span class="transition-opacity {active ? 'opacity-100' : 'opacity-90'}">{tab.label}</span>
			</a>
		{/each}
	</div>
</nav>
