<script lang="ts">
	import type { Component } from 'svelte';

	import { page } from '$app/state';
	import { activeTabIndex, COURIER_TABS, isTabActive, type CourierTab } from './tabs';
	import IconHome from '~icons/mdi/home-outline';
	import IconOrders from '~icons/mdi/package-variant-closed';
	import IconTrips from '~icons/mdi/clock-outline';
	import IconSettings from '~icons/mdi/cog-outline';

	// `tabs.ts` stays a plain data module — the layout imports it too, and it has
	// no business pulling in Svelte components. The name-to-glyph mapping lives
	// here, where the glyphs are actually drawn.
	const TAB_ICONS: Record<CourierTab['icon'], Component> = {
		home: IconHome,
		orders: IconOrders,
		trips: IconTrips,
		settings: IconSettings
	};

	const tabs = COURIER_TABS;

	const path = $derived(page.url.pathname);
	const activeIndex = $derived(activeTabIndex(path));
</script>

<!-- A snippet rather than inline markup: `{@const}` needs a block to live in. -->
{#snippet tabGlyph(icon: CourierTab['icon'])}
	{@const Icon = TAB_ICONS[icon]}
	<Icon class="h-5 w-5" aria-hidden="true" />
{/snippet}

<nav
	class="z-20 shrink-0 border-t border-border bg-surface px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 shadow-nav"
	aria-label="Courier"
>
	<div class="relative mx-auto flex max-w-md items-stretch">
		<span
			class="pointer-events-none absolute top-1.5 h-8 rounded-full bg-primary/15 transition-[left] duration-300 ease-out"
			style="width: calc(100% / {tabs.length} - 1.25rem); left: calc({activeIndex} * (100% / {tabs.length}) + 0.625rem);"
			aria-hidden="true"
		></span>

		{#each tabs as tab}
			{@const active = isTabActive(path, tab)}
			<a
				href={tab.href}
				aria-current={active ? 'page' : undefined}
				class="group relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-semibold transition-colors duration-200 {active
					? 'text-primary'
					: 'text-ink-tertiary hover:text-ink-secondary'}"
			>
				<span
					class="flex h-8 w-11 items-center justify-center rounded-full transition-transform duration-200 ease-out {active
						? 'scale-100'
						: 'scale-90 group-active:scale-95'}"
				>
					<span
						class="inline-flex h-5 w-5 items-center justify-center transition-transform duration-200 {active
							? '-translate-y-px'
							: ''}"
					>
						{@render tabGlyph(tab.icon)}
					</span>
				</span>
				<span class="transition-opacity {active ? 'opacity-100' : 'opacity-90'}">{tab.label}</span>
			</a>
		{/each}
	</div>
</nav>
