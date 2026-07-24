<script lang="ts">
	export let title: string;
	export let backHref = '/courier/settings';
</script>

<div class="flex flex-1 flex-col bg-neutral-100">
	<header class="relative flex items-center justify-center px-4 pb-2 pt-4">
		<a
			href={backHref}
			class="absolute left-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink shadow-sm"
			aria-label="Back to settings"
		>
			<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2"
				><path d="m15 18-6-6 6-6" /></svg
			>
		</a>
		<h1 class="text-lg font-bold text-ink">{title}</h1>
	</header>
	<div class="flex flex-1 flex-col px-4 pb-6 pt-2">
		<slot />
	</div>
</div>
