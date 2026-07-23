<script lang="ts">
	import { goto } from '$app/navigation';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	let fullName = '';
	let phone = '';
	let email = '';
	let password = '';

	$: canContinue =
		fullName.trim().length > 1 &&
		phone.trim().length > 6 &&
		email.trim().includes('@') &&
		password.trim().length >= 6;

	function continueAuth() {
		if (!canContinue) return;
		goto('/courier/home');
	}
</script>

<svelte:head>
	<title>Courier sign in | YADA</title>
</svelte:head>

<div class="flex flex-1 flex-col bg-bg px-6 py-8">
	<div class="mb-6">
		<BrandLogo href="/courier/auth" size="md" />
		<p class="mt-3 text-base text-ink-secondary">Sign in to start delivering</p>
	</div>

	<form class="flex flex-1 flex-col gap-4" on:submit|preventDefault={continueAuth}>
		<Input label="Full name" placeholder="Kwame Asante" bind:value={fullName} />
		<Input label="Phone number" type="tel" placeholder="(555) 000-0000" bind:value={phone} />
		<Input label="Email" type="email" placeholder="rider@email.com" bind:value={email} />
		<Input
			label="Password"
			type="password"
			placeholder="At least 6 characters"
			bind:value={password}
		/>

		<div class="mt-auto flex flex-col gap-3 pt-4">
			<Button variant="primary" size="lg" fullWidth type="submit" disabled={!canContinue}>
				Continue
			</Button>
			<p class="text-center text-xs text-ink-tertiary">
				Bike deliveries only. By continuing you agree to locate and track trips for Favorie.
			</p>
		</div>
	</form>
</div>
