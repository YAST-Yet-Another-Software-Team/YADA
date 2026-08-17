<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { motion } from '$lib/client/motion';
	import Alert from '$lib/components/Alert.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import RatingBadge from '$lib/components/RatingBadge.svelte';
	import Tabs from '$lib/components/Tabs.svelte';
	import LocationPickerMap from '$lib/components/LocationPickerMap.svelte';
	import { getSession } from '$auth/session.svelte';
	import { messageOf } from '$auth/errors';
	import { ProfilePhotoError, readProfilePhoto } from '$lib/client/images/profile-photo';
	import { initials } from '$lib/shared/text';
	import { KUMASI_CENTER } from '$lib/shared/geo/service-area';
	import IconCamera from '~icons/mdi/camera-outline';
	import IconMapMarker from '~icons/mdi/map-marker-outline';
	import type { LatLng } from '$lib/utils/types';

	let {
		data
	}: {
		data: {
			business: { businessName: string; address: string; lat: number; lng: number } | null;
			rating: { average: number | null; count: number };
		};
	} = $props();

	const session = getSession();

	const tabs = [
		{ value: 'profile', label: 'Profile' },
		{ value: 'location', label: 'Location' },
		{ value: 'password', label: 'Password' }
	];

	/**
	 * The tab can be named in the URL so the profile menu can link straight at
	 * one — a "Business location" item that lands on the account form and asks
	 * you to find the map yourself is a link to the wrong place. It stays a
	 * starting point rather than a binding: clicking a tab afterwards must not
	 * push history entries for what is one screen.
	 */
	function tabFromUrl() {
		const requested = page.url.searchParams.get('tab');
		return tabs.some((tab) => tab.value === requested) ? (requested as string) : 'profile';
	}

	// svelte-ignore state_referenced_locally
	let activeTab = $state(tabFromUrl());

	const requestedTab = $derived(page.url.searchParams.get('tab'));
	$effect(() => {
		// Re-run only when the URL's tab changes — arriving from the menu while
		// already on this page.
		if (requestedTab) activeTab = tabFromUrl();
	});

	const user = $derived(session.user);
	const avatarInitials = $derived(initials(user?.name, 'Y'));

	// ---------------------------------------------------------------- account

	// Seeded once, not derived: a later reload of the session must not overwrite
	// what is being typed. The same reason the courier's profile form does it.
	// svelte-ignore state_referenced_locally
	let name = $state(session.user?.name ?? '');
	// svelte-ignore state_referenced_locally
	let phone = $state(session.user?.phone ?? '');
	const email = $derived(user?.email ?? '');

	let profileError = $state('');
	let profileSaved = $state(false);

	const nameChanged = $derived(name.trim() !== (user?.name ?? ''));
	const phoneChanged = $derived(phone.trim() !== (user?.phone ?? ''));
	const canSaveProfile = $derived(name.trim().length >= 2 && (nameChanged || phoneChanged));

	async function saveProfile() {
		profileError = '';
		profileSaved = false;

		if (name.trim().length < 2) {
			profileError = 'Enter your business name.';
			return;
		}

		const renaming = nameChanged;

		try {
			await session.updateProfile({ name: name.trim(), phone: phone.trim() });

			// The trading name is stamped on the dispatch row as well — it is what
			// labels this business on a courier's map — so a rename that stopped at
			// the account would leave the two disagreeing. Only sent when the name
			// actually moved, and only meaningful once an address row exists.
			if (renaming && data.business) {
				const response = await fetch('/api/business/profile', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ businessName: name.trim() })
				});

				const payload = await response.json().catch(() => null);
				if (!response.ok) {
					profileError = payload?.message ?? 'Your name was saved, but the map label was not.';
					return;
				}

				await invalidateAll();
			}

			profileSaved = true;
		} catch (error) {
			console.error('Business profile update failed.', error);
			profileError = messageOf(error, 'Unable to save your profile.');
		}
	}

	// ------------------------------------------------------------------ photo

	let photoError = $state('');
	let photoBusy = $state(false);

	/**
	 * Saved the moment a file is chosen rather than behind the form's button:
	 * the picture is its own confirmation, and a photo sitting unsaved next to a
	 * "Save changes" that also covers the name is the kind of thing people miss.
	 */
	async function handlePhoto(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		photoBusy = true;
		photoError = '';

		try {
			await session.updatePhoto(await readProfilePhoto(file));
		} catch (error) {
			photoError =
				error instanceof ProfilePhotoError
					? error.message
					: messageOf(error, "We couldn't save that photo. Try a different one.");
		} finally {
			photoBusy = false;
			// Let the same file be chosen again after a failure.
			input.value = '';
		}
	}

	async function removePhoto() {
		photoBusy = true;
		photoError = '';

		try {
			await session.updatePhoto(null);
		} catch (error) {
			photoError = messageOf(error, 'Unable to remove your photo.');
		} finally {
			photoBusy = false;
		}
	}

	// --------------------------------------------------------------- location

	// svelte-ignore state_referenced_locally
	let point = $state<LatLng | null>(
		data.business ? { lat: data.business.lat, lng: data.business.lng } : null
	);
	// svelte-ignore state_referenced_locally
	let address = $state(data.business?.address ?? '');
	let pickerError = $state('');
	let resolving = $state(false);
	let locationError = $state('');
	let locationSaved = $state(false);
	let savingLocation = $state(false);

	const savedAddress = $derived(data.business?.address ?? '');
	const locationChanged = $derived(
		point !== null &&
			address.trim().length > 0 &&
			(address.trim() !== savedAddress ||
				point.lat !== data.business?.lat ||
				point.lng !== data.business?.lng)
	);

	async function saveLocation() {
		if (!point || !address.trim() || savingLocation) return;

		savingLocation = true;
		locationError = '';
		locationSaved = false;

		try {
			const response = await fetch('/api/business/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ address: address.trim(), lat: point.lat, lng: point.lng })
			});

			const payload = await response.json().catch(() => null);
			if (!response.ok) {
				locationError = payload?.message ?? 'Could not save your address. Try again.';
				return;
			}

			// Every screen that leaves from here — the dashboard map, the request
			// form's pickup — reads the row through `load`, so they are refetched
			// rather than left showing the old address until a reload.
			await invalidateAll();
			locationSaved = true;
		} catch {
			locationError = 'Could not save your address. Check your connection and try again.';
		} finally {
			savingLocation = false;
		}
	}

	// --------------------------------------------------------------- password

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordError = $state('');
	let passwordSaved = $state(false);

	const canSavePassword = $derived(
		currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword
	);

	async function savePassword() {
		passwordError = '';
		passwordSaved = false;

		if (newPassword.length < 8) {
			passwordError = 'New password must be at least 8 characters.';
			return;
		}
		if (newPassword !== confirmPassword) {
			passwordError = 'New passwords do not match.';
			return;
		}

		try {
			await session.changePassword(currentPassword, newPassword);
			passwordSaved = true;
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		} catch (error) {
			console.error('Password change failed.', error);
			passwordError = messageOf(error, 'Unable to change password.');
		}
	}
</script>

<svelte:head>
	<title>Account | YADA Business</title>
</svelte:head>

<!-- One centred column the whole way down. The workspace canvas is as wide as a
     dashboard needs; an account page is a stack of short forms, and reading
     those across 1280px is worse than reading them across 640. Every panel
     below shares this width so the tabs don't resize the page as they switch. -->
<div class="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 lg:py-8">
	<header class="flex flex-col items-center gap-3 text-center">
		<Avatar initials={avatarInitials} src={user?.image ?? null} alt="" size={72} />
		<div class="min-w-0 max-w-full">
			<h1 class="truncate text-xl font-bold tracking-tight text-ink lg:text-2xl">
				{user?.name || 'Your business'}
			</h1>
			<p class="truncate text-sm text-ink-secondary">
				{data.business?.address ?? 'No dispatch address set yet'}
			</p>
		</div>
	</header>

	<Tabs {tabs} bind:active={activeTab} />

	{#if activeTab === 'profile'}
		<div
			class="flex flex-col gap-5"
			in:fly={motion({ y: 10, duration: 260, easing: cubicOut })}
		>
			<!-- Photo. Its own card because it saves on its own. -->
			<section class="rounded-lg border border-border bg-surface p-5 shadow-xs">
				<h2 class="text-base font-semibold text-ink">Profile photo</h2>
				<p class="mt-1 text-sm text-ink-secondary">
					Couriers see this when they pick up from you, so they know they are at the right counter.
				</p>

				<div class="mt-4 flex flex-wrap items-center gap-4">
					<Avatar initials={avatarInitials} src={user?.image ?? null} alt="" size={80} />

					<div class="flex flex-wrap items-center gap-2">
						<label
							class="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-wash"
						>
							<input
								type="file"
								accept="image/*"
								class="sr-only"
								disabled={photoBusy}
								onchange={handlePhoto}
							/>
							<IconCamera class="h-4 w-4" aria-hidden="true" />
							{photoBusy ? 'Saving…' : user?.image ? 'Change photo' : 'Add a photo'}
						</label>

						{#if user?.image}
							<Button variant="outline" size="sm" disabled={photoBusy} onclick={removePhoto}>
								Remove
							</Button>
						{/if}
					</div>
				</div>

				{#if photoError}
					<div class="mt-3"><Alert>{photoError}</Alert></div>
				{/if}
			</section>

			<!-- What riders make of delivering here (SRS 3.4). Read-only, and above
			     the editable fields because it is the one thing on this tab the
			     business cannot change about itself. -->
			<div
				class="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-5 shadow-xs"
			>
				<div class="min-w-0">
					<h2 class="text-base font-semibold text-ink">Rider rating</h2>
					<p class="mt-1 text-sm text-ink-secondary">
						How riders scored their deliveries for you.
					</p>
				</div>
				<RatingBadge
					average={data.rating.average}
					count={data.rating.count}
					emptyLabel="No ratings yet"
				/>
			</div>

			<!-- Account details -->
			<form
				class="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-xs"
				onsubmit={(e) => {
					e.preventDefault();
					void saveProfile();
				}}
			>
				<div>
					<h2 class="text-base font-semibold text-ink">Business details</h2>
					<p class="mt-1 text-sm text-ink-secondary">
						The name here is what couriers and your own dashboard show.
					</p>
				</div>

				<Input label="Business name" type="text" placeholder="Favorie Kitchen" bind:value={name} />
				<Input label="Phone number" type="tel" placeholder="024 123 4567" bind:value={phone} />
				<div>
					<Input label="Email" type="email" value={email} disabled />
					<p class="mt-1.5 text-xs text-ink-tertiary">
						Email can’t be changed here. Contact support if you need to update it.
					</p>
				</div>

				{#if profileError}
					<Alert>{profileError}</Alert>
				{/if}
				{#if profileSaved}
					<Alert variant="success">Profile saved.</Alert>
				{/if}

				<div>
					<Button
						type="submit"
						variant="primary"
						disabled={!canSaveProfile || session.isLoading}
					>
						{session.isLoading ? 'Saving…' : 'Save changes'}
					</Button>
				</div>
			</form>
		</div>
	{:else if activeTab === 'location'}
		<div
			class="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-xs"
			in:fly={motion({ y: 10, duration: 260, easing: cubicOut })}
		>
			<div>
				<h2 class="text-base font-semibold text-ink">Dispatch address</h2>
				<p class="mt-1 text-sm text-ink-secondary">
					Every delivery leaves from here. Search for the address or tap the map, then save.
				</p>
			</div>

			{#if data.business}
				<p class="flex items-start gap-2 rounded-md bg-surface-sunken px-3 py-2.5 text-sm text-ink">
					<IconMapMarker class="mt-0.5 h-4 w-4 shrink-0 text-ink-tertiary" aria-hidden="true" />
					<span><span class="font-semibold">Current:</span> {data.business.address}</span>
				</p>
			{:else}
				<Alert variant="info">
					No address on file yet — set one so requests know where to send a rider.
				</Alert>
			{/if}

			<!-- `relative`, because the picker fills its positioned parent and hangs
			     its search bar over the map. Height rather than aspect ratio: the
			     search field sits inside that box, and a fixed ratio squeezes the
			     map itself on a phone. -->
			<div
				class="relative h-[26rem] overflow-hidden rounded-md border border-border sm:h-[30rem]"
			>
				<LocationPickerMap
					bind:point
					bind:address
					bind:error={pickerError}
					bind:resolving
					markerLabel="Your business"
					markerRole="business"
					initialCenter={point ?? KUMASI_CENTER}
					searchPlaceholder="Search your shop's address"
					showLocateButton
					locateLabel="I'm here now"
				/>
			</div>

			{#if pickerError}
				<Alert>{pickerError}</Alert>
			{/if}
			{#if locationError}
				<Alert>{locationError}</Alert>
			{/if}
			{#if locationSaved}
				<Alert variant="success">Dispatch address updated.</Alert>
			{/if}

			<div>
				<Button
					variant="primary"
					disabled={!locationChanged || savingLocation || resolving}
					onclick={saveLocation}
				>
					{savingLocation ? 'Saving…' : 'Save address'}
				</Button>
			</div>
		</div>
	{:else}
		<form
			class="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-xs"
			in:fly={motion({ y: 10, duration: 260, easing: cubicOut })}
			onsubmit={(e) => {
				e.preventDefault();
				void savePassword();
			}}
		>
			<div>
				<h2 class="text-base font-semibold text-ink">Change password</h2>
				<p class="mt-1 text-sm text-ink-secondary">
					You stay signed in on this device after changing it.
				</p>
			</div>

			<Input
				label="Current password"
				type="password"
				placeholder="Enter current password"
				autocomplete="current-password"
				bind:value={currentPassword}
			/>
			<Input
				label="New password"
				type="password"
				placeholder="At least 8 characters"
				autocomplete="new-password"
				bind:value={newPassword}
			/>
			<Input
				label="Confirm new password"
				type="password"
				placeholder="Re-enter new password"
				autocomplete="new-password"
				bind:value={confirmPassword}
			/>

			{#if passwordError}
				<Alert>{passwordError}</Alert>
			{/if}
			{#if passwordSaved}
				<Alert variant="success">Password updated.</Alert>
			{/if}

			<div>
				<Button
					type="submit"
					variant="primary"
					disabled={!canSavePassword || session.isLoading}
				>
					{session.isLoading ? 'Updating…' : 'Update password'}
				</Button>
			</div>
		</form>
	{/if}
</div>
