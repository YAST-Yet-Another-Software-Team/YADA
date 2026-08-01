<script lang="ts">
	import { page } from '$app/state';
	import { activeTabIndex, COURIER_TABS, isTabActive } from './tabs';
	import { getCourierOnline } from './courier-online.svelte';

	const tabs = COURIER_TABS;
	// The online dot used to ride on the header avatar. It follows the profile
	// down here, because it's the one piece of status a courier checks at a
	// glance and it shouldn't be lost in the move.
	const online = getCourierOnline();

	const path = $derived(page.url.pathname);
	const activeIndex = $derived(activeTabIndex(path));
</script>

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
						{:else if tab.icon === 'profile'}
							<span class="relative inline-flex">
								<svg
									viewBox="0 0 24 24"
									class="h-5 w-5"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg
								>
								{#if online.online}
									<span
										class="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-surface bg-success"
										aria-hidden="true"
									></span>
								{/if}
							</span>
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
