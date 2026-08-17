<script lang="ts">
	import { goto } from '$app/navigation';
	import Alert from '$lib/components/Alert.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import Tabs from '$lib/components/Tabs.svelte';
	import SettingsSubpage from '$lib/components/SettingsSubpage.svelte';
	import { getSession } from '$auth/session.svelte';
	import { messageOf } from '$auth/errors';
	import { ProfilePhotoError, readProfilePhoto } from '$lib/client/images/profile-photo';
	import { initials } from '$lib/shared/text';
	import { formatPhone, maskPhone, normalisePhone } from '$lib/shared/phone';
	import { formatPlate, maskPlate, normalisePlate } from '$lib/shared/plate';
	import IconCamera from '~icons/mdi/camera-outline';

	let {
		data
	}: { data: { courierProfile: { vehicleType: string; plateNumber: string | null } } } = $props();

	const editTabs = [
		{ value: 'profile', label: 'Profile' },
		{ value: 'password', label: 'Password' }
	];

	// The root layout provides the session before this page initialises, and the
	// courier layout guard guarantees there is a signed-in user by the time we get here.
	const session = getSession();
	const currentUser = session.user;

	let activeTab = $state('profile');
	let name = $state(currentUser?.name ?? '');
	let phone = $state(formatPhone(currentUser?.phone ?? ''));
	let email = $state(currentUser?.email ?? '');
	// Lives on `courier_profiles`, not the account, so it saves through the
	// courier profile endpoint alongside the Better Auth call below. Seeded once,
	// like the fields above it: a later reload of `data` must not overwrite what
	// the rider is in the middle of typing.
	// svelte-ignore state_referenced_locally
	let plate = $state(formatPlate(data.courierProfile.plateNumber ?? ''));
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let saved = $state(false);
	let ready = $state(currentUser !== null);

	// The photo saves the moment one is chosen rather than behind the button
	// below: the picture is its own confirmation, and it is the one field here
	// that a business sees before the rider arrives.
	const avatarInitials = $derived(initials(session.user?.name, 'C'));
	let photoError = $state('');
	let photoBusy = $state(false);

	async function handlePhoto(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		photoBusy = true;
		photoError = '';

		try {
			await session.updatePhoto(await readProfilePhoto(file));
		} catch (err) {
			photoError =
				err instanceof ProfilePhotoError
					? err.message
					: messageOf(err, "We couldn't save that photo. Try a different one.");
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
		} catch (err) {
			photoError = messageOf(err, 'Unable to remove your photo.');
		} finally {
			photoBusy = false;
		}
	}

	// Through the same rule as the field, because a plate saved before the format
	// existed is stored unshaped — `GT4521-20` against a field reading
	// `GT 4521-20` is the same plate, and must not read as an edit.
	const savedPlate = $derived(normalisePlate(data.courierProfile.plateNumber) ?? '');

	// Both fields are compared as they are *stored*, not as they are shown. The
	// grouping means a field nobody touched no longer matches the column it came
	// from, and Save would sit lit for the whole visit. `normalisePlate` is also
	// the real rule — this used to re-implement half of it, without the
	// whitespace collapse, so `GT  4521-20` read as dirty forever.
	const canSaveProfile = $derived(
		ready &&
			name.trim().length > 0 &&
			(name.trim() !== (session.user?.name ?? '') ||
				normalisePhone(phone) !== (session.user?.phone ?? '') ||
				(normalisePlate(plate) ?? '') !== savedPlate)
	);

	const canSavePassword = $derived(
		currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword
	);

	async function saveProfile() {
		error = '';
		saved = false;
		if (!name.trim()) {
			error = 'Name is required.';
			return;
		}

		try {
			// Normalised here rather than server-side: this posts to Better Auth's
			// own update endpoint, which never runs the `phoneNumber` schema, so
			// the grouping would otherwise be stored verbatim.
			await session.updateProfile({ name: name.trim(), phone: normalisePhone(phone) });

			// The plate is not part of the account, so it takes a second call.
			// Errors from it are shown rather than swallowed: a rider who thinks
			// they saved a plate they didn't is one a business can't identify.
			const response = await fetch('/api/courier/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				// `normalisePlate` returns null for a cleared field; the endpoint
				// reads an empty string as "clear this", so that is what it gets.
				body: JSON.stringify({ plateNumber: normalisePlate(plate) ?? '' })
			});

			const payload = await response.json().catch(() => null);
			if (!response.ok) {
				error = payload?.message ?? 'Unable to save your number plate.';
				return;
			}

			saved = true;
			setTimeout(() => {
				goto('/settings');
			}, 600);
		} catch (err) {
			console.error('Profile update failed.', err);
			error = messageOf(err, 'Unable to save profile.');
		}
	}

	async function savePassword() {
		error = '';
		saved = false;

		if (newPassword.length < 8) {
			error = 'New password must be at least 8 characters.';
			return;
		}
		if (newPassword !== confirmPassword) {
			error = 'New passwords do not match.';
			return;
		}

		try {
			await session.changePassword(currentPassword, newPassword);
			saved = true;
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		} catch (err) {
			console.error('Password change failed.', err);
			error = messageOf(err, 'Unable to change password.');
		}
	}
</script>

<svelte:head>
	<title>Edit Profile | YADA Courier</title>
</svelte:head>

<SettingsSubpage title="Edit Profile">
	{#if !ready}
		<p class="text-sm text-ink-secondary">Loading profile…</p>
	{:else}
		<div class="mb-4">
			<Tabs tabs={editTabs} bind:active={activeTab} />
		</div>

		{#if activeTab === 'profile'}
			<form
				class="flex flex-1 flex-col gap-4"
				onsubmit={(e) => {
					e.preventDefault();
					void saveProfile();
				}}
			>
				<!-- Its own card because it saves on its own, the moment a file is
				     chosen — the button below covers the fields, not this. -->
				<div class="rounded-lg bg-surface p-4 shadow-sm">
					<div class="flex items-center gap-4">
						<Avatar
							initials={avatarInitials}
							src={session.user?.image ?? null}
							alt=""
							size={72}
						/>

						<div class="flex min-w-0 flex-col gap-2">
							<span class="text-sm font-semibold text-ink">Profile photo</span>
							<div class="flex flex-wrap items-center gap-2">
								<label
									class="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-wash"
								>
									<input
										type="file"
										accept="image/*"
										class="sr-only"
										disabled={photoBusy}
										onchange={handlePhoto}
									/>
									<IconCamera class="h-4 w-4" aria-hidden="true" />
									{photoBusy ? 'Saving…' : session.user?.image ? 'Change' : 'Add a photo'}
								</label>

								{#if session.user?.image}
									<Button variant="outline" size="sm" disabled={photoBusy} onclick={removePhoto}>
										Remove
									</Button>
								{/if}
							</div>
						</div>
					</div>

					{#if photoError}
						<p class="mt-3 text-xs font-medium text-danger">{photoError}</p>
					{/if}
				</div>

				<div class="space-y-3 rounded-lg bg-surface p-4 shadow-sm">
					<Input label="Full name" type="text" placeholder="Your name" bind:value={name} />
					<Input
						label="Phone number"
						type="tel"
						placeholder="024 123 4567"
						autocomplete="tel"
						inputmode="tel"
						format={maskPhone}
						bind:value={phone}
					/>
					<Input label="Email" type="email" bind:value={email} disabled />
					<p class="text-xs text-ink-tertiary">
						Email can’t be changed here. Contact support if you need to update it.
					</p>
					<Input
						label="Number plate"
						type="text"
						placeholder="GT 4521-20"
						autocapitalize="characters"
						maxlength={16}
						format={maskPlate}
						bind:value={plate}
					/>
					<p class="text-xs text-ink-tertiary">
						Businesses see this while they wait, so they know which bike is yours.
					</p>
				</div>

				{#if error && activeTab === 'profile'}
					<Alert>{error}</Alert>
				{/if}
				{#if saved && activeTab === 'profile'}
					<Alert variant="success">Profile saved.</Alert>
				{/if}

				<div class="mt-auto pt-2">
					<Button
						type="submit"
						variant="primary"
						fullWidth
						disabled={!canSaveProfile || session.isLoading}
					>
						{session.isLoading ? 'Saving…' : 'Save changes'}
					</Button>
				</div>
			</form>
		{:else}
			<form
				class="flex flex-1 flex-col gap-4"
				onsubmit={(e) => {
					e.preventDefault();
					void savePassword();
				}}
			>
				<div class="space-y-3 rounded-lg bg-surface p-4 shadow-sm">
					<Input
						label="Current password"
						type="password"
						placeholder="Enter current password"
						bind:value={currentPassword}
					/>
					<Input
						label="New password"
						type="password"
						placeholder="At least 8 characters"
						bind:value={newPassword}
					/>
					<Input
						label="Confirm new password"
						type="password"
						placeholder="Re-enter new password"
						bind:value={confirmPassword}
					/>
				</div>

				{#if error && activeTab === 'password'}
					<Alert>{error}</Alert>
				{/if}
				{#if saved && activeTab === 'password'}
					<Alert variant="success">Password updated.</Alert>
				{/if}

				<div class="mt-auto pt-2">
					<Button type="submit" variant="primary" fullWidth disabled={!canSavePassword || session.isLoading}>
						{session.isLoading ? 'Updating…' : 'Update password'}
					</Button>
				</div>
			</form>
		{/if}
	{/if}
</SettingsSubpage>
