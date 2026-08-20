<script lang="ts">
	import { onMount } from 'svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Button from '$lib/components/Button.svelte';
	import DeleteAccountCard from '$lib/components/DeleteAccountCard.svelte';
	import { getSession } from '$auth/session.svelte';
	import { initials } from '$lib/shared/text';
	import IconAccount from '~icons/mdi/account-outline';
	import IconPhone from '~icons/mdi/phone-outline';
	import IconMail from '~icons/mdi/email-outline';
	import IconPlate from '~icons/mdi/card-text-outline';
	import IconBell from '~icons/mdi/bell-outline';
	import IconTheme from '~icons/mdi/theme-light-dark';
	import IconTranslate from '~icons/mdi/translate';
	import IconShieldCheck from '~icons/mdi/shield-check-outline';
	import IconDocument from '~icons/mdi/file-document-outline';
	import IconFeedback from '~icons/mdi/message-outline';
	import IconInfo from '~icons/mdi/information-outline';
	import IconChevronRight from '~icons/mdi/chevron-right';
	import { getCourierOnline } from '../courier-online.svelte';

	let {
		data
	}: { data: { courierProfile: { vehicleType: string; plateNumber: string | null } } } = $props();

	const session = getSession();
	const online = getCourierOnline();

	// The account, which used to be a tab of its own. It is the same handful of
	// fields the settings rows below are made of, so it reads as the first
	// section of this screen rather than a second destination in the tab bar.
	const user = $derived(session.user);
	const avatarInitials = $derived(initials(user?.name, 'C'));
	const profileName = $derived(user?.name || 'Courier');
	const profileEmail = $derived(user?.email || 'No email on file');
	const profilePhone = $derived(user?.phone || 'No phone on file');
	/**
	 * The bike, as anyone else identifies it. The vehicle *type* is the same for
	 * every courier on YADA, so the plate is the only part of it worth a row —
	 * and the only part a business can check when a rider pulls up.
	 */
	const plate = $derived(data.courierProfile.plateNumber);

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

	/**
	 * Clearing the stored flag is all this has left to do: the server action
	 * marks the courier inactive and ends the session. Without it the next
	 * account signed in on this phone would inherit "online" from localStorage.
	 */
	function forgetShift() {
		online.goOffline();
	}
</script>

<svelte:head>
	<title>Profile & Settings | YADA Courier</title>
</svelte:head>

<!-- The screen names itself in the layout's title bar. -->
<div class="flex flex-1 flex-col bg-surface-sunken">
	<div class="flex flex-1 flex-col gap-5 px-4 pb-6 pt-4">
		<!-- Who you are, first: name, shift state, and the way in to change either
		     the details or the password. -->
		<section class="rounded-lg bg-surface p-4 shadow-sm">
			<div class="flex items-center gap-3">
				<Avatar
					initials={avatarInitials}
					src={user?.image ?? null}
					alt={profileName}
					size={56}
					status={online.online ? 'online' : null}
				/>
				<div class="min-w-0 flex-1">
					<p class="truncate text-lg font-semibold text-ink">{profileName}</p>
					<p class="text-sm text-ink-secondary">
						{#if plate}<span class="font-mono-data">{plate}</span>{:else}Courier{/if} ·
						<span class={online.online ? 'font-semibold text-success' : 'text-ink-tertiary'}>
							{online.online ? 'Online' : 'Offline'}
						</span>
					</p>
				</div>
				<a
					href="/settings/profile"
					class="shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:bg-wash"
				>
					Edit
				</a>
			</div>
		</section>

		<section>
			<h2 class="mb-2 px-1 text-eyebrow font-bold text-ink-tertiary">Account</h2>
			<div class="overflow-hidden rounded-lg bg-surface shadow-sm">
				<a href="/settings/profile" class="settings-row">
					<span class="settings-icon" aria-hidden="true">
						<IconAccount class="h-[22px] w-[22px]" />
					</span>
					<span class="settings-label">Name & password</span>
					<span class="settings-chevron" aria-hidden="true">
						<IconChevronRight class="h-5 w-5" />
					</span>
				</a>
				<!-- Read-only rows: these are facts about the account, and the one
				     place they can be changed is the row above. -->
				<div class="settings-row">
					<span class="settings-icon" aria-hidden="true">
						<IconPhone class="h-[22px] w-[22px]" />
					</span>
					<span class="settings-label">Phone</span>
					<span class="settings-value">{profilePhone}</span>
				</div>
				<div class="settings-row">
					<span class="settings-icon" aria-hidden="true">
						<IconMail class="h-[22px] w-[22px]" />
					</span>
					<span class="settings-label">Email</span>
					<span class="settings-value">{profileEmail}</span>
				</div>
				<a href="/settings/profile" class="settings-row settings-row-last">
					<span class="settings-icon" aria-hidden="true">
						<IconPlate class="h-[22px] w-[22px]" />
					</span>
					<span class="settings-label">Number plate</span>
					<span class="settings-value {plate ? 'font-mono-data' : ''}">
						{plate ?? 'Not set'}
					</span>
					<span class="settings-chevron" aria-hidden="true">
						<IconChevronRight class="h-5 w-5" />
					</span>
				</a>
			</div>
		</section>

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

		<!-- A real form post, not a fetch: the server action clocks the rider off,
		     deletes the session row and clears the cookie on a navigation the
		     browser has to apply, then lands on /auth. -->
		<form method="POST" action="/auth?/signout" class="mt-auto pt-2" onsubmit={forgetShift}>
			<Button type="submit" variant="outline" fullWidth>Sign out</Button>
		</form>

		<!-- Last on the screen, below signing out: the order is the point. The
		     only route to closing an account is this card, on a settings screen
		     behind the workspace gate. -->
		<DeleteAccountCard email={user?.email ?? null} />
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
		/* An account row's value can be a long email; it gives way to the label
		   rather than pushing into it. */
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.settings-label {
		min-width: 0;
	}

	.settings-chevron {
		display: inline-flex;
		color: var(--color-text-tertiary);
	}
</style>
