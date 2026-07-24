<script lang="ts">
	import SettingsSubpage from '$lib/components/courier/SettingsSubpage.svelte';
</script>

<svelte:head>
	<title>About Us | YADA Courier</title>
</svelte:head>

<SettingsSubpage title="About Us">
	<article class="rounded-2xl bg-surface p-4 shadow-sm">
		<p class="text-base font-semibold text-ink">YADA</p>
		<p class="mt-1 text-sm text-ink-tertiary">Courier · Favorie delivery</p>
		<p class="mt-3 text-sm leading-relaxed text-ink-secondary">
			YADA connects local businesses with nearby riders for fast, reliable deliveries around KNUST
			and Ayeduase.
		</p>
		<p class="mt-3 text-xs text-ink-tertiary">Version 0.1.0</p>
	</article>
</SettingsSubpage>
