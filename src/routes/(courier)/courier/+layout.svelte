<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import CourierTabBar from '$lib/components/courier/CourierTabBar.svelte';

	$: path = $page.url.pathname;
	$: isAuth = path === '/courier/auth';
	$: isFocusedTrip =
		path === '/courier/offer' ||
		path === '/courier/offer-sheet' ||
		path === '/courier/pickup' ||
		path === '/courier/deliver';
	$: showChrome = !isAuth;
	$: showTabs = showChrome && !isFocusedTrip;
	$: focusedTitle =
		path === '/courier/offer-sheet'
			? 'New request'
			: path === '/courier/offer'
				? 'Request details'
				: path === '/courier/pickup'
					? 'Heading to pickup'
					: path === '/courier/deliver'
						? 'Delivering'
						: '';
	$: focusedSubtitle =
		path === '/courier/offer-sheet'
			? 'Review the request before the timer runs out.'
			: path === '/courier/offer'
				? 'Choose whether to accept or decline.'
				: path === '/courier/pickup'
					? 'Confirm pickup when you reach the rider.'
					: path === '/courier/deliver'
						? 'Complete the trip when the dropoff is done.'
						: '';

	function goBack() {
		goto('/courier/home');
	}
</script>

<div class="min-h-svh bg-neutral-200">
	<div
		class="relative mx-auto flex min-h-svh w-full max-w-[420px] flex-col overflow-hidden bg-bg shadow-lg sm:min-h-[min(100svh,852px)] sm:my-0 sm:rounded-none md:my-6 md:min-h-[min(852px,calc(100svh-3rem))] md:rounded-xl md:border md:border-border"
	>
		{#if showChrome}
			<header
				class="z-20 flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5"
			>
				{#if isFocusedTrip}
					<button
						type="button"
						class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-bg text-ink-secondary transition hover:bg-neutral-100 hover:text-ink"
						aria-label="Back to home"
						on:click={goBack}
					>
						<svg viewBox="0 0 24 24" class="h-4.5 w-4.5" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M15 18l-6-6 6-6" />
						</svg>
					</button>
					<div class="min-w-0 flex-1">
						<p class="text-sm font-semibold text-ink">{focusedTitle}</p>
						<p class="truncate text-xs text-ink-tertiary">{focusedSubtitle}</p>
					</div>
					<span class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
						Courier
					</span>
				{:else}
					<BrandLogo href="/courier/home" size="sm" />
					<span class="text-xs font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
						Courier
					</span>
				{/if}
			</header>
		{/if}

		<div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
			<slot />
		</div>

		{#if showTabs}
			<CourierTabBar />
		{/if}
	</div>
</div>
