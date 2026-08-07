<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconChevronLeft from '~icons/mdi/chevron-left';

	let {
		title,
		backHref = '/settings',
		children
	}: {
		title: string;
		backHref?: string;
		children?: Snippet;
	} = $props();
</script>

<div class="flex flex-1 flex-col bg-surface-sunken">
	<header class="relative flex items-center justify-center px-4 pb-2 pt-4">
		<a
			href={backHref}
			class="absolute left-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink shadow-sm"
			aria-label="Back to settings"
		>
			<IconChevronLeft class="h-6 w-6" aria-hidden="true" />
		</a>
		<h1 class="text-lg font-bold text-ink">{title}</h1>
	</header>
	<div class="flex flex-1 flex-col px-4 pb-6 pt-2">
		{@render children?.()}
	</div>
</div>
