<script lang="ts">
	import { onMount } from 'svelte';
	import { readTheme, setTheme, type Theme } from '$lib/client/theme';
	import IconAuto from '~icons/mdi/theme-light-dark';
	import IconLight from '~icons/mdi/white-balance-sunny';
	import IconDark from '~icons/mdi/moon-waning-crescent';

	/**
	 * The theme switch, for chrome that has no settings page behind it.
	 *
	 * It matters that `system` is offered and not just a light/dark flip: the
	 * choice is written to localStorage and read back before first paint on every
	 * later visit (see src/app.html), so a two-state toggle would leave a visitor
	 * who once tapped "Light" pinned to it forever, with the OS setting silently
	 * ignored. Picking `system` is the only way back out.
	 */

	let { compact = false }: { compact?: boolean } = $props();

	// Starts at `system` and corrects on mount, because there is no localStorage
	// during SSR — rendering a guess as "selected" would flicker onto the real
	// answer at hydration.
	let theme = $state<Theme>('system');
	let mounted = $state(false);

	onMount(() => {
		theme = readTheme();
		mounted = true;
	});

	const options: { id: Theme; label: string; icon: typeof IconAuto }[] = [
		{ id: 'system', label: 'System', icon: IconAuto },
		{ id: 'light', label: 'Light', icon: IconLight },
		{ id: 'dark', label: 'Dark', icon: IconDark }
	];

	function select(next: Theme) {
		theme = next;
		setTheme(next);
	}
</script>

<div
	class="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface-sunken p-0.5"
	role="group"
	aria-label="Appearance"
>
	{#each options as option}
		{@const active = mounted && theme === option.id}
		<button
			type="button"
			aria-pressed={active}
			title={option.label}
			onclick={() => select(option.id)}
			class="inline-flex items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-xs font-semibold transition duration-200 {active
				? 'bg-surface text-ink shadow-xs'
				: 'text-ink-tertiary hover:text-ink-secondary'}"
		>
			<option.icon class="h-4 w-4" aria-hidden="true" />
			{#if !compact}
				<span>{option.label}</span>
			{:else}
				<span class="sr-only">{option.label}</span>
			{/if}
		</button>
	{/each}
</div>
