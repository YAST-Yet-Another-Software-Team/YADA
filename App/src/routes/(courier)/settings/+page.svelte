<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import { getSession } from '$auth/session.svelte';
	import IconBell from '~icons/mdi/bell-outline';
	import IconTheme from '~icons/mdi/theme-light-dark';
	import IconTranslate from '~icons/mdi/translate';
	import IconShieldCheck from '~icons/mdi/shield-check-outline';
	import IconDocument from '~icons/mdi/file-document-outline';
	import IconFeedback from '~icons/mdi/message-outline';
	import IconInfo from '~icons/mdi/information-outline';
	import IconChevronRight from '~icons/mdi/chevron-right';
	import { getCourierOnline } from '../courier-online.svelte';

	const session = getSession();
	const online = getCourierOnline();

	const THEME_KEY = 'yada.courierTheme';
	const LANG_KEY = 'yada.courierLanguage';

	let themeLabel = $state('System');
	let languageLabel = $state('English');

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
		online.goOffline();
		void session.signOut('/');
	}
</script>

<svelte:head>
	<title>App Settings | YADA Courier</title>
</svelte:head>

<div class="flex flex-1 flex-col bg-surface-sunken">
	<header class="px-4 pb-2 pt-4 text-center">
		<h1 class="text-lg font-bold text-ink">App Settings</h1>
	</header>

	<div class="flex flex-1 flex-col gap-5 px-4 pb-6 pt-2">
		<section>
			<h2 class="mb-2 px-1 text-eyebrow font-bold text-ink-tertiary">
				General
			</h2>
			<div class="overflow-hidden rounded-lg bg-surface shadow-sm">
				<a href="/settings/notifications" class="settings-row">
					<span class="settings-icon" aria-hidden="true">
						<IconBell class="h-[22px] w-[22px]" />
					</span>
					<span class="settings-label">Notification Settings</span>
					<span class="settings-chevron" aria-hidden="true">
						<IconChevronRight class="h-5 w-5" />
					</span>
				</a>
				<a href="/settings/theme" class="settings-row">
					<span class="settings-icon" aria-hidden="true">
						<IconTheme class="h-[22px] w-[22px]" />
					</span>
					<span class="settings-label">Theme</span>
					<span class="settings-value">{themeLabel}</span>
					<span class="settings-chevron" aria-hidden="true">
						<IconChevronRight class="h-5 w-5" />
					</span>
				</a>
				<a href="/settings/languages" class="settings-row settings-row-last">
					<span class="settings-icon" aria-hidden="true">
						<IconTranslate class="h-[22px] w-[22px]" />
					</span>
					<span class="settings-label">Preferred Languages</span>
					<span class="settings-value">{languageLabel}</span>
					<span class="settings-chevron" aria-hidden="true">
						<IconChevronRight class="h-5 w-5" />
					</span>
				</a>
			</div>
		</section>

		<section>
			<h2 class="mb-2 px-1 text-eyebrow font-bold text-ink-tertiary">
				Privacy
			</h2>
			<div class="overflow-hidden rounded-lg bg-surface shadow-sm">
				<a href="/settings/privacy" class="settings-row">
					<span class="settings-icon" aria-hidden="true">
						<IconShieldCheck class="h-[22px] w-[22px]" />
					</span>
					<span class="settings-label">Privacy Policy</span>
					<span class="settings-chevron" aria-hidden="true">
						<IconChevronRight class="h-5 w-5" />
					</span>
				</a>
				<a href="/settings/terms" class="settings-row settings-row-last">
					<span class="settings-icon" aria-hidden="true">
						<IconDocument class="h-[22px] w-[22px]" />
					</span>
					<span class="settings-label">Terms of Service</span>
					<span class="settings-chevron" aria-hidden="true">
						<IconChevronRight class="h-5 w-5" />
					</span>
				</a>
			</div>
		</section>

		<section>
			<h2 class="mb-2 px-1 text-eyebrow font-bold text-ink-tertiary">
				About
			</h2>
			<div class="overflow-hidden rounded-lg bg-surface shadow-sm">
				<a href="/settings/feedback" class="settings-row">
					<span class="settings-icon" aria-hidden="true">
						<IconFeedback class="h-[22px] w-[22px]" />
					</span>
					<span class="settings-label">Feedback</span>
					<span class="settings-chevron" aria-hidden="true">
						<IconChevronRight class="h-5 w-5" />
					</span>
				</a>
				<a href="/settings/about" class="settings-row settings-row-last">
					<span class="settings-icon" aria-hidden="true">
						<IconInfo class="h-[22px] w-[22px]" />
					</span>
					<span class="settings-label">About Us</span>
					<span class="settings-chevron" aria-hidden="true">
						<IconChevronRight class="h-5 w-5" />
					</span>
				</a>
			</div>
		</section>

		<div class="mt-auto pt-2">
			<Button variant="neutral" fullWidth onclick={signOut}>Sign out</Button>
		</div>
	</div>
</div>

<style>
	.settings-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		border-bottom: 1px solid var(--color-border);
		color: inherit;
		text-decoration: none;
		background: transparent;
		transition: background-color var(--duration-fast) var(--ease-standard);
	}

	.settings-row:active,
	.settings-row:hover {
		background: color-mix(in oklab, var(--color-text-primary) 4%, transparent);
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
		color: var(--color-text-primary);
	}

	.settings-label {
		flex: 1;
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.settings-value {
		font-size: 0.8125rem;
		color: var(--color-text-tertiary);
	}

	.settings-chevron {
		display: inline-flex;
		color: var(--color-text-tertiary);
	}
</style>
