<script lang="ts">
	import { onMount } from 'svelte';
	import SettingsSubpage from '$lib/components/courier/SettingsSubpage.svelte';

	const THEME_KEY = 'yada.courierTheme';
	type Theme = 'system' | 'light' | 'dark';

	let theme: Theme = 'system';

	const options: { id: Theme; label: string; hint: string }[] = [
		{ id: 'system', label: 'System', hint: 'Match device setting' },
		{ id: 'light', label: 'Light', hint: 'Always light appearance' },
		{ id: 'dark', label: 'Dark', hint: 'Always dark appearance' }
	];

	onMount(() => {
		const saved = localStorage.getItem(THEME_KEY);
		if (saved === 'light' || saved === 'dark' || saved === 'system') theme = saved;
	});

	function select(next: Theme) {
		theme = next;
		localStorage.setItem(THEME_KEY, next);
	}
</script>

<svelte:head>
	<title>Theme | YADA Courier</title>
</svelte:head>

<SettingsSubpage title="Theme">
	<div class="overflow-hidden rounded-2xl bg-surface shadow-sm">
		{#each options as option, i}
			<button
				type="button"
				class="flex w-full items-center gap-3 px-4 py-3.5 text-left {i < options.length - 1
					? 'border-b border-border'
					: ''}"
				on:click={() => select(option.id)}
			>
				<span class="flex-1">
					<span class="block text-[15px] font-medium text-ink">{option.label}</span>
					<span class="mt-0.5 block text-xs text-ink-tertiary">{option.hint}</span>
				</span>
				{#if theme === option.id}
					<svg
						viewBox="0 0 24 24"
						class="h-5 w-5 text-primary"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						><path d="m5 12 5 5L20 7" /></svg
					>
				{/if}
			</button>
		{/each}
	</div>
</SettingsSubpage>
