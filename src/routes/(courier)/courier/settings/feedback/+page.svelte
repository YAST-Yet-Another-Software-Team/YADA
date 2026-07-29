<script lang="ts">
	import SettingsSubpage from '$lib/components/courier/SettingsSubpage.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let message = '';
	let sent = false;

	function submit() {
		if (!message.trim()) return;
		sent = true;
		message = '';
	}
</script>

<svelte:head>
	<title>Feedback | YADA Courier</title>
</svelte:head>

<SettingsSubpage title="Feedback">
	{#if sent}
		<div class="rounded-2xl bg-surface p-4 text-sm text-ink-secondary shadow-sm">
			Thanks — your feedback was saved on this device. We’ll wire this to support soon.
		</div>
	{:else}
		<div class="rounded-2xl bg-surface p-4 shadow-sm">
			<label class="block text-sm font-medium text-ink" for="feedback">
				Tell us what to improve
			</label>
			<textarea
				id="feedback"
				bind:value={message}
				rows="5"
				class="mt-2 w-full resize-none rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
				placeholder="Ideas, bugs, or delivery experience notes…"
			></textarea>
			<div class="mt-3">
				<Button variant="primary" fullWidth disabled={!message.trim()} on:click={submit}>
					Send feedback
				</Button>
			</div>
		</div>
	{/if}
</SettingsSubpage>
