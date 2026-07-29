<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import SettingsSubpage from '$lib/components/courier/SettingsSubpage.svelte';
	import { auth } from '$lib/stores/auth';

	const editTabs = [
		{ value: 'profile', label: 'Profile' },
		{ value: 'password', label: 'Password' }
	];

	let activeTab = 'profile';
	let name = '';
	let phone = '';
	let email = '';
	let currentPassword = '';
	let newPassword = '';
	let confirmPassword = '';
	let error = '';
	let saved = false;
	let ready = false;
	let passwordSaving = false;

	onMount(async () => {
		if (!$auth.user) {
			await auth.syncSession();
		}
		const user = $auth.user;
		name = user?.name ?? '';
		phone = user?.phone ?? '';
		email = user?.email ?? '';
		ready = true;
	});

	$: canSaveProfile =
		ready &&
		name.trim().length > 0 &&
		(name.trim() !== ($auth.user?.name ?? '') || phone.trim() !== ($auth.user?.phone ?? ''));

	$: canSavePassword =
		currentPassword.length > 0 &&
		newPassword.length >= 8 &&
		newPassword === confirmPassword;

	async function saveProfile() {
		error = '';
		saved = false;
		if (!name.trim()) {
			error = 'Name is required.';
			return;
		}

		try {
			await auth.updateProfile({ name: name.trim(), phone: phone.trim() });
			saved = true;
			setTimeout(() => {
				goto('/courier/profile');
			}, 600);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unable to save profile.';
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

		passwordSaving = true;
		try {
			await auth.changePassword(currentPassword, newPassword);
			saved = true;
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unable to change password.';
		} finally {
			passwordSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Edit Profile | YADA Courier</title>
</svelte:head>

<SettingsSubpage title="Edit Profile" backHref="/courier/profile">
	{#if !ready}
		<p class="text-sm text-ink-secondary">Loading profile…</p>
	{:else}
		<div class="mb-4">
			<Tabs tabs={editTabs} bind:active={activeTab} />
		</div>

		{#if activeTab === 'profile'}
			<form class="flex flex-1 flex-col gap-4" on:submit|preventDefault={saveProfile}>
				<div class="space-y-3 rounded-2xl bg-surface p-4 shadow-sm">
					<Input label="Full name" type="text" placeholder="Your name" bind:value={name} />
					<Input label="Phone number" type="tel" placeholder="024 000 0000" bind:value={phone} />
					<Input label="Email" type="email" bind:value={email} disabled />
					<p class="text-xs text-ink-tertiary">
						Email can’t be changed here. Contact support if you need to update it.
					</p>
				</div>

				{#if error && activeTab === 'profile'}
					<p class="text-sm font-medium text-danger">{error}</p>
				{/if}
				{#if saved && activeTab === 'profile'}
					<p class="text-sm font-medium text-success">Profile saved.</p>
				{/if}

				<div class="mt-auto pt-2">
					<Button
						type="submit"
						variant="primary"
						fullWidth
						disabled={!canSaveProfile || $auth.isLoading}
					>
						{$auth.isLoading ? 'Saving…' : 'Save changes'}
					</Button>
				</div>
			</form>
		{:else}
			<form class="flex flex-1 flex-col gap-4" on:submit|preventDefault={savePassword}>
				<div class="space-y-3 rounded-2xl bg-surface p-4 shadow-sm">
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
					<p class="text-sm font-medium text-danger">{error}</p>
				{/if}
				{#if saved && activeTab === 'password'}
					<p class="text-sm font-medium text-success">Password updated.</p>
				{/if}

				<div class="mt-auto pt-2">
					<Button type="submit" variant="primary" fullWidth disabled={!canSavePassword || passwordSaving}>
						{passwordSaving ? 'Updating…' : 'Update password'}
					</Button>
				</div>
			</form>
		{/if}
	{/if}
</SettingsSubpage>
