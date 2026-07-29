<script lang="ts">
	import SettingsSubpage from '$lib/components/courier/SettingsSubpage.svelte';

	let offers = true;
	let status = true;
	let tips = false;
</script>

<svelte:head>
	<title>Notification Settings | YADA Courier</title>
</svelte:head>

<SettingsSubpage title="Notification Settings">
	<div class="overflow-hidden rounded-2xl bg-surface shadow-sm">
		<label class="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
			<span>
				<span class="block text-[15px] font-medium text-ink">Delivery offers</span>
				<span class="mt-0.5 block text-xs text-ink-tertiary">New nearby requests</span>
			</span>
			<input type="checkbox" class="toggle" bind:checked={offers} />
		</label>
		<label class="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
			<span>
				<span class="block text-[15px] font-medium text-ink">Trip updates</span>
				<span class="mt-0.5 block text-xs text-ink-tertiary">Pickup and delivery status</span>
			</span>
			<input type="checkbox" class="toggle" bind:checked={status} />
		</label>
		<label class="flex items-center justify-between gap-3 px-4 py-3.5">
			<span>
				<span class="block text-[15px] font-medium text-ink">Tips & promotions</span>
				<span class="mt-0.5 block text-xs text-ink-tertiary">Occasional product news</span>
			</span>
			<input type="checkbox" class="toggle" bind:checked={tips} />
		</label>
	</div>
</SettingsSubpage>

<style>
	.toggle {
		width: 2.75rem;
		height: 1.625rem;
		appearance: none;
		border-radius: 999px;
		background: #d1d5db;
		position: relative;
		transition: background 0.2s ease;
		cursor: pointer;
		flex-shrink: 0;
	}

	.toggle::after {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 999px;
		background: white;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
		transition: transform 0.2s ease;
	}

	.toggle:checked {
		background: var(--color-primary, #e11d48);
	}

	.toggle:checked::after {
		transform: translateX(1.125rem);
	}
</style>
