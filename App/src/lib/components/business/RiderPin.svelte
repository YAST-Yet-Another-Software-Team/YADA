<script lang="ts">
	/** Motorcycle / scooter pin — Bolt-style rider mark for map overlays */
	export let size = 36;
	export let label = 'Rider';
	export let accent = false;
</script>

<div class="relative flex flex-col items-center" style="width:{size + 8}px" title={label}>
	<div
		class="flex items-center justify-center rounded-full border-2 border-surface shadow-sm {accent
			? 'bg-secondary'
			: 'bg-primary'}"
		style="width:{size}px;height:{size}px"
	>
		<!-- Lucide-style bike / motor icon -->
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="text-primary-on"
			style="width:{size * 0.55}px;height:{size * 0.55}px"
			aria-hidden="true"
		>
			<circle cx="18.5" cy="17.5" r="3.5" />
			<circle cx="5.5" cy="17.5" r="3.5" />
			<circle cx="15" cy="5" r="1" />
			<path d="M12 17.5V14l-3-3 4-3 2 3h2" />
		</svg>
	</div>
	<span
		class="mt-0.5 max-w-[5.5rem] truncate rounded bg-surface/95 px-1 text-center text-[10px] font-semibold leading-tight text-ink shadow-xs"
	>
		{label}
	</span>
</div>
