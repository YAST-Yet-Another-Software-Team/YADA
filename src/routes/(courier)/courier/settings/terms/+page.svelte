<script lang="ts">
	import SettingsSubpage from '$lib/components/courier/SettingsSubpage.svelte';
</script>

<svelte:head>
	<title>Terms of Service | YADA Courier</title>
</svelte:head>

<SettingsSubpage title="Terms of Service">
	<article class="rounded-2xl bg-surface p-4 shadow-sm">
		<p class="text-sm leading-relaxed text-ink-secondary">
			By using YADA as a courier, you agree to accept delivery offers only when you can complete them
			safely and on time within the service area.
		</p>
		<p class="mt-3 text-sm leading-relaxed text-ink-secondary">
			You are responsible for your vehicle, licenses, and following local traffic rules. Cancelled or
			incomplete trips may affect your ability to stay online.
		</p>
		<p class="mt-3 text-sm leading-relaxed text-ink-secondary">
			YADA may update these terms as the product evolves. Continued use after updates means you
			accept the revised terms.
		</p>
	</article>
</SettingsSubpage>
