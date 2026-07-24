<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import SettingsSubpage from '$lib/components/courier/SettingsSubpage.svelte';
	import { auth } from '$lib/stores/auth';

	let name = '';
	let phone = '';
	let email = '';
	let error = '';
	let saved = false;
	let ready = false;

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

	$: canSave =
		ready &&
		name.trim().length > 0 &&
		(name.trim() !== ($auth.user?.name ?? '') || phone.trim() !== ($auth.user?.phone ?? ''));

	async function save() {
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
</script>

<svelte:head>
	<title>Edit Profile | YADA Courier</title>
</svelte:head>

<SettingsSubpage title="Edit Profile" backHref="/courier/profile">
	{#if !ready}
		<p class="text-sm text-ink-secondary">Loading profile…</p>
	{:else}
		<form
			class="flex flex-1 flex-col gap-4"
			on:submit|preventDefault={save}
		>
			<div class="space-y-3 rounded-2xl bg-surface p-4 shadow-sm">
				<Input label="Full name" type="text" placeholder="Your name" bind:value={name} />
				<Input label="Phone number" type="tel" placeholder="024 000 0000" bind:value={phone} />
				<Input label="Email" type="email" bind:value={email} disabled />
				<p class="text-xs text-ink-tertiary">Email can’t be changed here. Contact support if you need to update it.</p>
			</div>

			{#if error}
				<p class="text-sm font-medium text-danger">{error}</p>
			{/if}
			{#if saved}
				<p class="text-sm font-medium text-success">Profile saved.</p>
			{/if}

			<div class="mt-auto pt-2">
				<Button
					type="submit"
					variant="primary"
					fullWidth
					disabled={!canSave || $auth.isLoading}
				>
					{$auth.isLoading ? 'Saving…' : 'Save changes'}
				</Button>
			</div>
		</form>
	{/if}
</SettingsSubpage>
