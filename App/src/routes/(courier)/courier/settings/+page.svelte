<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { auth } from '$lib/stores/auth';
	import { courierOnline } from '$lib/stores/courier-online';

	const THEME_KEY = 'yada.courierTheme';
	const LANG_KEY = 'yada.courierLanguage';

	let themeLabel = 'System';
	let languageLabel = 'English';

	onMount(() => {
		const theme = localStorage.getItem(THEME_KEY);
		const lang = localStorage.getItem(LANG_KEY);
		if (theme === 'light') themeLabel = 'Light';
		else if (theme === 'dark') themeLabel = 'Dark';
		else themeLabel = 'System';
		if (lang === 'tw') languageLabel = 'Twi';
		else if (lang === 'fr') languageLabel = 'French';
		else languageLabel = 'English';
	});

	function signOut() {
		courierOnline.goOffline();
		void auth.signOut('/');
	}
</script>

<svelte:head>
	<title>App Settings | YADA Courier</title>
</svelte:head>

<div class="flex flex-1 flex-col bg-neutral-100">
	<header class="px-4 pb-2 pt-4 text-center">
		<h1 class="text-lg font-bold text-ink">App Settings</h1>
	</header>

	<div class="flex flex-1 flex-col gap-5 px-4 pb-6 pt-2">
		<section>
			<h2 class="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-tertiary">
				General
			</h2>
			<div class="overflow-hidden rounded-2xl bg-surface shadow-sm">
				<a href="/courier/settings/notifications" class="settings-row">
					<span class="settings-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.75"
							><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /><circle
								cx="18"
								cy="6"
								r="2.5"
							/></svg
						>
					</span>
					<span class="settings-label">Notification Settings</span>
					<span class="settings-chevron" aria-hidden="true">
						<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"
							><path d="m9 18 6-6-6-6" /></svg
						>
					</span>
				</a>
				<a href="/courier/settings/theme" class="settings-row">
					<span class="settings-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.75"
							><circle cx="12" cy="12" r="9" /><path d="M12 3v18" /><path
								d="M12 3a9 9 0 0 1 0 18"
								fill="currentColor"
								opacity="0.2"
							/></svg
						>
					</span>
					<span class="settings-label">Theme</span>
					<span class="settings-value">{themeLabel}</span>
					<span class="settings-chevron" aria-hidden="true">
						<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"
							><path d="m9 18 6-6-6-6" /></svg
						>
					</span>
				</a>
				<a href="/courier/settings/languages" class="settings-row settings-row-last">
					<span class="settings-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.75"
							><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /><path
								d="M9 9h.01M13 9h2M9 13h6"
							/></svg
						>
					</span>
					<span class="settings-label">Preferred Languages</span>
					<span class="settings-value">{languageLabel}</span>
					<span class="settings-chevron" aria-hidden="true">
						<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"
							><path d="m9 18 6-6-6-6" /></svg
						>
					</span>
				</a>
			</div>
		</section>

		<section>
			<h2 class="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-tertiary">
				Privacy
			</h2>
			<div class="overflow-hidden rounded-2xl bg-surface shadow-sm">
				<a href="/courier/settings/privacy" class="settings-row">
					<span class="settings-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.75"
							><path d="M12 3 4 7v5c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7l-8-4Z" /><path d="m9 12 2 2 4-4" /></svg
						>
					</span>
					<span class="settings-label">Privacy Policy</span>
					<span class="settings-chevron" aria-hidden="true">
						<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"
							><path d="m9 18 6-6-6-6" /></svg
						>
					</span>
				</a>
				<a href="/courier/settings/terms" class="settings-row settings-row-last">
					<span class="settings-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.75"
							><path d="M8 3h7l5 5v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path
								d="M15 3v5h5M9 13h6M9 17h6"
							/></svg
						>
					</span>
					<span class="settings-label">Terms of Service</span>
					<span class="settings-chevron" aria-hidden="true">
						<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"
							><path d="m9 18 6-6-6-6" /></svg
						>
					</span>
				</a>
			</div>
		</section>

		<section>
			<h2 class="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-tertiary">
				About
			</h2>
			<div class="overflow-hidden rounded-2xl bg-surface shadow-sm">
				<a href="/courier/settings/feedback" class="settings-row">
					<span class="settings-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.75"
							><path d="M21 11a8 8 0 0 1-8 8H7l-4 3V9a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" /></svg
						>
					</span>
					<span class="settings-label">Feedback</span>
					<span class="settings-chevron" aria-hidden="true">
						<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"
							><path d="m9 18 6-6-6-6" /></svg
						>
					</span>
				</a>
				<a href="/courier/settings/about" class="settings-row settings-row-last">
					<span class="settings-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.75"
							><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg
						>
					</span>
					<span class="settings-label">About Us</span>
					<span class="settings-chevron" aria-hidden="true">
						<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"
							><path d="m9 18 6-6-6-6" /></svg
						>
					</span>
				</a>
			</div>
		</section>

		<div class="mt-auto pt-2">
			<Button variant="ghost" fullWidth on:click={signOut}>Sign out</Button>
		</div>
	</div>
</div>

<style>
	.settings-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		border-bottom: 1px solid var(--color-border, #e5e7eb);
		color: inherit;
		text-decoration: none;
		background: transparent;
		transition: background-color 0.15s ease;
	}

	.settings-row:active,
	.settings-row:hover {
		background: color-mix(in srgb, var(--color-ink, #111) 4%, transparent);
	}

	.settings-row-last {
		border-bottom: none;
	}

	.settings-icon {
		display: inline-flex;
		height: 1.75rem;
		width: 1.75rem;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		color: var(--color-ink, #111);
	}

	.settings-label {
		flex: 1;
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--color-ink, #111);
	}

	.settings-value {
		font-size: 0.8125rem;
		color: var(--color-ink-tertiary, #9ca3af);
	}

	.settings-chevron {
		display: inline-flex;
		color: var(--color-ink-tertiary, #9ca3af);
	}
</style>
