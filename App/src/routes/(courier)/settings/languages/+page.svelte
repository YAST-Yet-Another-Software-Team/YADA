<script lang="ts">
	import { onMount } from 'svelte';
	import SettingsSubpage from '$lib/components/SettingsSubpage.svelte';
	import IconCheck from '~icons/mdi/check-bold';

	const LANG_KEY = 'yada.courierLanguage';
	type Lang = 'en' | 'tw' | 'fr';

	let language = $state<Lang>('en');

	const options: { id: Lang; label: string }[] = [
		{ id: 'en', label: 'English' },
		{ id: 'tw', label: 'Twi' },
		{ id: 'fr', label: 'French' }
	];

	onMount(() => {
		const saved = localStorage.getItem(LANG_KEY);
		if (saved === 'en' || saved === 'tw' || saved === 'fr') language = saved;
	});

	function select(next: Lang) {
		language = next;
		localStorage.setItem(LANG_KEY, next);
	}
</script>

<svelte:head>
	<title>Preferred Languages | YADA Courier</title>
</svelte:head>

<SettingsSubpage title="Preferred Languages">
	<div class="overflow-hidden rounded-lg bg-surface shadow-sm">
		{#each options as option, i}
			<button
				type="button"
				class="flex w-full items-center gap-3 px-4 py-3.5 text-left {i < options.length - 1
					? 'border-b border-border'
					: ''}"
				onclick={() => select(option.id)}
			>
				<span class="flex-1 text-base font-medium text-ink">{option.label}</span>
				{#if language === option.id}
					<IconCheck class="h-5 w-5 text-primary" aria-hidden="true" />
				{/if}
			</button>
		{/each}
	</div>
	<p class="mt-3 px-1 text-xs text-ink-tertiary">
		Language preference is saved on this device. Full localization will follow.
	</p>
</SettingsSubpage>
